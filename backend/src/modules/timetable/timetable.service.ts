import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DatabaseProvider } from '../../database/database.provider';
import * as schema from '../../database/schema';
import { eq, and, isNull, or, desc, asc, count, sql, inArray } from 'drizzle-orm';

@Injectable()
export class TimetableService {
  constructor(private readonly db: DatabaseProvider) {}

  async create(params: {
    tenantId: string; branchId: string; name: string; classId: string;
    sectionId?: string; academicYearId?: string; validFrom?: string; validUntil?: string;
  }) {
    const [existing] = await this.db.db.select({ id: schema.timetables.id })
      .from(schema.timetables)
      .where(and(eq(schema.timetables.branchId, params.branchId), eq(schema.timetables.name, params.name)))
      .limit(1);
    if (existing) throw new ConflictException('Timetable with this name already exists');

    const [inserted] = await this.db.db.insert(schema.timetables).values({
      tenantId: params.tenantId, branchId: params.branchId, name: params.name,
      classId: params.classId, sectionId: params.sectionId,
      academicYearId: params.academicYearId, validFrom: params.validFrom, validUntil: params.validUntil,
    }).returning({ id: schema.timetables.id });

    return this.findById(inserted.id);
  }

  async findById(id: string, branchId?: string) {
    const conditions: any[] = [eq(schema.timetables.id, id)];
    if (branchId) conditions.push(eq(schema.timetables.branchId, branchId));

    const [result] = await this.db.db.select().from(schema.timetables).where(and(...conditions)).limit(1);
    if (!result) throw new NotFoundException('Timetable not found');

    const entries = await this.db.db.select({
      id: schema.timetableEntries.id, dayOfWeek: schema.timetableEntries.dayOfWeek,
      subjectId: schema.timetableEntries.subjectId, teacherId: schema.timetableEntries.teacherId,
      startTime: schema.timetableEntries.startTime, endTime: schema.timetableEntries.endTime,
      roomNumber: schema.timetableEntries.roomNumber, isBreak: schema.timetableEntries.isBreak,
    }).from(schema.timetableEntries)
      .where(eq(schema.timetableEntries.timetableId, id))
      .orderBy(schema.timetableEntries.dayOfWeek, schema.timetableEntries.startTime);

    return { ...result, entries };
  }

  async findByBranch(branchId: string, query: { page?: number; limit?: number; classId?: string; isActive?: string }) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const offset = (page - 1) * limit;
    const conditions: any[] = [eq(schema.timetables.branchId, branchId)];

    if (query.classId) conditions.push(eq(schema.timetables.classId, query.classId));
    if (query.isActive !== undefined) conditions.push(eq(schema.timetables.isActive, query.isActive === 'true'));

    const data = await this.db.db.select().from(schema.timetables)
      .where(and(...conditions)).orderBy(desc(schema.timetables.createdAt)).limit(limit).offset(offset);
    const [total] = await this.db.db.select({ count: count() }).from(schema.timetables).where(and(...conditions));

