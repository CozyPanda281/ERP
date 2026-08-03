import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { branches } from './branches';
import { users } from './users';

export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    durationMinutes: integer('duration_minutes').default(30),
    location: varchar('location', { length: 200 }),
    mode: varchar('mode', { length: 20 }).default('in_person'),
    requestedBy: uuid('requested_by')
      .notNull()
      .references(() => users.id),
    requestedByRole: varchar('requested_by_role', { length: 50 }).notNull(),
    requestedByName: varchar('requested_by_name', { length: 255 }).notNull(),
    participants: jsonb('participants').default([]),
    status: varchar('status', { length: 20 }).default('pending'),
    cancelledReason: text('cancelled_reason'),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantBranchIdx: index('idx_appointments_tenant_branch').on(
      table.tenantId,
      table.branchId,
    ),
    requestedByIdx: index('idx_appointments_requested_by').on(
      table.requestedBy,
    ),
    scheduledAtIdx: index('idx_appointments_scheduled_at').on(table.scheduledAt),
    statusIdx: index('idx_appointments_status').on(table.status),
  }),
);
