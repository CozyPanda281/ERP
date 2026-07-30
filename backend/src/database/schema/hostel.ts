import { pgTable, uuid, varchar, text, integer, boolean, jsonb, timestamp, date, numeric, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { branches } from './branches';
import { students } from './students';
import { academicYears } from './academic';

export const hostelRooms = pgTable('hostel_rooms', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  roomNumber: varchar('room_number', { length: 50 }).notNull(),
  floor: varchar('floor', { length: 50 }),
  building: varchar('building', { length: 100 }),
  roomType: varchar('room_type', { length: 20 }).default('shared'),
  capacity: integer('capacity').notNull(),
  currentOccupancy: integer('current_occupancy').default(0),
  feePerBed: numeric('fee_per_bed', { precision: 10, scale: 2 }).default('0'),
  amenities: jsonb('amenities').default([]),
  status: varchar('status', { length: 50 }).default('available'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantBranchRoomNoUnique: uniqueIndex('hostel_rooms_tenant_id_branch_id_room_number_key').on(table.tenantId, table.branchId, table.roomNumber),
  branchIdx: index('idx_hostel_rooms_branch').on(table.branchId),
  statusIdx: index('idx_hostel_rooms_status').on(table.status),
}));

export const hostelBeds = pgTable('hostel_beds', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  roomId: uuid('room_id').notNull().references(() => hostelRooms.id, { onDelete: 'cascade' }),
  bedNumber: varchar('bed_number', { length: 50 }).notNull(),
  isOccupied: boolean('is_occupied').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  roomBedUnique: uniqueIndex('hostel_beds_room_id_bed_number_key').on(table.roomId, table.bedNumber),
  roomIdx: index('idx_hostel_beds_room').on(table.roomId),
}));

export const studentHostel = pgTable('student_hostel', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  roomId: uuid('room_id').notNull().references(() => hostelRooms.id),
  bedId: uuid('bed_id').notNull().references(() => hostelBeds.id),
  checkInDate: date('check_in_date').notNull(),
  checkOutDate: date('check_out_date'),
  fee: numeric('fee', { precision: 10, scale: 2 }).default('0'),
  academicYearId: uuid('academic_year_id').references(() => academicYears.id),
  status: varchar('status', { length: 50 }).default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  studentIdx: index('idx_student_hostel_student').on(table.studentId),
  roomIdx: index('idx_student_hostel_room').on(table.roomId),
}));

export const hostelComplaints = pgTable('hostel_complaints', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  complaintType: varchar('complaint_type', { length: 100 }).notNull(),
  description: text('description').notNull(),
  priority: varchar('priority', { length: 10 }).default('medium'),
  status: varchar('status', { length: 50 }).default('open'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedBy: uuid('resolved_by'),
  resolutionNotes: text('resolution_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  studentIdx: index('idx_hostel_complaints_student').on(table.studentId),
  statusIdx: index('idx_hostel_complaints_status').on(table.status),
}));

export const hostelVisitors = pgTable('hostel_visitors', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  visitorName: varchar('visitor_name', { length: 255 }).notNull(),
  relationship: varchar('relationship', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  visitDate: date('visit_date').notNull(),
  checkInTime: timestamp('check_in_time', { withTimezone: true }),
  checkOutTime: timestamp('check_out_time', { withTimezone: true }),
  purpose: text('purpose'),
  idProof: varchar('id_proof', { length: 100 }),
  idNumber: varchar('id_number', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
