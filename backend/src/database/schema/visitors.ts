import { pgTable, uuid, varchar, text, boolean, timestamp, date, numeric, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { branches } from './branches';

export const visitors = pgTable('visitors', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  idProofType: varchar('id_proof_type', { length: 100 }),
  idProofNumber: varchar('id_proof_number', { length: 100 }),
  purpose: text('purpose').notNull(),
  personToMeet: varchar('person_to_meet', { length: 255 }),
  department: varchar('department', { length: 100 }),
  checkInTime: timestamp('check_in_time', { withTimezone: true }).notNull(),
  checkOutTime: timestamp('check_out_time', { withTimezone: true }),
  vehicleNumber: varchar('vehicle_number', { length: 50 }),
  badgeNumber: varchar('badge_number', { length: 50 }),
  temperature: numeric('temperature', { precision: 4, scale: 1 }),
  isPreApproved: boolean('is_pre_approved').default(false),
  status: varchar('status', { length: 50 }).default('checked_in'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  branchIdx: index('idx_visitors_branch').on(table.branchId),
  statusIdx: index('idx_visitors_status').on(table.status),
  dateIdx: index('idx_visitors_date').on(table.checkInTime),
}));
