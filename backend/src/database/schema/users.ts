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
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './tenants';
import { branches } from './branches';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, {
      onDelete: 'cascade',
    }),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 20 }),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    avatarUrl: text('avatar_url'),
    gender: varchar('gender', { length: 10 }),
    dateOfBirth: date('date_of_birth'),
    address: text('address'),
    isSuperadmin: boolean('is_superadmin').default(false),
    isActive: boolean('is_active').default(true),
    status: varchar('status', { length: 20 }).default('active'),
    twoFactorEnabled: boolean('two_factor_enabled').default(false),
    twoFactorSecret: varchar('two_factor_secret', { length: 255 }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    lastLoginIp: varchar('last_login_ip', { length: 45 }),
    loginAttempts: integer('login_attempts').default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    passwordChangedAt: timestamp('password_changed_at', {
      withTimezone: true,
    }).defaultNow(),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index('idx_users_tenant').on(table.tenantId),
    emailIdx: index('idx_users_email')
      .on(table.email)
      .where(sql`deleted_at IS NULL`),
    phoneIdx: index('idx_users_phone')
      .on(table.phone)
      .where(sql`deleted_at IS NULL`),
    tenantEmailUnique: uniqueIndex('idx_users_tenant_email')
      .on(table.tenantId, table.email)
      .where(sql`tenant_id IS NOT NULL AND deleted_at IS NULL`),
    tenantPhoneUnique: uniqueIndex('idx_users_tenant_phone')
      .on(table.tenantId, table.phone)
      .where(sql`tenant_id IS NOT NULL AND deleted_at IS NULL`),
  }),
);

export const roles = pgTable(
  'roles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, {
      onDelete: 'cascade',
    }),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    description: text('description'),
    isSystem: boolean('is_system').default(false),
    hierarchyLevel: integer('hierarchy_level').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    tenantSlugUnique: uniqueIndex('roles_tenant_id_slug_key').on(
      table.tenantId,
      table.slug,
    ),
    tenantIdx: index('idx_roles_tenant').on(table.tenantId),
  }),
);

export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    module: varchar('module', { length: 100 }).notNull(),
    description: text('description'),
    isSystem: boolean('is_system').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    moduleIdx: index('idx_permissions_module').on(table.module),
  }),
);

export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    rolePermissionUnique: uniqueIndex(
      'role_permissions_role_id_permission_id_key',
    ).on(table.roleId, table.permissionId),
  }),
);

export const userRoles = pgTable(
  'user_roles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').references(() => tenants.id, {
      onDelete: 'cascade',
    }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id').references(() => branches.id, {
      onDelete: 'cascade',
    }),
    assignedBy: uuid('assigned_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    userRoleBranchUnique: uniqueIndex(
      'user_roles_user_id_role_id_branch_id_key',
    ).on(table.userId, table.roleId, table.branchId),
    userIdx: index('idx_user_roles_user').on(table.userId),
    branchIdx: index('idx_user_roles_branch').on(table.branchId),
    tenantIdx: index('idx_user_roles_tenant').on(table.tenantId),
  }),
);

export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').references(() => tenants.id, {
      onDelete: 'cascade',
    }),
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token').notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    deviceInfo: jsonb('device_info').default({}),
    deviceType: varchar('device_type', { length: 50 }),
    isActive: boolean('is_active').default(true),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    refreshExpiresAt: timestamp('refresh_expires_at', {
      withTimezone: true,
    }).notNull(),
    lastActivity: timestamp('last_activity', {
      withTimezone: true,
    }).defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    userIdx: index('idx_sessions_user').on(table.userId),
    refreshIdx: index('idx_sessions_refresh').on(table.refreshToken),
    activeIdx: index('idx_sessions_active')
      .on(table.expiresAt)
      .where(sql`is_active = TRUE`),
  }),
);

// Relations
import { sql } from 'drizzle-orm';

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  userRoles: many(userRoles),
  sessions: many(userSessions),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  tenant: one(tenants, { fields: [roles.tenantId], references: [tenants.id] }),
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(
  rolePermissions,
  ({ one }) => ({
    role: one(roles, {
      fields: [rolePermissions.roleId],
      references: [roles.id],
    }),
    permission: one(permissions, {
      fields: [rolePermissions.permissionId],
      references: [permissions.id],
    }),
  }),
);

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
  branch: one(branches, {
    fields: [userRoles.branchId],
    references: [branches.id],
  }),
  assignedByUser: one(users, {
    fields: [userRoles.assignedBy],
    references: [users.id],
  }),
}));
