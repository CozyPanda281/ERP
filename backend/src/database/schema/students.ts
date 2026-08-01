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
import { classes, academicYears, sections } from './academic';

export const enquiries = pgTable(
  'enquiries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    studentName: varchar('student_name', { length: 255 }).notNull(),
    dateOfBirth: date('date_of_birth'),
    gender: varchar('gender', { length: 10 }),
    parentName: varchar('parent_name', { length: 255 }),
    parentPhone: varchar('parent_phone', { length: 20 }),
    parentEmail: varchar('parent_email', { length: 255 }),
    address: text('address'),
    classId: uuid('class_id').references(() => classes.id),
    academicYearId: uuid('academic_year_id').references(() => academicYears.id),
    source: varchar('source', { length: 100 }),
    status: varchar('status', { length: 50 }).default('new'),
    remarks: text('remarks'),
    followUpDate: date('follow_up_date'),
    assignedTo: uuid('assigned_to'),
    convertedToApplication: boolean('converted_to_application').default(false),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    branchIdx: index('idx_enquiries_branch').on(table.branchId),
    statusIdx: index('idx_enquiries_status').on(table.status),
  }),
);

export const applications = pgTable(
  'applications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    applicationNumber: varchar('application_number', { length: 50 }).notNull(),
    enquiryId: uuid('enquiry_id').references(() => enquiries.id),
    studentFirstName: varchar('student_first_name', { length: 100 }).notNull(),
    studentLastName: varchar('student_last_name', { length: 100 }).notNull(),
    dateOfBirth: date('date_of_birth'),
    gender: varchar('gender', { length: 10 }),
    nationality: varchar('nationality', { length: 100 }).default('Indian'),
    religion: varchar('religion', { length: 100 }),
    caste: varchar('caste', { length: 100 }),
    category: varchar('category', { length: 50 }),
    address: text('address'),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 100 }),
    pincode: varchar('pincode', { length: 10 }),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 255 }),
    bloodGroup: varchar('blood_group', { length: 5 }),
    fatherName: varchar('father_name', { length: 255 }),
    fatherPhone: varchar('father_phone', { length: 20 }),
    fatherEmail: varchar('father_email', { length: 255 }),
    fatherOccupation: varchar('father_occupation', { length: 100 }),
    motherName: varchar('mother_name', { length: 255 }),
    motherPhone: varchar('mother_phone', { length: 20 }),
    motherEmail: varchar('mother_email', { length: 255 }),
    motherOccupation: varchar('mother_occupation', { length: 100 }),
    guardianName: varchar('guardian_name', { length: 255 }),
    guardianRelation: varchar('guardian_relation', { length: 50 }),
    guardianPhone: varchar('guardian_phone', { length: 20 }),
    previousSchool: varchar('previous_school', { length: 255 }),
    previousClass: varchar('previous_class', { length: 50 }),
    classId: uuid('class_id').references(() => classes.id),
    academicYearId: uuid('academic_year_id').references(() => academicYears.id),
    documents: jsonb('documents').default({}),
    status: varchar('status', { length: 50 }).default('pending'),
    reviewRemarks: text('review_remarks'),
    reviewedBy: uuid('reviewed_by'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    admitted: boolean('admitted').default(false),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    tenantBranchAppNoUnique: uniqueIndex(
      'applications_tenant_id_branch_id_application_number_key',
    ).on(table.tenantId, table.branchId, table.applicationNumber),
    branchIdx: index('idx_applications_branch').on(table.branchId),
    statusIdx: index('idx_applications_status').on(table.status),
    classIdx: index('idx_applications_class').on(table.classId),
  }),
);

export const students = pgTable(
  'students',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    admissionNumber: varchar('admission_number', { length: 50 }).notNull(),
    rollNumber: varchar('roll_number', { length: 50 }),
    applicationId: uuid('application_id').references(() => applications.id),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    middleName: varchar('middle_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    dateOfBirth: date('date_of_birth'),
    gender: varchar('gender', { length: 10 }),
    bloodGroup: varchar('blood_group', { length: 5 }),
    nationality: varchar('nationality', { length: 100 }).default('Indian'),
    religion: varchar('religion', { length: 100 }),
    caste: varchar('caste', { length: 100 }),
    category: varchar('category', { length: 50 }),
    address: text('address'),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 100 }),
    pincode: varchar('pincode', { length: 10 }),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 255 }),
    profilePhotoUrl: text('profile_photo_url'),
    aadharNumber: varchar('aadhar_number', { length: 20 }),
    samagraId: varchar('samagra_id', { length: 50 }),
    isActive: boolean('is_active').default(true),
    status: varchar('status', { length: 50 }).default('active'),
    admissionDate: date('admission_date'),
    leavingDate: date('leaving_date'),
    leavingReason: text('leaving_reason'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantBranchAdmNoUnique: uniqueIndex(
      'students_tenant_id_branch_id_admission_number_key',
    ).on(table.tenantId, table.branchId, table.admissionNumber),
    branchIdx: index('idx_students_branch').on(table.branchId),
    activeIdx: index('idx_students_active')
      .on(table.branchId)
      .where(sql`is_active = TRUE`),
    nameIdx: index('idx_students_name').on(table.firstName, table.lastName),
  }),
);

export const studentDocuments = pgTable(
  'student_documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    documentType: varchar('document_type', { length: 100 }).notNull(),
    documentName: varchar('document_name', { length: 255 }),
    documentNumber: varchar('document_number', { length: 100 }),
    fileUrl: text('file_url').notNull(),
    fileSize: integer('file_size'),
    mimeType: varchar('mime_type', { length: 100 }),
    isVerified: boolean('is_verified').default(false),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verifiedBy: uuid('verified_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    studentIdx: index('idx_student_docs_student').on(table.studentId),
  }),
);

export const parents = pgTable(
  'parents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    relationship: varchar('relationship', { length: 50 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 255 }),
    occupation: varchar('occupation', { length: 100 }),
    income: numeric('income', { precision: 10, scale: 2 }),
    address: text('address'),
    isPrimary: boolean('is_primary').default(false),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    tenantIdx: index('idx_parents_tenant').on(table.tenantId),
  }),
);

export const studentParents = pgTable(
  'student_parents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, {
      onDelete: 'cascade',
    }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id')
      .notNull()
      .references(() => parents.id, { onDelete: 'cascade' }),
    relationship: varchar('relationship', { length: 50 }).notNull(),
    isPrimary: boolean('is_primary').default(false),
    isEmergencyContact: boolean('is_emergency_contact').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    studentParentUnique: uniqueIndex(
      'student_parents_student_id_parent_id_key',
    ).on(table.studentId, table.parentId),
    studentIdx: index('idx_student_parents_student').on(table.studentId),
    tenantIdx: index('idx_student_parents_tenant').on(table.tenantId),
  }),
);

export const studentAcademicRecords = pgTable(
  'student_academic_records',
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
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id),
    sectionId: uuid('section_id').references(() => sections.id),
    academicYearId: uuid('academic_year_id')
      .notNull()
      .references(() => academicYears.id),
    rollNumber: varchar('roll_number', { length: 50 }),
    isPromoted: boolean('is_promoted').default(false),
    promotedToClass: uuid('promoted_to_class').references(() => classes.id),
    promotionDate: date('promotion_date'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    studentAcademicYearUnique: uniqueIndex(
      'student_academic_records_student_id_academic_year_id_key',
    ).on(table.studentId, table.academicYearId),
    studentIdx: index('idx_student_academic_records_student').on(
      table.studentId,
    ),
    classIdx: index('idx_student_academic_records_class').on(table.classId),
  }),
);