    return { data, pagination: { page, limit, total: Number(total.count) } };
  }

  async update(id: string, params: any) {
    await this.findById(id);
    const allowed: any = { updatedAt: new Date() };
    if (params.name !== undefined) allowed.name = params.name;
    if (params.classId !== undefined) allowed.classId = params.classId;
    if (params.sectionId !== undefined) allowed.sectionId = params.sectionId;
    if (params.academicYearId !== undefined) allowed.academicYearId = params.academicYearId;
    if (params.validFrom !== undefined) allowed.validFrom = params.validFrom;
    if (params.validUntil !== undefined) allowed.validUntil = params.validUntil;
    if (params.isActive !== undefined) allowed.isActive = params.isActive;
    await this.db.db.update(schema.timetables).set(allowed).where(eq(schema.timetables.id, id));
    return this.findById(id);
  }

  async softDelete(id: string) {
    await this.findById(id);
    await this.db.db.delete(schema.timetables).where(eq(schema.timetables.id, id));
  }

  async setActive(id: string) {
    const timetable = await this.findById(id);

    await this.db.db.update(schema.timetables).set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(schema.timetables.branchId, timetable.branchId), eq(schema.timetables.classId, timetable.classId)));

    await this.db.db.update(schema.timetables).set({ isActive: true, updatedAt: new Date() }).where(eq(schema.timetables.id, id));

    return this.findById(id);
  }

  private async checkOverlap(timetableId: string, dayOfWeek: number, startTime: string, endTime: string, teacherId?: string, excludeEntryId?: string) {
    const timetable = await this.findById(timetableId);
    const conditions: any[] = [
      eq(schema.timetableEntries.timetableId, timetableId),
      eq(schema.timetableEntries.dayOfWeek, dayOfWeek),
      sql`${schema.timetableEntries.startTime} < ${endTime}::time`,
      sql`${schema.timetableEntries.endTime} > ${startTime}::time`,
    ];
    if (excludeEntryId) conditions.push(sql`${schema.timetableEntries.id} != ${excludeEntryId}`);

    const overlapping = await this.db.db.select({ id: schema.timetableEntries.id })
      .from(schema.timetableEntries).where(and(...conditions)).limit(1);

    if (overlapping.length) throw new ConflictException('Time slot overlaps with an existing entry');
  }

  async addEntry(timetableId: string, params: {
    dayOfWeek: number; subjectId: string; teacherId?: string;
    startTime: string; endTime: string; roomNumber?: string; isBreak?: boolean;
  }) {
    const [timetable] = await this.db.db.select({ id: schema.timetables.id, tenantId: schema.timetables.tenantId })
      .from(schema.timetables).where(eq(schema.timetables.id, timetableId)).limit(1);
    if (!timetable) throw new NotFoundException('Timetable not found');

    const overlapping = await this.db.db.select({ id: schema.timetableEntries.id })
      .from(schema.timetableEntries)
      .where(and(
        eq(schema.timetableEntries.timetableId, timetableId),
        eq(schema.timetableEntries.dayOfWeek, params.dayOfWeek),
        sql`${schema.timetableEntries.startTime} < ${params.endTime}::time`,
        sql`${schema.timetableEntries.endTime} > ${params.startTime}::time`,
      )).limit(1);

    if (overlapping.length) throw new ConflictException('Time slot overlaps with an existing entry');

    const [inserted] = await this.db.db.insert(schema.timetableEntries).values({
      tenantId: timetable.tenantId, timetableId, ...params,
    }).returning({ id: schema.timetableEntries.id });

    return inserted;
  }

  async updateEntry(id: string, params: any) {
    const [existing] = await this.db.db.select().from(schema.timetableEntries).where(eq(schema.timetableEntries.id, id)).limit(1);
    if (!existing) throw new NotFoundException('Timetable entry not found');

    const dayOfWeek = params.dayOfWeek ?? existing.dayOfWeek;
    const startTime = params.startTime ?? existing.startTime;
    const endTime = params.endTime ?? existing.endTime;

    const overlapping = await this.db.db.select({ id: schema.timetableEntries.id })
      .from(schema.timetableEntries)
      .where(and(
        eq(schema.timetableEntries.timetableId, existing.timetableId),
        eq(schema.timetableEntries.dayOfWeek, dayOfWeek),
        sql`${schema.timetableEntries.startTime} < ${endTime}::time`,
        sql`${schema.timetableEntries.endTime} > ${startTime}::time`,
        sql`${schema.timetableEntries.id} != ${id}`,
      )).limit(1);

    if (overlapping.length) throw new ConflictException('Time slot overlaps with an existing entry');

    const allowedEntry: any = { updatedAt: new Date() };
    if (params.subjectId !== undefined) allowedEntry.subjectId = params.subjectId;
    if (params.teacherId !== undefined) allowedEntry.teacherId = params.teacherId;
    if (params.startTime !== undefined) allowedEntry.startTime = params.startTime;
    if (params.endTime !== undefined) allowedEntry.endTime = params.endTime;
    if (params.roomNumber !== undefined) allowedEntry.roomNumber = params.roomNumber;
    if (params.isBreak !== undefined) allowedEntry.isBreak = params.isBreak;
    await this.db.db.update(schema.timetableEntries).set(allowedEntry).where(eq(schema.timetableEntries.id, id));

    return this.db.db.select().from(schema.timetableEntries).where(eq(schema.timetableEntries.id, id)).limit(1).then(r => r[0]);
  }

  async removeEntry(id: string) {
    const [existing] = await this.db.db.select({ id: schema.timetableEntries.id }).from(schema.timetableEntries).where(eq(schema.timetableEntries.id, id)).limit(1);
    if (!existing) throw new NotFoundException('Timetable entry not found');
    await this.db.db.delete(schema.timetableEntries).where(eq(schema.timetableEntries.id, id));
  }

  async batchUpdateEntries(timetableId: string, dayOfWeek: number, entries: Array<{
    subjectId: string; teacherId?: string; startTime: string; endTime: string; roomNumber?: string; isBreak?: boolean;
  }>) {
    const [timetable] = await this.db.db.select({ id: schema.timetables.id, tenantId: schema.timetables.tenantId })
      .from(schema.timetables).where(eq(schema.timetables.id, timetableId)).limit(1);
    if (!timetable) throw new NotFoundException('Timetable not found');

    await this.db.db.transaction(async (tx) => {
      await tx.delete(schema.timetableEntries)
        .where(and(eq(schema.timetableEntries.timetableId, timetableId), eq(schema.timetableEntries.dayOfWeek, dayOfWeek)));

      for (const entry of entries) {
        await tx.insert(schema.timetableEntries).values({
          tenantId: timetable.tenantId, timetableId, dayOfWeek, ...entry,
        });
      }
    });

    return this.getDayEntries(timetableId, dayOfWeek);
  }

  async getDayEntries(timetableId: string, dayOfWeek: number) {
    return this.db.db.select({
      id: schema.timetableEntries.id, subjectId: schema.timetableEntries.subjectId,
      teacherId: schema.timetableEntries.teacherId, startTime: schema.timetableEntries.startTime,
      endTime: schema.timetableEntries.endTime, roomNumber: schema.timetableEntries.roomNumber,
      isBreak: schema.timetableEntries.isBreak,
    }).from(schema.timetableEntries)
      .where(and(eq(schema.timetableEntries.timetableId, timetableId), eq(schema.timetableEntries.dayOfWeek, dayOfWeek)))
      .orderBy(schema.timetableEntries.startTime);
  }

  async findByTeacher(teacherId: string, branchId: string) {
    const entries = await this.db.db.select({
      id: schema.timetableEntries.id, timetableId: schema.timetableEntries.timetableId,
      dayOfWeek: schema.timetableEntries.dayOfWeek,
      startTime: schema.timetableEntries.startTime, endTime: schema.timetableEntries.endTime,
      roomNumber: schema.timetableEntries.roomNumber,
      timetableName: schema.timetables.name, className: schema.classes.name,
      subjectName: schema.subjects.name,
    }).from(schema.timetableEntries)
      .innerJoin(schema.timetables, eq(schema.timetables.id, schema.timetableEntries.timetableId))
      .innerJoin(schema.classes, eq(schema.classes.id, schema.timetables.classId))
      .innerJoin(schema.subjects, eq(schema.subjects.id, schema.timetableEntries.subjectId))
      .where(and(eq(schema.timetableEntries.teacherId, teacherId), eq(schema.timetables.branchId, branchId)))
      .orderBy(schema.timetableEntries.dayOfWeek, schema.timetableEntries.startTime);

    return entries;
  }
}
