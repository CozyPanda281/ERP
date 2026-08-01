import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  date,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';

export const accountingAccounts = pgTable('accounting_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  branchId: uuid('branch_id').notNull(),
  accountCode: varchar('account_code', { length: 50 }).notNull(),
  accountName: varchar('account_name', { length: 200 }).notNull(),
  accountType: varchar('account_type', { length: 50 }).notNull(),
  parentId: uuid('parent_id'),
  description: text('description'),
  openingBalance: decimal('opening_balance', {
    precision: 14,
    scale: 2,
  }).default('0'),
  isActive: boolean('is_active').default(true),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const accountingJournalEntries = pgTable('accounting_journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  branchId: uuid('branch_id').notNull(),
  entryNumber: varchar('entry_number', { length: 50 }).notNull(),
  entryDate: date('entry_date').notNull(),
  reference: varchar('reference', { length: 100 }),
  description: text('description'),
  entryType: varchar('entry_type', { length: 50 }),
  status: varchar('status', { length: 20 }).default('posted'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const accountingJournalEntryItems = pgTable(
  'accounting_journal_entry_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journalEntryId: uuid('journal_entry_id').notNull(),
    accountId: uuid('account_id').notNull(),
    debit: decimal('debit', { precision: 14, scale: 2 }).default('0'),
    credit: decimal('credit', { precision: 14, scale: 2 }).default('0'),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow(),
  },
);

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  branchId: uuid('branch_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  assetType: varchar('asset_type', { length: 100 }).notNull(),
  assetCode: varchar('asset_code', { length: 50 }),
  description: text('description'),
  purchaseDate: date('purchase_date'),
  purchasePrice: decimal('purchase_price', { precision: 12, scale: 2 }),
  currentValue: decimal('current_value', { precision: 12, scale: 2 }),
  depreciationMethod: varchar('depreciation_method', { length: 50 }),
  depreciationRate: decimal('depreciation_rate', { precision: 5, scale: 2 }),
  warrantyExpiry: date('warranty_expiry'),
  warrantyDetails: text('warranty_details'),
  location: varchar('location', { length: 255 }),
  status: varchar('status', { length: 50 }).default('active'),
  assignedTo: uuid('assigned_to'),
  conditionNote: text('condition_note'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const accountingBudgets = pgTable('accounting_budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  branchId: uuid('branch_id').notNull(),
  fiscalYearId: uuid('fiscal_year_id'),
  accountId: uuid('account_id').notNull(),
  budgetedAmount: decimal('budgeted_amount', {
    precision: 14,
    scale: 2,
  }).notNull(),
  actualAmount: decimal('actual_amount', { precision: 14, scale: 2 }).default(
    '0',
  ),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
