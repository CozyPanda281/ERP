-- ============================================================================
-- RLS Full Tenancy Migration
-- ============================================================================
-- Extends row-level security to every tenant-scoped table. Complements
-- rls-hardening.sql (user_roles, student_parents, subscriptions,
-- user_sessions, payroll_salary_components).
--
-- What this file does:
--   1. Enables RLS + a tenant_isolation policy on every table that has a
--      NOT NULL tenant_id column (dynamic loop over pg_class — stays correct
--      as the schema evolves).
--   2. Adds policies for nullable-tenant tables (users, roles,
--      notification_templates, audit_logs) using the user_sessions pattern:
--      tenant rows visible to the tenant, NULL-tenant rows to superadmins.
--   3. Leaves platform tables with no tenant_id untouched (documented below).
--
-- HOW POLICIES KNOW THE TENANT
-- ----------------------------
-- Policies read two session-local GUCs set per request by the application:
--   app.tenant_id     -> uuid as text
--   app.is_superadmin -> 'true' | 'false'
-- When unset the policies fail closed (no rows visible).
--
-- NOTE ON SUPERUSER / FORCE
-- -------------------------
-- The application connects as a superuser, which bypasses RLS unless FORCE
-- ROW LEVEL SECURITY is enabled. Enabling FORCE requires the application to
-- set the GUCs per request (transaction-scoped set_config) FIRST. Until then
-- these policies protect any future low-privileged role (reports, analytics,
-- read replicas) and are a pre-requisite for turning FORCE on later.
-- To force, run the FORCE section at the end of this file (see below).
--
-- KNOWN GAP
-- ---------
-- These tables have NO tenant_id column and get no policy:
--   accounting_journal_entry_items (derivable from journal_entries)
--   hostel_rooms (derivable from hostels)
--   inventory_goods_receipt_items / inventory_purchase_order_items
--   transport_route_stops (derivable from routes)
--   feature_flags, permissions, plan_features, plans, role_permissions,
--   system_config, tenants (platform tables)
-- A future schema normalization migration should add derived tenant_id to
-- the six entity tables above.
--
-- Idempotent: safe to run multiple times.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tenant-scoped tables (tenant_id NOT NULL): generic tenant_isolation policy
-- ---------------------------------------------------------------------------

DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'tenant_id'
    WHERE c.relkind = 'r'
      AND n.nspname = 'public'
      AND c.relname NOT LIKE 'pg_%'
      AND a.attnotnull
      -- already covered by rls-hardening.sql or handled in section 2
      AND c.relname NOT IN (
        'payroll_salary_components', 'subscriptions',
        'user_roles', 'student_parents', 'user_sessions',
        'users', 'roles', 'notification_templates', 'audit_logs'
      )
    ORDER BY c.relname
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      $f$CREATE POLICY tenant_isolation ON %I
         USING (
           tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
           OR current_setting('app.is_superadmin', true) = 'true'
         )
         WITH CHECK (
           tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
           OR current_setting('app.is_superadmin', true) = 'true'
         )$f$,
      t
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Nullable-tenant tables: tenant rows for tenant, NULL rows for superadmin
-- ---------------------------------------------------------------------------

-- users (superadmin users have NULL tenant_id)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON users;
CREATE POLICY tenant_isolation ON users
  USING (
    (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
     AND tenant_id IS NOT NULL)
    OR (tenant_id IS NULL AND current_setting('app.is_superadmin', true) = 'true')
  )
  WITH CHECK (
    (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
     AND tenant_id IS NOT NULL)
    OR (tenant_id IS NULL AND current_setting('app.is_superadmin', true) = 'true')
  );

-- roles (global platform roles have NULL tenant_id)
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON roles;
CREATE POLICY tenant_isolation ON roles
  USING (
    (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
     AND tenant_id IS NOT NULL)
    OR (tenant_id IS NULL AND current_setting('app.is_superadmin', true) = 'true')
  );

-- notification_templates
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON notification_templates;
CREATE POLICY tenant_isolation ON notification_templates
  USING (
    (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
     AND tenant_id IS NOT NULL)
    OR (tenant_id IS NULL AND current_setting('app.is_superadmin', true) = 'true')
  );

-- audit_logs (system-level entries have NULL tenant_id)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON audit_logs;
CREATE POLICY tenant_isolation ON audit_logs
  USING (
    (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
     AND tenant_id IS NOT NULL)
    OR (tenant_id IS NULL AND current_setting('app.is_superadmin', true) = 'true')
  );

-- ---------------------------------------------------------------------------
-- 3. FORCE ROW LEVEL SECURITY (OPT-IN — DO NOT ENABLE YET)
-- ---------------------------------------------------------------------------
-- The app connects as a superuser and does NOT yet set app.tenant_id /
-- app.is_superadmin per request, so forcing would lock the application out.
-- Once per-request GUC wiring lands (see header), enable with:
--   ALTER TABLE <t> FORCE ROW LEVEL SECURITY;  -- for every table above
-- Or run the dynamic equivalent:
--   DO $$
--   DECLARE t text;
--   BEGIN
--     FOR t IN
--       SELECT c.relname FROM pg_class c
--       JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'tenant_id'
--       WHERE c.relkind = 'r' AND c.relname NOT LIKE 'pg_%'
--     LOOP
--       EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
--     END LOOP;
--   END $$;
-- ============================================================================
