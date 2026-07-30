import { pgTable, uuid, varchar, text, integer, decimal, date, timestamp, boolean } from 'drizzle-orm/pg-core';

export const transportVehicles = pgTable('transport_vehicles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  branchId: uuid('branch_id').notNull(),
  vehicleNumber: varchar('vehicle_number', { length: 50 }).notNull(),
  model: varchar('model', { length: 100 }),
  capacity: integer('capacity'),
  driverName: varchar('driver_name', { length: 100 }),
  driverPhone: varchar('driver_phone', { length: 20 }),
  insuranceExpiry: date('insurance_expiry'),
  isActive: boolean('is_active').default(true),
  status: varchar('status', { length: 20 }).default('active'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const transportRoutes = pgTable('transport_routes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  branchId: uuid('branch_id').notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  vehicleId: uuid('vehicle_id'),
  description: text('description'),
  distance: decimal('distance', { precision: 10, scale: 2 }),
  fare: decimal('fare', { precision: 10, scale: 2 }),
  isActive: boolean('is_active').default(true),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const transportRouteStops = pgTable('transport_route_stops', {
  id: uuid('id').primaryKey().defaultRandom(),
  routeId: uuid('route_id').notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  address: text('address'),
  latitude: varchar('latitude', { length: 50 }),
  longitude: varchar('longitude', { length: 50 }),
  stopOrder: integer('stop_order').notNull(),
  pickupTime: varchar('pickup_time', { length: 10 }),
  dropTime: varchar('drop_time', { length: 10 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const transportAssignments = pgTable('transport_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  branchId: uuid('branch_id').notNull(),
  studentId: uuid('student_id').notNull(),
  routeId: uuid('route_id').notNull(),
  stopId: uuid('stop_id'),
  academicYearId: uuid('academic_year_id'),
  effectiveFrom: date('effective_from').notNull(),
  effectiveTo: date('effective_to'),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});
