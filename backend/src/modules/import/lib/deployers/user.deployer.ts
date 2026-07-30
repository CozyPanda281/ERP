import { EntityDeployer, DeployResult } from './index';
import { ParsedRow } from '../import-engine';
import { DatabaseProvider } from '../../../../database/database.provider';
import * as schema from '../../../../database/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

function mapField(data: Record<string, string>, mapping: Record<string, string>, field: string): string | undefined {
  const src = Object.entries(mapping).find(([, v]) => v === field)?.[0];
  return src ? data[src] : undefined;
}

export class UserDeployer implements EntityDeployer {
  entityType = 'users';

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
        const email = mapField(row.data, columnMapping, 'email');
        if (!email) { failed++; errors.push({ row: row.rowNumber, error: 'Email is required' }); continue; }

        const [existing] = await db.db.select({ id: schema.users.id })
          .from(schema.users)
          .where(and(eq(schema.users.tenantId, tenantId), eq(schema.users.email, email)))
          .limit(1);

        if (existing) {
          errors.push({ row: row.rowNumber, error: `User with email ${email} already exists` });
          failed++;
          continue;
        }

        const password = mapField(row.data, columnMapping, 'password') || 'Welcome@123';
        const passwordHash = await bcrypt.hash(password, 12);

        await db.db.insert(schema.users).values({
          tenantId,
          email,
          passwordHash,
          firstName: mapField(row.data, columnMapping, 'firstName') || '',
          lastName: mapField(row.data, columnMapping, 'lastName') || '',
          phone: mapField(row.data, columnMapping, 'phone'),
        });

        inserted++;
      } catch (err: any) {
        errors.push({ row: row.rowNumber, error: err.message || 'Unknown error' });
        failed++;
      }
    }

    return { success: failed === 0, inserted, failed, errors };
  }
}
