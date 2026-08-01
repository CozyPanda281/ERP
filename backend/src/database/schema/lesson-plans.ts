import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  date,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { branches } from './branches';
import { staff } from './staff';
import { classes, sections, subjects } from './academic';

export const lessonPlans = pgTable(
  'lesson_plans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => staff.id),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id),
    sectionId: uuid('section_id').references(() => sections.id),
    title: varchar('title', { length: 255 }).notNull(),
    objectives: text('objectives'),
    content: text('content'),
    teachingMethod: varchar('teaching_method', { length: 100 }),
    resources: text('resources'),
    durationMinutes: integer('duration_minutes'),
    date: date('date'),
    status: varchar('status', { length: 50 }).default('draft'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    teacherIdx: index('idx_lesson_plans_teacher').on(table.teacherId),
    dateIdx: index('idx_lesson_plans_date').on(table.date),
  }),
);
