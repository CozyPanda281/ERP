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

export const bookCategories = pgTable('book_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const libraryBooks = pgTable('library_books', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  branchId: uuid('branch_id').notNull(),
  title: varchar('title', { length: 300 }).notNull(),
  author: varchar('author', { length: 200 }),
  isbn: varchar('isbn', { length: 50 }),
  publisher: varchar('publisher', { length: 200 }),
  edition: varchar('edition', { length: 50 }),
  category: varchar('category', { length: 100 }),
  language: varchar('language', { length: 50 }).default('English'),
  totalCopies: integer('total_copies').default(1),
  availableCopies: integer('available_copies').default(1),
  shelfLocation: varchar('shelf_location', { length: 50 }),
  isActive: boolean('is_active').default(true),
  status: varchar('status', { length: 20 }).default('active'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const libraryMembers = pgTable('library_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  branchId: uuid('branch_id').notNull(),
  memberId: uuid('member_id').notNull(),
  memberType: varchar('member_type', { length: 20 }).notNull(),
  membershipDate: date('membership_date').notNull(),
  expiryDate: date('expiry_date'),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const libraryIssues = pgTable('library_issues', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  branchId: uuid('branch_id').notNull(),
  memberId: uuid('member_id').notNull(),
  bookId: uuid('book_id').notNull(),
  issueDate: date('issue_date').notNull(),
  dueDate: date('due_date').notNull(),
  returnDate: date('return_date'),
  status: varchar('status', { length: 20 }).default('issued'),
  fineAmount: decimal('fine_amount', { precision: 10, scale: 2 }).default('0'),
  remarks: text('remarks'),
  issuedBy: uuid('issued_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
