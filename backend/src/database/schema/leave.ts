import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  date,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { branches } from './branches';
import { staff } from './staff';

export const leaveTypes = pgTable(
  'leave_types',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    daysAllowed: integer('days_allowed').notNull(),
    isPaid: boolean('is_paid').default(true),
    carryForward: boolean('carry_forward').default(false),
    maxCarryForward: integer('max_carry_forward').default(0),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    tenantCodeUnique: uniqueIndex('leave_types_tenant_id_code_key').on(
      table.tenantId,
      table.code,
    ),
  }),
);

export const leaveRequests = pgTable(
  'leave_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    staffId: uuid('staff_id')
      .notNull()
      .references(() => staff.id, { onDelete: 'cascade' }),
    leaveTypeId: uuid('leave_type_id')
      .notNull()
      .references(() => leaveTypes.id),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    totalDays: integer('total_days').notNull(),
    reason: text('reason'),
    status: varchar('status', { length: 20 }).default('pending'),
    approvedBy: uuid('approved_by'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    rejectReason: text('reject_reason'),
    documentUrl: text('document_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    staffIdx: index('idx_leave_requests_staff').on(table.staffId),
    statusIdx: index('idx_leave_requests_status').on(table.status),
    datesIdx: index('idx_leave_requests_dates').on(
      table.startDate,
      table.endDate,
    ),
  }),
);

export const leaveTypesRelations = relations(leaveTypes, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [leaveTypes.tenantId],
    references: [tenants.id],
  }),
  leaveRequests: many(leaveRequests),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  tenant: one(tenants, {
    fields: [leaveRequests.tenantId],
    references: [tenants.id],
  }),
  branch: one(branches, {
    fields: [leaveRequests.branchId],
    references: [branches.id],
  }),
  staff: one(staff, {
    fields: [leaveRequests.staffId],
    references: [staff.id],
  }),
  leaveType: one(leaveTypes, {
    fields: [leaveRequests.leaveTypeId],
    references: [leaveTypes.id],
  }),
}));
