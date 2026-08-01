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
import { users } from './users';
import { departments } from './academic';

export const staff = pgTable(
  'staff',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id),
    employeeCode: varchar('employee_code', { length: 50 }).notNull(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    dateOfBirth: date('date_of_birth'),
    gender: varchar('gender', { length: 10 }),
    bloodGroup: varchar('blood_group', { length: 5 }),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 255 }),
    address: text('address'),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 100 }),
    pincode: varchar('pincode', { length: 10 }),
    qualification: text('qualification'),
    experienceYears: numeric('experience_years', { precision: 4, scale: 1 }),
    joiningDate: date('joining_date'),
    employmentType: varchar('employment_type', { length: 20 }).default(
      'permanent',
    ),
    designation: varchar('designation', { length: 100 }),
    departmentId: uuid('department_id').references(() => departments.id),
    basicSalary: numeric('basic_salary', { precision: 10, scale: 2 }),
    bankName: varchar('bank_name', { length: 255 }),
    bankAccountNo: varchar('bank_account_no', { length: 50 }),
    ifscCode: varchar('ifsc_code', { length: 20 }),
    panNumber: varchar('pan_number', { length: 20 }),
    aadharNumber: varchar('aadhar_number', { length: 20 }),
    isActive: boolean('is_active').default(true),
    isTeaching: boolean('is_teaching').default(false),
    profilePhotoUrl: text('profile_photo_url'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantBranchEmpCodeUnique: uniqueIndex(
      'staff_tenant_id_branch_id_employee_code_key',
    ).on(table.tenantId, table.branchId, table.employeeCode),
    branchIdx: index('idx_staff_branch').on(table.branchId),
    departmentIdx: index('idx_staff_department').on(table.departmentId),
    teachingIdx: index('idx_staff_teaching')
      .on(table.branchId)
      .where(sql`is_teaching = TRUE`),
  }),
);

export const staffDocuments = pgTable(
  'staff_documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    staffId: uuid('staff_id')
      .notNull()
      .references(() => staff.id, { onDelete: 'cascade' }),
    documentType: varchar('document_type', { length: 100 }).notNull(),
    documentNumber: varchar('document_number', { length: 100 }),
    fileUrl: text('file_url').notNull(),
    isVerified: boolean('is_verified').default(false),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verifiedBy: uuid('verified_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    staffIdx: index('idx_staff_docs_staff').on(table.staffId),
  }),
);

export const staffRelations = relations(staff, ({ one, many }) => ({
  tenant: one(tenants, { fields: [staff.tenantId], references: [tenants.id] }),
  branch: one(branches, {
    fields: [staff.branchId],
    references: [branches.id],
  }),
  user: one(users, { fields: [staff.userId], references: [users.id] }),
  department: one(departments, {
    fields: [staff.departmentId],
    references: [departments.id],
  }),
  documents: many(staffDocuments),
}));

export const staffDocumentsRelations = relations(staffDocuments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [staffDocuments.tenantId],
    references: [tenants.id],
  }),
  staff: one(staff, {
    fields: [staffDocuments.staffId],
    references: [staff.id],
  }),
}));
