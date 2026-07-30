import { pgTable, uuid, varchar, text, integer, boolean, time, timestamp, date, numeric, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { branches } from './branches';
import { students } from './students';
import { staff } from './staff';
import { classes, sections, subjects } from './academic';
import { timetableEntries } from './timetable';

export const attendance = pgTable('attendance', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  classId: uuid('class_id').references(() => classes.id),
  sectionId: uuid('section_id').references(() => sections.id),
  subjectId: uuid('subject_id').references(() => subjects.id),
  teacherId: uuid('teacher_id').references(() => staff.id),
  timetableEntryId: uuid('timetable_entry_id').references(() => timetableEntries.id),
  date: date('date').notNull(),
  startTime: time('start_time'),
  endTime: time('end_time'),
  totalPresent: integer('total_present').default(0),
  totalAbsent: integer('total_absent').default(0),
  totalStudents: integer('total_students').default(0),
  remarks: text('remarks'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniquePerTimetableEntryDate: uniqueIndex('attendance_timetable_entry_date_key').on(table.timetableEntryId, table.date),
  uniquePerClassDate: uniqueIndex('attendance_class_date_key').on(table.tenantId, table.branchId, table.classId, table.sectionId, table.date),
  branchIdx: index('idx_attendance_branch').on(table.branchId),
  dateIdx: index('idx_attendance_date').on(table.date),
  classDateIdx: index('idx_attendance_class_date').on(table.classId, table.date),
}));

export const attendanceRecords = pgTable('attendance_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  attendanceId: uuid('attendance_id').notNull().references(() => attendance.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull().default('present'),
  checkInTime: time('check_in_time'),
  checkOutTime: time('check_out_time'),
  remarks: text('remarks'),
  markedBy: uuid('marked_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  attendanceStudentUnique: uniqueIndex('attendance_records_attendance_id_student_id_key').on(table.attendanceId, table.studentId),
  attendanceIdx: index('idx_attendance_records_attendance').on(table.attendanceId),
  studentIdx: index('idx_attendance_records_student').on(table.studentId),
  branchDateIdx: index('idx_attendance_records_branch_date').on(table.branchId, table.attendanceId),
}));

export const staffAttendance = pgTable('staff_attendance', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  staffId: uuid('staff_id').notNull().references(() => staff.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  checkIn: timestamp('check_in', { withTimezone: true }),
  checkOut: timestamp('check_out', { withTimezone: true }),
  status: varchar('status', { length: 10 }).default('present'),
  hoursWorked: numeric('hours_worked', { precision: 4, scale: 1 }),
  overtimeHours: numeric('overtime_hours', { precision: 4, scale: 1 }),
  remarks: text('remarks'),
  markedBy: uuid('marked_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniquePerStaffDay: uniqueIndex('staff_attendance_tenant_id_branch_id_staff_id_date_key').on(table.tenantId, table.branchId, table.staffId, table.date),
  staffIdx: index('idx_staff_attendance_staff').on(table.staffId),
  dateIdx: index('idx_staff_attendance_date').on(table.date),
}));
