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
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { branches } from './branches';
import { planFeatures } from './feature-flags';

export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 20 }),
    address: text('address'),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 100 }),
    pincode: varchar('pincode', { length: 10 }),
    country: varchar('country', { length: 100 }).default('India'),
    logoUrl: text('logo_url'),
    status: varchar('status', { length: 20 }).default('trial'),
    maxBranches: integer('max_branches').default(1),
    maxUsers: integer('max_users').default(50),
    maxStudents: integer('max_students').default(500),
    maxStaff: integer('max_staff').default(50),
    storageLimitMb: integer('storage_limit_mb').default(500),
    isActive: boolean('is_active').default(true),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    slugIdx: index('idx_tenants_slug')
      .on(table.slug)
      .where(sql`deleted_at IS NULL`),
    statusIdx: index('idx_tenants_status').on(table.status),
  }),
);

export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  description: text('description'),
  priceMonthly: numeric('price_monthly', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  priceYearly: numeric('price_yearly', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  maxBranches: integer('max_branches').default(1),
  maxUsers: integer('max_users').default(50),
  maxStudents: integer('max_students').default(500),
  maxStaff: integer('max_staff').default(50),
  storageLimitMb: integer('storage_limit_mb').default(500),
  features: jsonb('features').default({}),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    billingCycle: varchar('billing_cycle', { length: 20 }).default('monthly'),
    status: varchar('status', { length: 20 }).default('trial'),
    autoRenew: boolean('auto_renew').default(true),
    trialEndsAt: date('trial_ends_at'),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    tenantIdx: index('idx_subscriptions_tenant').on(table.tenantId),
    statusIdx: index('idx_subscriptions_status').on(table.status),
    activeEndDateIdx: index('idx_subscriptions_end_date')
      .on(table.endDate)
      .where(sql`status = 'active'`),
  }),
);

export const tenantsRelations = relations(tenants, ({ many }) => ({
  subscriptions: many(subscriptions),
  branches: many(branches),
}));

export const plansRelations = relations(plans, ({ many }) => ({
  subscriptions: many(subscriptions),
  planFeatures: many(planFeatures),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [subscriptions.tenantId],
    references: [tenants.id],
  }),
  plan: one(plans, { fields: [subscriptions.planId], references: [plans.id] }),
}));
