import { pgTable, uuid, varchar, text, integer, boolean, time, timestamp, date, numeric, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { branches } from './branches';
import { students } from './students';
import { classes, subjects, academicYears } from './academic';

export const exams = pgTable('exams', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  examType: varchar('exam_type', { length: 20 }).default('unit_test'),
  classId: uuid('class_id').references(() => classes.id),
  academicYearId: uuid('academic_year_id').references(() => academicYears.id),
  startDate: date('start_date'),
  endDate: date('end_date'),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  branchIdx: index('idx_exams_branch').on(table.branchId),
  classIdx: index('idx_exams_class').on(table.classId),
  typeIdx: index('idx_exams_type').on(table.examType),
}));

export const examSchedules = pgTable('exam_schedules', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  examId: uuid('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id),
  classId: uuid('class_id').references(() => classes.id),
  date: date('date'),
  startTime: time('start_time'),
  endTime: time('end_time'),
  maxMarks: integer('max_marks').default(100),
  passMarks: integer('pass_marks').default(33),
  roomNumber: varchar('room_number', { length: 50 }),
  invigilatorId: uuid('invigilator_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  examIdx: index('idx_exam_schedules_exam').on(table.examId),
  subjectIdx: index('idx_exam_schedules_subject').on(table.subjectId),
}));

export const marks = pgTable('marks', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  examScheduleId: uuid('exam_schedule_id').notNull().references(() => examSchedules.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  marksObtained: numeric('marks_obtained', { precision: 6, scale: 2 }),
  maxMarks: integer('max_marks').default(100),
  isAbsent: boolean('is_absent').default(false),
  isMalpractice: boolean('is_malpractice').default(false),
  grade: varchar('grade', { length: 5 }),
  gradePoint: numeric('grade_point', { precision: 3, scale: 1 }),
  remarks: text('remarks'),
  enteredBy: uuid('entered_by'),
  enteredAt: timestamp('entered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  scheduleStudentUnique: uniqueIndex('marks_exam_schedule_id_student_id_key').on(table.examScheduleId, table.studentId),
  scheduleIdx: index('idx_marks_exam_schedule').on(table.examScheduleId),
  studentIdx: index('idx_marks_student').on(table.studentId),
}));

export const examResults = pgTable('exam_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  examId: uuid('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  totalMarks: numeric('total_marks', { precision: 8, scale: 2 }).default('0'),
  percentage: numeric('percentage', { precision: 5, scale: 2 }),
  grade: varchar('grade', { length: 5 }),
  rank: integer('rank'),
  resultStatus: varchar('result_status', { length: 20 }).default('pass'),
  isPromoted: boolean('is_promoted'),
  remarks: text('remarks'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  examStudentUnique: uniqueIndex('exam_results_exam_id_student_id_key').on(table.examId, table.studentId),
  examIdx: index('idx_exam_results_exam').on(table.examId),
  studentIdx: index('idx_exam_results_student').on(table.studentId),
  rankIdx: index('idx_exam_results_rank').on(table.examId, table.rank),
}));
