import { pgTable, uuid, varchar, text, integer, boolean, timestamp, date, numeric, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { tenants } from './tenants';
import { branches } from './branches';

export const inventoryCategories = pgTable('inventory_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantNameUnique: uniqueIndex('inventory_categories_tenant_id_name_key').on(table.tenantId, table.name),
}));

export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => inventoryCategories.id),
  name: varchar('name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 100 }),
  description: text('description'),
  unit: varchar('unit', { length: 50 }),
  quantity: numeric('quantity', { precision: 12, scale: 2 }).default('0'),
  minQuantity: numeric('min_quantity', { precision: 12, scale: 2 }).default('0'),
  maxQuantity: numeric('max_quantity', { precision: 12, scale: 2 }),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }),
  totalValue: numeric('total_value', { precision: 12, scale: 2 }),
  location: varchar('location', { length: 255 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  branchIdx: index('idx_inventory_items_branch').on(table.branchId),
  categoryIdx: index('idx_inventory_items_category').on(table.categoryId),
  skuIdx: index('idx_inventory_items_sku').on(table.sku),
  lowStockIdx: index('idx_inventory_items_low_stock').on(table.quantity).where(sql`quantity <= min_quantity`),
}));

export const inventoryTransactions = pgTable('inventory_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  itemId: uuid('item_id').notNull().references(() => inventoryItems.id, { onDelete: 'cascade' }),
  transactionType: varchar('transaction_type', { length: 5 }).notNull(),
  quantity: numeric('quantity', { precision: 12, scale: 2 }).notNull().default('0'),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }),
  referenceType: varchar('reference_type', { length: 50 }),
  referenceId: uuid('reference_id'),
  vendorName: varchar('vendor_name', { length: 255 }),
  billNumber: varchar('bill_number', { length: 100 }),
  remarks: text('remarks'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  itemIdx: index('idx_inventory_transactions_item').on(table.itemId),
  typeIdx: index('idx_inventory_transactions_type').on(table.transactionType),
}));

export const assets = pgTable('assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  assetType: varchar('asset_type', { length: 100 }).notNull(),
  assetCode: varchar('asset_code', { length: 50 }),
  description: text('description'),
  purchaseDate: date('purchase_date'),
  purchasePrice: numeric('purchase_price', { precision: 12, scale: 2 }),
  currentValue: numeric('current_value', { precision: 12, scale: 2 }),
  depreciationMethod: varchar('depreciation_method', { length: 50 }),
  depreciationRate: numeric('depreciation_rate', { precision: 5, scale: 2 }),
  warrantyExpiry: date('warranty_expiry'),
  warrantyDetails: text('warranty_details'),
  location: varchar('location', { length: 255 }),
  status: varchar('status', { length: 50 }).default('active'),
  assignedTo: uuid('assigned_to'),
  conditionNote: text('condition_note'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  branchIdx: index('idx_assets_branch').on(table.branchId),
  typeIdx: index('idx_assets_type').on(table.assetType),
  statusIdx: index('idx_assets_status').on(table.status),
}));
