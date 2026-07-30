import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, date, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { branches } from './branches';

export const notificationTemplates = pgTable('notification_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 100 }).notNull(),
  type: varchar('type', { length: 10 }).notNull(),
  subject: varchar('subject', { length: 255 }),
  body: text('body').notNull(),
  variables: jsonb('variables').default([]),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantCodeUnique: uniqueIndex('notification_templates_tenant_id_code_key').on(table.tenantId, table.code),
}));

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').references(() => branches.id),
  senderId: uuid('sender_id'),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  type: varchar('type', { length: 10 }).default('in_app'),
  priority: varchar('priority', { length: 10 }).default('low'),
  targetRoles: jsonb('target_roles').default([]),
  targetUsers: jsonb('target_users').default([]),
  metadata: jsonb('metadata').default({}),
  allowDismiss: boolean('allow_dismiss').default(true),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdx: index('idx_notifications_tenant').on(table.tenantId),
  typeIdx: index('idx_notifications_type').on(table.type),
  createdIdx: index('idx_notifications_created').on(table.createdAt),
}));

export const notificationLogs = pgTable('notification_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  notificationId: uuid('notification_id').notNull().references(() => notifications.id, { onDelete: 'cascade' }),
  recipientId: uuid('recipient_id').notNull(),
  recipientType: varchar('recipient_type', { length: 50 }).notNull(),
  channel: varchar('channel', { length: 10 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  readAt: timestamp('read_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  notificationIdx: index('idx_notification_logs_notification').on(table.notificationId),
  recipientIdx: index('idx_notification_logs_recipient').on(table.recipientId),
  statusIdx: index('idx_notification_logs_status').on(table.status),
}));

export const announcements = pgTable('announcements', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  targetRoles: jsonb('target_roles').default([]),
  targetClasses: jsonb('target_classes').default([]),
  attachmentUrls: jsonb('attachment_urls').default([]),
  priority: varchar('priority', { length: 10 }).default('low'),
  isPinned: boolean('is_pinned').default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  branchIdx: index('idx_announcements_branch').on(table.branchId),
  publishedIdx: index('idx_announcements_published').on(table.publishedAt),
}));

export const circulars = pgTable('circulars', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'cascade' }),
  circularNumber: varchar('circular_number', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  targetRoles: jsonb('target_roles').default([]),
  attachmentUrls: jsonb('attachment_urls').default([]),
  issueDate: date('issue_date').notNull(),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantBranchCircularNoUnique: uniqueIndex('circulars_tenant_id_branch_id_circular_number_key').on(table.tenantId, table.branchId, table.circularNumber),
}));
