import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  jsonb,
  timestamp,
  date,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { branches } from './branches';

export const idCardTemplates = pgTable('id_card_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  templateType: varchar('template_type', { length: 50 }).notNull(),
  designConfig: jsonb('design_config').notNull().default({}),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const certificateTemplates = pgTable('certificate_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id')
    .notNull()
    .references(() => branches.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  certificateType: varchar('certificate_type', { length: 100 }).notNull(),
  designConfig: jsonb('design_config').notNull().default({}),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const certificates = pgTable(
  'certificates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    certificateNumber: varchar('certificate_number', { length: 50 }).notNull(),
    templateId: uuid('template_id').references(() => certificateTemplates.id),
    recipientType: varchar('recipient_type', { length: 50 }).notNull(),
    recipientId: uuid('recipient_id').notNull(),
    issuedDate: date('issued_date').notNull(),
    issueReason: text('issue_reason'),
    certificateUrl: text('certificate_url'),
    signedBy: uuid('signed_by'),
    status: varchar('status', { length: 50 }).default('draft'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    tenantBranchCertNoUnique: uniqueIndex(
      'certificates_tenant_id_branch_id_certificate_number_key',
    ).on(table.tenantId, table.branchId, table.certificateNumber),
  }),
);
