import { EntityDeployer, DeployResult } from './index';
import { ParsedRow } from '../import-engine';
import { DatabaseProvider } from '../../../../database/database.provider';
import * as schema from '../../../../database/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, ilike } from 'drizzle-orm';

function mapField(
  data: Record<string, string>,
  mapping: Record<string, string>,
  field: string,
): string | undefined {
  const src = Object.entries(mapping).find(([, v]) => v === field)?.[0];
  return src ? data[src] : undefined;
}

export class StudentDeployer implements EntityDeployer {
  entityType = 'students';

  async deploy(
    _batchId: string,
    rows: ParsedRow[],
    columnMapping: Record<string, string>,
    db: DatabaseProvider,
    tenantId: string,
    branchId?: string,
  ): Promise<DeployResult> {
    let inserted = 0;
    let failed = 0;
    const errors: { row: number; error: string }[] = [];

    for (const row of rows) {
      try {
        const fn = mapField(row.data, columnMapping, 'firstName') || '';
        const ln = mapField(row.data, columnMapping, 'lastName') || '';

        const [existing] = await db.db
          .select({ id: schema.students.id })
          .from(schema.students)
          .where(
            and(
              eq(schema.students.tenantId, tenantId),
              eq(schema.students.firstName, fn),
              eq(schema.students.lastName, ln),
            ),
          )
          .limit(1);

        if (existing) {
          errors.push({
            row: row.rowNumber,
            error: `Student ${fn} ${ln} already exists`,
          });
          failed++;
          continue;
        }

        const [yearRows] = await db.db
          .select({ id: schema.academicYears.id })
          .from(schema.academicYears)
          .where(
            and(
              eq(schema.academicYears.tenantId, tenantId),
              eq(schema.academicYears.isCurrent, true),
            ),
          )
          .limit(1);

        await db.db.insert(schema.students).values({
          tenantId,
          branchId: branchId || tenantId,
          admissionNumber: `IMP-${Date.now()}-${String(inserted + 1).padStart(3, '0')}`,
          firstName: fn,
          lastName: ln,
          dateOfBirth: mapField(row.data, columnMapping, 'dateOfBirth'),
          gender: mapField(row.data, columnMapping, 'gender'),
          bloodGroup: mapField(row.data, columnMapping, 'bloodGroup'),
          phone: mapField(row.data, columnMapping, 'phone'),
          email: mapField(row.data, columnMapping, 'email'),
          address: mapField(row.data, columnMapping, 'address'),
          city: mapField(row.data, columnMapping, 'city'),
          state: mapField(row.data, columnMapping, 'state'),
          pincode: mapField(row.data, columnMapping, 'pincode'),
          nationality:
            mapField(row.data, columnMapping, 'nationality') || 'Indian',
          religion: mapField(row.data, columnMapping, 'religion'),
          caste: mapField(row.data, columnMapping, 'caste'),
          category: mapField(row.data, columnMapping, 'category'),
        });
        inserted++;
      } catch (err: any) {
        errors.push({
          row: row.rowNumber,
          error: err.message || 'Unknown error',
        });
        failed++;
      }
    }

    return { success: failed === 0, inserted, failed, errors };
  }
}
