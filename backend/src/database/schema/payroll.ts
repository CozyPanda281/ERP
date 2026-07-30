import { pgTable, uuid, varchar, text, integer, boolean, jsonb, timestamp, date, numeric, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { branches } from './branches';
import { staff } from './staff';

export const payrollSalaryComponents = pgTable('payroll_salary_components', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  calculationType: varchar('calculation_type', { length: 50 }).default('fixed'),
  value: numeric('value', { precision: 10, scale: 2 }).default('0'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const payroll = pgTable('payroll', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  staffId: uuid('staff_id').notNull().references(() => staff.id, { onDelete: 'cascade' }),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  basicPay: numeric('basic_pay', { precision: 10, scale: 2 }).default('0'),
  allowances: jsonb('allowances').default([]),
  deductions: jsonb('deductions').default([]),
  grossPay: numeric('gross_pay', { precision: 10, scale: 2 }).default('0'),
  totalDeductions: numeric('total_deductions', { precision: 10, scale: 2 }).default('0'),
  netPay: numeric('net_pay', { precision: 10, scale: 2 }).default('0'),
  paymentDate: date('payment_date'),
  paymentMethod: varchar('payment_method', { length: 20 }),
  transactionRef: varchar('transaction_ref', { length: 100 }),
  status: varchar('status', { length: 50 }).default('draft'),
  remarks: text('remarks'),
  processedBy: uuid('processed_by'),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  staffMonthYearUnique: uniqueIndex('payroll_staff_id_month_year_key').on(table.staffId, table.month, table.year),
  staffIdx: index('idx_payroll_staff').on(table.staffId),
  monthYearIdx: index('idx_payroll_month_year').on(table.month, table.year),
  statusIdx: index('idx_payroll_status').on(table.status),
}));

export const payrollRelations = relations(payroll, ({ one }) => ({
  tenant: one(tenants, { fields: [payroll.tenantId], references: [tenants.id] }),
  branch: one(branches, { fields: [payroll.branchId], references: [branches.id] }),
  staff: one(staff, { fields: [payroll.staffId], references: [staff.id] }),
}));
