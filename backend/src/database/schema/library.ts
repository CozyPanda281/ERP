import { pgTable, uuid, varchar, text, integer, boolean, timestamp, date, numeric, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { tenants } from './tenants';
import { branches } from './branches';

export const bookCategories = pgTable('book_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantNameUnique: uniqueIndex('book_categories_tenant_id_name_key').on(table.tenantId, table.name),
}));

export const books = pgTable('books', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  isbn: varchar('isbn', { length: 20 }),
  title: varchar('title', { length: 255 }).notNull(),
  author: varchar('author', { length: 255 }).notNull(),
  publisher: varchar('publisher', { length: 255 }),
  edition: varchar('edition', { length: 50 }),
  categoryId: uuid('category_id').references(() => bookCategories.id),
  language: varchar('language', { length: 50 }).default('English'),
  pages: integer('pages'),
  shelfLocation: varchar('shelf_location', { length: 100 }),
  purchaseDate: date('purchase_date'),
  purchasePrice: numeric('purchase_price', { precision: 10, scale: 2 }),
  quantity: integer('quantity').notNull().default(1),
  availableQuantity: integer('available_quantity').notNull().default(1),
  damagedQuantity: integer('damaged_quantity').default(0),
  lostQuantity: integer('lost_quantity').default(0),
  description: text('description'),
  coverImageUrl: text('cover_image_url'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  branchIdx: index('idx_books_branch').on(table.branchId),
  isbnIdx: index('idx_books_isbn').on(table.isbn),
  categoryIdx: index('idx_books_category').on(table.categoryId),
  titleIdx: index('idx_books_title').on(table.title),
}));

export const bookIssues = pgTable('book_issues', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  bookId: uuid('book_id').notNull().references(() => books.id),
  issuerType: varchar('issuer_type', { length: 20 }).notNull(),
  issuerId: uuid('issuer_id').notNull(),
  issueDate: date('issue_date').notNull(),
  dueDate: date('due_date').notNull(),
  returnDate: date('return_date'),
  fineAmount: numeric('fine_amount', { precision: 10, scale: 2 }).default('0'),
  finePaid: boolean('fine_paid').default(false),
  finePaidDate: date('fine_paid_date'),
  status: varchar('status', { length: 20 }).default('issued'),
  issuedBy: uuid('issued_by'),
  remarks: text('remarks'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  branchIdx: index('idx_book_issues_branch').on(table.branchId),
  bookIdx: index('idx_book_issues_book').on(table.bookId),
  statusIdx: index('idx_book_issues_status').on(table.status),
  dueIdx: index('idx_book_issues_due').on(table.dueDate).where(sql`status = 'issued'`),
}));

