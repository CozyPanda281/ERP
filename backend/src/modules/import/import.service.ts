import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import { ImportEngine, ParsedRow } from './lib/import-engine';
import { getValidator, listEntityTypes } from './lib/validators';
import { getDeployer } from './lib/deployers';
import * as schema from '../../database/schema';
import { eq, and, isNull, desc, count, sql, inArray } from 'drizzle-orm';

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);
  private readonly engine = new ImportEngine();

  constructor(private readonly db: DatabaseProvider) {}

  getSupportedEntityTypes() {
    return listEntityTypes();
  }

  async upload(
    tenantId: string,
    userId: string,
    entityType: string,
    buffer: Buffer,
    fileName: string,
    branchId?: string,
    fileType?: string,
  ) {
    const validator = getValidator(entityType);

    let parseResult: { rows: ParsedRow[]; headers: string[]; totalRows: number; fileType: string };
    try {
      parseResult = this.engine.parse(buffer, fileName, fileType);
    } catch (err: any) {
      throw new BadRequestException(`File parse error: ${err.message}`);
    }

    if (parseResult.totalRows === 0) {
      throw new BadRequestException('File is empty');
    }

    const columnMapping = validator.autoMapHeaders(parseResult.headers);

    let validCount = 0;
    let errorCount = 0;
    const validatedRows: any[] = [];

    for (const row of parseResult.rows) {
      const result = await validator.validate(row, tenantId, branchId);
      if (result.valid) validCount++;
      else errorCount++;
      validatedRows.push({ rowNumber: row.rowNumber, data: row.data, errors: result.errors, valid: result.valid });
    }

    const previewData = validatedRows.slice(0, 50);

    const [batch] = await this.db.db.insert(schema.importBatches).values({
      tenantId,
      branchId: branchId || null,
      entityType,
      fileName,
      fileType: parseResult.fileType,
      originalFileName: fileName,
      totalRows: parseResult.totalRows,
      validRows: validCount,
      errorRows: errorCount,
      status: 'pending_review',
      previewData: previewData as any,
      columnMapping: columnMapping as any,
      validationErrors: validatedRows.filter((r: any) => !r.valid).map((r: any) => ({ row: r.rowNumber, errors: r.errors })) as any,
      createdBy: userId,
    }).returning({ id: schema.importBatches.id });

    return this.getBatch(batch.id, tenantId);
  }

  async getBatch(id: string, tenantId?: string) {
    const conditions: any[] = [eq(schema.importBatches.id, id)];
    if (tenantId) conditions.push(eq(schema.importBatches.tenantId, tenantId));

    const [result] = await this.db.db.select().from(schema.importBatches).where(and(...conditions)).limit(1);
    if (!result) throw new NotFoundException('Import batch not found');
    return result;
  }

  async listBatches(tenantId: string, entityType?: string, status?: string, page = 1, limit = 20) {
    const conditions: any[] = [eq(schema.importBatches.tenantId, tenantId)];
    if (entityType) conditions.push(eq(schema.importBatches.entityType, entityType));
    if (status) conditions.push(eq(schema.importBatches.status, status));

    const offset = (page - 1) * limit;
    const data = await this.db.db.select().from(schema.importBatches)
      .where(and(...conditions)).orderBy(desc(schema.importBatches.createdAt)).limit(limit).offset(offset);
    const [total] = await this.db.db.select({ count: count() }).from(schema.importBatches).where(and(...conditions));

    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async updatePreview(id: string, rows: { rowNumber: number; data: Record<string, string> }[]) {
    const batch = await this.getBatch(id);
    if (batch.status !== 'pending_review') throw new BadRequestException('Batch is not in review state');

    const preview = (batch.previewData as any[]) || [];
    for (const update of rows) {
      const existing = preview.find((p: any) => p.rowNumber === update.rowNumber);
      if (existing) existing.data = update.data;
    }

    await this.db.db.update(schema.importBatches)
      .set({ previewData: preview as any, updatedAt: new Date() })
      .where(eq(schema.importBatches.id, id));

    return this.getBatch(id);
  }

  async approve(id: string, reviewerId: string, notes?: string) {
    const batch = await this.getBatch(id);
    if (batch.status !== 'pending_review') throw new BadRequestException('Batch is not in review state');

    await this.db.db.update(schema.importBatches).set({
      status: 'approved',
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      reviewNotes: notes || null,
      updatedAt: new Date(),
    }).where(eq(schema.importBatches.id, id));

    return this.getBatch(id);
  }

  async reject(id: string, reviewerId: string, reason: string) {
    const batch = await this.getBatch(id);
    if (batch.status !== 'pending_review') throw new BadRequestException('Batch is not in review state');

    await this.db.db.update(schema.importBatches).set({
      status: 'rejected',
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      rejectionReason: reason,
      updatedAt: new Date(),
    }).where(eq(schema.importBatches.id, id));

    return this.getBatch(id);
  }

  async deploy(id: string, userId: string) {
    const batch = await this.getBatch(id);
    if (batch.status !== 'approved') throw new BadRequestException('Batch must be approved before deployment');

    const deployer = getDeployer(batch.entityType);
    const allRows: ParsedRow[] = ((batch.previewData as any[]) || []).filter(r => r.valid !== false).map(r => ({
      rowNumber: r.rowNumber,
      data: r.data,
      errors: [],
    }));

    const result = await deployer.deploy(
      id, allRows, batch.columnMapping as Record<string, string>,
      this.db, batch.tenantId, batch.branchId || undefined,
    );

    const newStatus = result.success ? 'deployed' : 'deployed_with_errors';

    await this.db.db.update(schema.importBatches).set({
      status: newStatus,
      deployedAt: new Date(),
      deployedBy: userId,
      rollbackData: allRows as any,
      validationErrors: result.errors as any,
      updatedAt: new Date(),
    }).where(eq(schema.importBatches.id, id));

    this.logger.log(`Import batch ${id} deployed: ${result.inserted} inserted, ${result.failed} failed`);

    return { batch: await this.getBatch(id), result };
  }

  async rollback(id: string, userId: string) {
    const batch = await this.getBatch(id);
    if (!['deployed', 'deployed_with_errors'].includes(batch.status || '')) {
      throw new BadRequestException('Only deployed batches can be rolled back');
    }

    const rollbackData = batch.rollbackData as any[] || [];
    let removed = 0;

    for (const row of rollbackData) {
      try {
        const data = row.data || {};
        const fn = data.firstName || data.first_name || '';
        const ln = data.lastName || data.last_name || '';

        if (fn && ln) {
          const [toDelete] = await this.db.db.select({ id: schema.students.id })
            .from(schema.students)
            .where(and(eq(schema.students.firstName, fn), eq(schema.students.lastName, ln)))
            .limit(1);
          if (toDelete) {
            await this.db.db.delete(schema.students).where(eq(schema.students.id, toDelete.id));
            removed++;
          }
        }
      } catch { /* best effort rollback */ }
    }

    await this.db.db.update(schema.importBatches).set({
      status: 'rolled_back',
      updatedAt: new Date(),
    }).where(eq(schema.importBatches.id, id));

    this.logger.warn(`Import batch ${id} rolled back by ${userId}: ${removed} records removed`);

    return { message: `Rolled back ${removed} records`, batch: await this.getBatch(id) };
  }
}
