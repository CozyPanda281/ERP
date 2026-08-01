import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  numeric,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { tenants } from './tenants';
import { branches } from './branches';
import { students } from './students';
import { staff } from './staff';
import { classes, sections, subjects } from './academic';

export const homework = pgTable(
  'homework',
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
      .references(() => classes.id),
    sectionId: uuid('section_id').references(() => sections.id),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => staff.id),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    attachmentUrls: jsonb('attachment_urls').default([]),
    dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
    maxMarks: integer('max_marks'),
    isMandatory: boolean('is_mandatory').default(true),
    status: varchar('status', { length: 50 }).default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    classIdx: index('idx_homework_class').on(table.classId),
    teacherIdx: index('idx_homework_teacher').on(table.teacherId),
    dueIdx: index('idx_homework_due')
      .on(table.dueDate)
      .where(sql`status = 'active'`),
  }),
);

export const homeworkSubmissions = pgTable(
  'homework_submissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    homeworkId: uuid('homework_id')
      .notNull()
      .references(() => homework.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    submissionText: text('submission_text'),
    attachmentUrls: jsonb('attachment_urls').default([]),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow(),
    isLate: boolean('is_late').default(false),
    marksObtained: numeric('marks_obtained', { precision: 6, scale: 2 }),
    feedback: text('feedback'),
    status: varchar('status', { length: 50 }).default('submitted'),
    gradedBy: uuid('graded_by'),
    gradedAt: timestamp('graded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    homeworkStudentUnique: uniqueIndex(
      'homework_submissions_homework_id_student_id_key',
    ).on(table.homeworkId, table.studentId),
    homeworkIdx: index('idx_homework_submissions_homework').on(
      table.homeworkId,
    ),
    studentIdx: index('idx_homework_submissions_student').on(table.studentId),
  }),
);

export const assignments = pgTable(
  'assignments',
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
      .references(() => classes.id),
    sectionId: uuid('section_id').references(() => sections.id),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => staff.id),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    assignmentType: varchar('assignment_type', { length: 50 }).default(
      'written',
    ),
    attachmentUrls: jsonb('attachment_urls').default([]),
    dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
    maxMarks: integer('max_marks'),
    status: varchar('status', { length: 50 }).default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    classIdx: index('idx_assignments_class').on(table.classId),
  }),
);

export const assignmentSubmissions = pgTable(
  'assignment_submissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    assignmentId: uuid('assignment_id')
      .notNull()
      .references(() => assignments.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    submissionText: text('submission_text'),
    attachmentUrls: jsonb('attachment_urls').default([]),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow(),
    isLate: boolean('is_late').default(false),
    marksObtained: numeric('marks_obtained', { precision: 6, scale: 2 }),
    feedback: text('feedback'),
    status: varchar('status', { length: 50 }).default('submitted'),
    gradedBy: uuid('graded_by'),
    gradedAt: timestamp('graded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    assignmentStudentUnique: uniqueIndex(
      'assignment_submissions_assignment_id_student_id_key',
    ).on(table.assignmentId, table.studentId),
    assignmentIdx: index('idx_assignment_submissions_assignment').on(
      table.assignmentId,
    ),
    studentIdx: index('idx_assignment_submissions_student').on(table.studentId),
  }),
);
