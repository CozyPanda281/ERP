import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const tenantSettings = pgTable('tenant_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  settingKey: varchar('setting_key', { length: 255 }).notNull(),
  settingValue: jsonb('setting_value').notNull().default({}),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantKeyUnique: uniqueIndex('tenant_settings_tenant_id_setting_key_key').on(table.tenantId, table.settingKey),
}));

export const brandingSettings = pgTable('branding_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  primaryColor: varchar('primary_color', { length: 7 }).default('#2563eb'),
  secondaryColor: varchar('secondary_color', { length: 7 }).default('#1e40af'),
  accentColor: varchar('accent_color', { length: 7 }).default('#f59e0b'),
  logoUrl: text('logo_url'),
  faviconUrl: text('favicon_url'),
  loginBgUrl: text('login_bg_url'),
  loginPageText: varchar('login_page_text', { length: 255 }),
  footerText: text('footer_text'),
  customDomain: varchar('custom_domain', { length: 255 }),
  customCss: text('custom_css'),
  isWhiteLabel: boolean('is_white_label').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantUnique: uniqueIndex('branding_settings_tenant_id_key').on(table.tenantId),
}));

export const systemConfig = pgTable('system_config', {
  id: uuid('id').defaultRandom().primaryKey(),
  configKey: varchar('config_key', { length: 255 }).notNull().unique(),
  configValue: jsonb('config_value').notNull().default({}),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
