import { pgTable, uuid, varchar, text, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { plans } from './tenants';

export const featureFlags = pgTable('feature_flags', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  module: varchar('module', { length: 100 }).notNull(),
  isSystem: boolean('is_system').default(false),
  defaultValue: boolean('default_value').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const planFeatures = pgTable('plan_features', {
  id: uuid('id').defaultRandom().primaryKey(),
  planId: uuid('plan_id').notNull().references(() => plans.id, { onDelete: 'cascade' }),
  featureFlagId: uuid('feature_flag_id').notNull().references(() => featureFlags.id, { onDelete: 'cascade' }),
  isEnabled: boolean('is_enabled').default(false),
  featureValue: varchar('feature_value', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  planFeatureUnique: uniqueIndex('plan_features_plan_id_feature_flag_id_key').on(table.planId, table.featureFlagId),
}));

export const tenantFeatures = pgTable('tenant_features', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  featureFlagId: uuid('feature_flag_id').notNull().references(() => featureFlags.id, { onDelete: 'cascade' }),
  isEnabled: boolean('is_enabled').default(false),
  featureValue: varchar('feature_value', { length: 255 }),
  overridePlan: boolean('override_plan').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantFeatureUnique: uniqueIndex('tenant_features_tenant_id_feature_flag_id_key').on(table.tenantId, table.featureFlagId),
}));
