import { pgTable, uuid, varchar, text, integer, boolean, jsonb, timestamp, date, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const branches = pgTable('branches', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  pincode: varchar('pincode', { length: 10 }),
  principalId: uuid('principal_id'),
  status: varchar('status', { length: 20 }).default('active'),
  establishedDate: date('established_date'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  tenantCodeUnique: uniqueIndex('branches_tenant_id_code_key').on(table.tenantId, table.code),
  tenantIdx: index('idx_branches_tenant').on(table.tenantId),
  principalIdx: index('idx_branches_principal').on(table.principalId),
}));


