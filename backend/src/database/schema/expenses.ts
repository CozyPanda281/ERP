import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  date,
  numeric,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { branches } from './branches';

export const expenseCategories = pgTable(
  'expense_categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    tenantNameUnique: uniqueIndex('expense_categories_tenant_id_name_key').on(
      table.tenantId,
      table.name,
    ),
  }),
);

export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => expenseCategories.id),
    amount: numeric('amount', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    description: text('description').notNull(),
    expenseDate: date('expense_date').notNull(),
    paymentMethod: varchar('payment_method', { length: 20 }),
    referenceNumber: varchar('reference_number', { length: 100 }),
    vendorName: varchar('vendor_name', { length: 255 }),
    billNumber: varchar('bill_number', { length: 100 }),
    billUrl: text('bill_url'),
    approvedBy: uuid('approved_by'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    branchIdx: index('idx_expenses_branch').on(table.branchId),
    categoryIdx: index('idx_expenses_category').on(table.categoryId),
    dateIdx: index('idx_expenses_date').on(table.expenseDate),
  }),
);

export const incomeCategories = pgTable(
  'income_categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    tenantNameUnique: uniqueIndex('income_categories_tenant_id_name_key').on(
      table.tenantId,
      table.name,
    ),
  }),
);

export const income = pgTable(
  'income',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => incomeCategories.id),
    amount: numeric('amount', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    description: text('description').notNull(),
    incomeDate: date('income_date').notNull(),
    paymentMethod: varchar('payment_method', { length: 20 }),
    referenceNumber: varchar('reference_number', { length: 100 }),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    branchIdx: index('idx_income_branch').on(table.branchId),
    dateIdx: index('idx_income_date').on(table.incomeDate),
  }),
);
