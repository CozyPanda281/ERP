import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  smallint,
  time,
  timestamp,
  date,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { branches } from './branches';
import { staff } from './staff';
import { classes, sections, subjects, academicYears } from './academic';

export const timetables = pgTable(
  'timetables',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id),
    sectionId: uuid('section_id').references(() => sections.id),
    academicYearId: uuid('academic_year_id').references(() => academicYears.id),
    isActive: boolean('is_active').default(true),
    validFrom: date('valid_from'),
    validUntil: date('valid_until'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    classIdx: index('idx_timetables_class').on(table.classId),
  }),
);

export const timetableEntries = pgTable(
  'timetable_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    timetableId: uuid('timetable_id')
      .notNull()
      .references(() => timetables.id, { onDelete: 'cascade' }),
    dayOfWeek: smallint('day_of_week').notNull(),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id),
    teacherId: uuid('teacher_id').references(() => staff.id),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    roomNumber: varchar('room_number', { length: 50 }),
    isBreak: boolean('is_break').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    timetableIdx: index('idx_timetable_entries_timetable').on(
      table.timetableId,
    ),
    dayIdx: index('idx_timetable_entries_day').on(
      table.timetableId,
      table.dayOfWeek,
    ),
  }),
);
