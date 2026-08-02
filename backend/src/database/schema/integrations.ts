import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    keyPrefix: varchar('key_prefix', { length: 20 }).notNull(),
    keyHash: varchar('key_hash', { length: 255 }).notNull(),
    scopes: text('scopes').default('read'),
    rateLimitPerMinute: integer('rate_limit_per_minute').default(60),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index('idx_api_keys_tenant').on(table.tenantId),
    hashIdx: index('idx_api_keys_hash').on(table.keyHash),
  }),
);

export const webhookEndpoints = pgTable(
  'webhook_endpoints',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    url: text('url').notNull(),
    secret: varchar('secret', { length: 255 }).notNull(),
    events: text('events').notNull().default('*'),
    description: text('description'),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index('idx_webhook_endpoints_tenant').on(table.tenantId),
  }),
);

export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    webhookEndpointId: uuid('webhook_endpoint_id')
      .notNull()
      .references(() => webhookEndpoints.id, { onDelete: 'cascade' }),
    event: varchar('event', { length: 100 }).notNull(),
    payload: text('payload'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    attempts: integer('attempts').default(0),
    maxAttempts: integer('max_attempts').default(3),
    responseStatus: integer('response_status'),
    responseBody: text('response_body'),
    error: text('error'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    tenantIdx: index('idx_webhook_deliveries_tenant').on(table.tenantId),
    endpointIdx: index('idx_webhook_deliveries_endpoint').on(
      table.webhookEndpointId,
    ),
    statusIdx: index('idx_webhook_deliveries_status').on(table.status),
    createdIdx: index('idx_webhook_deliveries_created').on(table.createdAt),
  }),
);
