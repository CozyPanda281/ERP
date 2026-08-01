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

export const importBatches = pgTable(
  'import_batches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id').references(() => branches.id),
    entityType: varchar('entity_type', { length: 100 }).notNull(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    fileType: varchar('file_type', { length: 50 }).notNull(),
    originalFileName: text('original_file_name'),
    fileSize: integer('file_size'),
    totalRows: integer('total_rows').default(0),
    validRows: integer('valid_rows').default(0),
    errorRows: integer('error_rows').default(0),
    status: varchar('status', { length: 50 }).default('pending_review'),
    previewData: jsonb('preview_data').default([]),
    columnMapping: jsonb('column_mapping').default({}),
    validationErrors: jsonb('validation_errors').default([]),
    deployedAt: timestamp('deployed_at', { withTimezone: true }),
    deployedBy: uuid('deployed_by').references(() => users.id),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewNotes: text('review_notes'),
    rejectionReason: text('rejection_reason'),
    rollbackData: jsonb('rollback_data').default([]),
    metadata: jsonb('metadata').default({}),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    tenantEntityIdx: index('idx_import_batches_tenant_entity').on(
      table.tenantId,
      table.entityType,
    ),
    statusIdx: index('idx_import_batches_status').on(table.status),
  }),
);
