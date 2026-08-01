import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  date,
  numeric,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { tenants } from './tenants';
import { branches } from './branches';
import { students } from './students';
import { classes, academicYears } from './academic';

export const feeStructures = pgTable(
  'fee_structures',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    classId: uuid('class_id').references(() => classes.id),
    academicYearId: uuid('academic_year_id').references(() => academicYears.id),
    frequency: varchar('frequency', { length: 50 }).default('monthly'),
    isActive: boolean('is_active').default(true),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    branchIdx: index('idx_fee_structures_branch').on(table.branchId),
    classIdx: index('idx_fee_structures_class').on(table.classId),
  }),
);

export const feeStructureItems = pgTable(
  'fee_structure_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    feeStructureId: uuid('fee_structure_id')
      .notNull()
      .references(() => feeStructures.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    amount: numeric('amount', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    isOptional: boolean('is_optional').default(false),
    isRecurring: boolean('is_recurring').default(true),
    frequency: varchar('frequency', { length: 50 }).default('monthly'),
    dueDay: integer('due_day'),
    sortOrder: integer('sort_order').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    structureIdx: index('idx_fee_items_structure').on(table.feeStructureId),
  }),
);

export const feeDiscounts = pgTable('fee_discounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  discountType: varchar('discount_type', { length: 20 }).notNull(),
  value: numeric('value', { precision: 10, scale: 2 }).notNull().default('0'),
  applicableTo: varchar('applicable_to', { length: 50 }).default('all'),
  applicableIds: jsonb('applicable_ids').default([]),
  isActive: boolean('is_active').default(true),
  validFrom: date('valid_from'),
  validUntil: date('valid_until'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const feeConcessions = pgTable(
  'fee_concessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    feeStructureItemId: uuid('fee_structure_item_id').references(
      () => feeStructureItems.id,
    ),
    discountId: uuid('discount_id').references(() => feeDiscounts.id),
    amount: numeric('amount', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    type: varchar('type', { length: 20 }).notNull(),
    approvedBy: uuid('approved_by'),
    validFrom: date('valid_from'),
    validUntil: date('valid_until'),
    remarks: text('remarks'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    studentIdx: index('idx_fee_concessions_student').on(table.studentId),
  }),
);

export const studentFeeAccounts = pgTable(
  'student_fee_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    feeStructureId: uuid('fee_structure_id').references(() => feeStructures.id),
    academicYearId: uuid('academic_year_id').references(() => academicYears.id),
    totalFee: numeric('total_fee', { precision: 12, scale: 2 }).default('0'),
    totalDiscount: numeric('total_discount', {
      precision: 12,
      scale: 2,
    }).default('0'),
    totalPaid: numeric('total_paid', { precision: 12, scale: 2 }).default('0'),
    totalDue: numeric('total_due', { precision: 12, scale: 2 }).default('0'),
    status: varchar('status', { length: 50 }).default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    studentYearUnique: uniqueIndex(
      'student_fee_accounts_student_id_academic_year_id_key',
    ).on(table.studentId, table.academicYearId),
    studentIdx: index('idx_fee_accounts_student').on(table.studentId),
    statusIdx: index('idx_fee_accounts_status').on(table.status),
    dueIdx: index('idx_fee_accounts_due')
      .on(table.totalDue)
      .where(sql`total_due > 0`),
  }),
);

export const feeTransactions = pgTable(
  'fee_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    feeAccountId: uuid('fee_account_id').references(
      () => studentFeeAccounts.id,
    ),
    transactionNo: varchar('transaction_no', { length: 50 }).notNull(),
    invoiceNo: varchar('invoice_no', { length: 50 }),
    amount: numeric('amount', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    paymentMethod: varchar('payment_method', { length: 20 }),
    paymentDate: timestamp('payment_date', { withTimezone: true }).defaultNow(),
    dueDate: date('due_date'),
    paidDate: date('paid_date'),
    referenceNumber: varchar('reference_number', { length: 100 }),
    chequeNumber: varchar('cheque_number', { length: 50 }),
    chequeDate: date('cheque_date'),
    bankName: varchar('bank_name', { length: 255 }),
    upiId: varchar('upi_id', { length: 100 }),
    gatewayResponse: jsonb('gateway_response').default({}),
    status: varchar('status', { length: 20 }).default('completed'),
    remarks: text('remarks'),
    reconciled: boolean('reconciled').default(false),
    reconciledAt: timestamp('reconciled_at', { withTimezone: true }),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    tenantBranchTxnNoUnique: uniqueIndex(
      'fee_transactions_tenant_id_branch_id_transaction_no_key',
    ).on(table.tenantId, table.branchId, table.transactionNo),
    studentIdx: index('idx_fee_transactions_student').on(table.studentId),
    accountIdx: index('idx_fee_transactions_account').on(table.feeAccountId),
    statusIdx: index('idx_fee_transactions_status').on(table.status),
    dateIdx: index('idx_fee_transactions_date').on(table.paymentDate),
  }),
);

export const feeReceipts = pgTable(
  'fee_receipts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    transactionId: uuid('transaction_id')
      .notNull()
      .references(() => feeTransactions.id, { onDelete: 'cascade' }),
    receiptNumber: varchar('receipt_number', { length: 50 }).notNull(),
    receiptDate: date('receipt_date').notNull(),
    receiptUrl: text('receipt_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    tenantReceiptNoUnique: uniqueIndex(
      'fee_receipts_tenant_id_receipt_number_key',
    ).on(table.tenantId, table.receiptNumber),
    transactionIdx: index('idx_fee_receipts_transaction').on(
      table.transactionId,
    ),
  }),
);

export const feeInvoices = pgTable(
  'fee_invoices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    invoiceNumber: varchar('invoice_number', { length: 50 }).notNull(),
    invoiceDate: date('invoice_date').notNull(),
    dueDate: date('due_date').notNull(),
    items: jsonb('items').notNull().default([]),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    discountTotal: numeric('discount_total', {
      precision: 12,
      scale: 2,
    }).default('0'),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    amountPaid: numeric('amount_paid', { precision: 12, scale: 2 }).default(
      '0',
    ),
    balanceDue: numeric('balance_due', { precision: 12, scale: 2 }).default(
      '0',
    ),
    status: varchar('status', { length: 50 }).default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    tenantBranchInvoiceNoUnique: uniqueIndex(
      'fee_invoices_tenant_id_branch_id_invoice_number_key',
    ).on(table.tenantId, table.branchId, table.invoiceNumber),
    studentIdx: index('idx_fee_invoices_student').on(table.studentId),
    statusIdx: index('idx_fee_invoices_status').on(table.status),
    dueIdx: index('idx_fee_invoices_due')
      .on(table.dueDate)
      .where(sql`status = 'pending'`),
  }),
);
