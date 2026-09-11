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

export const academicYears = pgTable(
  'academic_years',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    isCurrent: boolean('is_current').default(false),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    tenantBranchNameUnique: uniqueIndex(
      'academic_years_tenant_id_branch_id_name_key',
    ).on(table.tenantId, table.branchId, table.name),
    branchIdx: index('idx_academic_years_branch').on(table.branchId),
    currentIdx: index('idx_academic_years_current')
      .on(table.branchId)
      .where(sql`is_current = TRUE`),
  }),
);

export const departments = pgTable(
  'departments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    code: varchar('code', { length: 50 }),
    description: text('description'),
    hodId: uuid('hod_id'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantBranchNameUnique: uniqueIndex(
      'departments_tenant_id_branch_id_name_key',
    )
      .on(table.tenantId, table.branchId, table.name)
      .where(sql`deleted_at IS NULL`),
    branchIdx: index('idx_departments_branch').on(table.branchId),
  }),
);

export const classes = pgTable(
  'classes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    code: varchar('code', { length: 50 }),
    description: text('description'),
    displayOrder: integer('display_order').default(0),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantBranchNameUnique: uniqueIndex('classes_tenant_id_branch_id_name_key')
      .on(table.tenantId, table.branchId, table.name)
      .where(sql`deleted_at IS NULL`),
    branchIdx: index('idx_classes_branch').on(table.branchId),
  }),
);

export const sections = pgTable(
  'sections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    code: varchar('code', { length: 50 }),
    capacity: integer('capacity').default(0),
    roomNumber: varchar('room_number', { length: 50 }),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantBranchClassNameUnique: uniqueIndex(
      'sections_tenant_id_branch_id_class_id_name_key',
    )
      .on(table.tenantId, table.branchId, table.classId, table.name)
      .where(sql`deleted_at IS NULL`),
    classIdx: index('idx_sections_class').on(table.classId),
  }),
);

export const subjects = pgTable(
  'subjects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    code: varchar('code', { length: 50 }),
    subjectType: varchar('subject_type', { length: 20 }).default('theory'),
    description: text('description'),
    isLanguage: boolean('is_language').default(false),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantBranchCodeUnique: uniqueIndex('subjects_tenant_id_branch_id_code_key')
      .on(table.tenantId, table.branchId, table.code)
      .where(sql`deleted_at IS NULL`),
    branchIdx: index('idx_subjects_branch').on(table.branchId),
  }),
);

export const classSubjects = pgTable(
  'class_subjects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    isCompulsory: boolean('is_compulsory').default(true),
    maxMarks: integer('max_marks').default(100),
    passMarks: integer('pass_marks').default(33),
    creditHours: numeric('credit_hours', { precision: 4, scale: 1 }).default(
      '0',
    ),
    displayOrder: integer('display_order').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    tenantBranchClassSubjectUnique: uniqueIndex(
      'class_subjects_tenant_id_branch_id_class_id_subject_id_key',
    ).on(table.tenantId, table.branchId, table.classId, table.subjectId),
    classIdx: index('idx_class_subjects_class').on(table.classId),
  }),
);

export const teacherSubjects = pgTable(
  'teacher_subjects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    teacherId: uuid('teacher_id').notNull(),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    sectionId: uuid('section_id').references(() => sections.id, {
      onDelete: 'cascade',
    }),
    isClassTeacher: boolean('is_class_teacher').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueAssignment: uniqueIndex(
      'teacher_subjects_tenant_id_branch_id_teacher_id_subject_id_class_id_section_id_key',
    ).on(
      table.tenantId,
      table.branchId,
      table.teacherId,
      table.subjectId,
      table.classId,
      table.sectionId,
    ),
    teacherIdx: index('idx_teacher_subjects_teacher').on(table.teacherId),
  }),
);

export const academicYearsRelations = relations(academicYears, ({ one }) => ({
  tenant: one(tenants, {
    fields: [academicYears.tenantId],
    references: [tenants.id],
  }),
  branch: one(branches, {
    fields: [academicYears.branchId],
    references: [branches.id],
  }),
}));

export const departmentsRelations = relations(departments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [departments.tenantId],
    references: [tenants.id],
  }),
  branch: one(branches, {
    fields: [departments.branchId],
    references: [branches.id],
  }),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [classes.tenantId],
    references: [tenants.id],
  }),
  branch: one(branches, {
    fields: [classes.branchId],
    references: [branches.id],
  }),
  sections: many(sections),
  classSubjects: many(classSubjects),
}));

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [sections.tenantId],
    references: [tenants.id],
  }),
  branch: one(branches, {
    fields: [sections.branchId],
    references: [branches.id],
  }),
  class: one(classes, { fields: [sections.classId], references: [classes.id] }),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [subjects.tenantId],
    references: [tenants.id],
  }),
  branch: one(branches, {
    fields: [subjects.branchId],
    references: [branches.id],
  }),
  classSubjects: many(classSubjects),
}));
