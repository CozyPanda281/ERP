import { pgTable, uuid, varchar, text, integer, decimal, date, timestamp, boolean } from 'drizzle-orm/pg-core';

export const inventoryCategories = pgTable('inventory_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  branchId: uuid('branch_id').notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  code: varchar('code', { length: 50 }),
  description: text('description'),
  parentId: uuid('parent_id'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  branchId: uuid('branch_id').notNull(),
  categoryId: uuid('category_id'),
  name: varchar('name', { length: 200 }).notNull(),
  code: varchar('code', { length: 50 }),
  unit: varchar('unit', { length: 50 }),
  reorderLevel: integer('reorder_level').default(0),
  currentStock: integer('current_stock').default(0),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).default('0'),
  isActive: boolean('is_active').default(true),
  status: varchar('status', { length: 20 }).default('active'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const inventorySuppliers = pgTable('inventory_suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  branchId: uuid('branch_id').notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  code: varchar('code', { length: 50 }),
  contactPerson: varchar('contact_person', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 200 }),
  address: text('address'),
  isActive: boolean('is_active').default(true),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const inventoryPurchaseOrders = pgTable('inventory_purchase_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  branchId: uuid('branch_id').notNull(),
  orderNumber: varchar('order_number', { length: 50 }).notNull(),
  supplierId: uuid('supplier_id').notNull(),
  orderDate: date('order_date').notNull(),
  expectedDate: date('expected_date'),
  status: varchar('status', { length: 20 }).default('draft'),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }),
  notes: text('notes'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const inventoryPurchaseOrderItems = pgTable('inventory_purchase_order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  poId: uuid('po_id').notNull(),
  itemId: uuid('item_id').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal('total_price', { precision: 12, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const inventoryGoodsReceipts = pgTable('inventory_goods_receipts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  branchId: uuid('branch_id').notNull(),
  poId: uuid('po_id'),
  receiptNumber: varchar('receipt_number', { length: 50 }).notNull(),
  receiptDate: date('receipt_date').notNull(),
  notes: text('notes'),
  status: varchar('status', { length: 20 }).default('received'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const inventoryGoodsReceiptItems = pgTable('inventory_goods_receipt_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  grnId: uuid('grn_id').notNull(),
  itemId: uuid('item_id').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const inventoryStockAdjustments = pgTable('inventory_stock_adjustments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  branchId: uuid('branch_id').notNull(),
  itemId: uuid('item_id').notNull(),
  adjustmentType: varchar('adjustment_type', { length: 20 }).notNull(),
  quantity: integer('quantity').notNull(),
  reason: varchar('reason', { length: 200 }),
  referenceNumber: varchar('reference_number', { length: 50 }),
  adjustedBy: uuid('adjusted_by'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});
