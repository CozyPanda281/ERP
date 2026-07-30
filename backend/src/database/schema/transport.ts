import { pgTable, uuid, varchar, text, integer, boolean, time, timestamp, date, numeric, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { branches } from './branches';
import { students } from './students';
import { academicYears } from './academic';

export const vehicles = pgTable('vehicles', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  vehicleNumber: varchar('vehicle_number', { length: 50 }).notNull(),
  vehicleType: varchar('vehicle_type', { length: 20 }).default('bus'),
  capacity: integer('capacity').notNull(),
  model: varchar('model', { length: 100 }),
  manufacturer: varchar('manufacturer', { length: 100 }),
  manufactureYear: integer('manufacture_year'),
  chassisNumber: varchar('chassis_number', { length: 100 }),
  engineNumber: varchar('engine_number', { length: 100 }),
  insuranceProvider: varchar('insurance_provider', { length: 255 }),
  insuranceExpiry: date('insurance_expiry'),
  fitnessExpiry: date('fitness_expiry'),
  pollutionExpiry: date('pollution_expiry'),
  status: varchar('status', { length: 50 }).default('active'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  tenantBranchVehicleNoUnique: uniqueIndex('vehicles_tenant_id_branch_id_vehicle_number_key').on(table.tenantId, table.branchId, table.vehicleNumber),
  branchIdx: index('idx_vehicles_branch').on(table.branchId),
}));

export const drivers = pgTable('drivers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  alternatePhone: varchar('alternate_phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  licenseNumber: varchar('license_number', { length: 50 }).notNull(),
  licenseExpiry: date('license_expiry'),
  address: text('address'),
  dateOfBirth: date('date_of_birth'),
  joiningDate: date('joining_date'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantBranchLicenseUnique: uniqueIndex('drivers_tenant_id_branch_id_license_number_key').on(table.tenantId, table.branchId, table.licenseNumber),
}));

export const routes = pgTable('routes', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  distanceKm: numeric('distance_km', { precision: 8, scale: 2 }),
  vehicleId: uuid('vehicle_id').references(() => vehicles.id),
  driverId: uuid('driver_id').references(() => drivers.id),
  status: varchar('status', { length: 50 }).default('active'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantBranchNameUnique: uniqueIndex('routes_tenant_id_branch_id_name_key').on(table.tenantId, table.branchId, table.name),
  branchIdx: index('idx_routes_branch').on(table.branchId),
}));

export const routeStops = pgTable('route_stops', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  routeId: uuid('route_id').notNull().references(() => routes.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address'),
  latitude: numeric('latitude', { precision: 10, scale: 7 }),
  longitude: numeric('longitude', { precision: 10, scale: 7 }),
  stopOrder: integer('stop_order').notNull(),
  pickupTime: time('pickup_time'),
  dropTime: time('drop_time'),
  fee: numeric('fee', { precision: 10, scale: 2 }).default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  routeIdx: index('idx_route_stops_route').on(table.routeId),
}));

export const studentTransport = pgTable('student_transport', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  routeId: uuid('route_id').notNull().references(() => routes.id),
  stopId: uuid('stop_id').notNull().references(() => routeStops.id),
  fee: numeric('fee', { precision: 10, scale: 2 }).default('0'),
  pickupPoint: text('pickup_point'),
  dropPoint: text('drop_point'),
  academicYearId: uuid('academic_year_id').references(() => academicYears.id),
  status: varchar('status', { length: 50 }).default('active'),
  effectiveFrom: date('effective_from'),
  effectiveUntil: date('effective_until'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  studentYearUnique: uniqueIndex('student_transport_student_id_academic_year_id_key').on(table.studentId, table.academicYearId),
  studentIdx: index('idx_student_transport_student').on(table.studentId),
  routeIdx: index('idx_student_transport_route').on(table.routeId),
}));

export const transportFuelLogs = pgTable('transport_fuel_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  fuelDate: date('fuel_date').notNull(),
  fuelType: varchar('fuel_type', { length: 50 }),
  quantityLiters: numeric('quantity_liters', { precision: 8, scale: 2 }).notNull().default('0'),
  costPerLiter: numeric('cost_per_liter', { precision: 8, scale: 2 }),
  totalCost: numeric('total_cost', { precision: 10, scale: 2 }),
  odometerReading: integer('odometer_reading'),
  vendorName: varchar('vendor_name', { length: 255 }),
  billNumber: varchar('bill_number', { length: 100 }),
  billUrl: text('bill_url'),
  remarks: text('remarks'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  vehicleIdx: index('idx_fuel_logs_vehicle').on(table.vehicleId),
}));

export const transportMaintenance = pgTable('transport_maintenance', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  maintenanceType: varchar('maintenance_type', { length: 100 }).notNull(),
  description: text('description'),
  serviceDate: date('service_date').notNull(),
  cost: numeric('cost', { precision: 10, scale: 2 }),
  serviceCenter: varchar('service_center', { length: 255 }),
  billNumber: varchar('bill_number', { length: 100 }),
  billUrl: text('bill_url'),
  nextServiceDate: date('next_service_date'),
  odometerReading: integer('odometer_reading'),
  remarks: text('remarks'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  vehicleIdx: index('idx_transport_maintenance_vehicle').on(table.vehicleId),
}));
