import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';
import { branches } from './branches';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().notNull(),
    tenantId: uuid('tenant_id'),
    userId: uuid('user_id'),
    branchId: uuid('branch_id'),
    action: varchar('action', { length: 100 }).notNull(),
    module: varchar('module', { length: 100 }).notNull(),
    resourceType: varchar('resource_type', { length: 100 }),
    resourceId: uuid('resource_id'),
    description: text('description'),
    changes: jsonb('changes').default({}),
    metadata: jsonb('metadata').default({}),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    sessionId: uuid('session_id'),
    outcome: varchar('outcome', { length: 20 }).default('success'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.createdAt] }),
    tenantIdx: index('idx_audit_logs_tenant').on(table.tenantId),
    userIdx: index('idx_audit_logs_user').on(table.userId),
    actionIdx: index('idx_audit_logs_action').on(table.action),
    moduleIdx: index('idx_audit_logs_module').on(table.module),
    createdIdx: index('idx_audit_logs_created').on(table.createdAt),
    resourceIdx: index('idx_audit_logs_resource').on(
      table.resourceType,
      table.resourceId,
    ),
  }),
);
