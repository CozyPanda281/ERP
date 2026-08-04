-- ============================================================================
-- Phase 10: RLS FORCE + dedicated application role
-- ============================================================================
-- Turns row-level security into an enforced control for the application.
-- Previously the app connected as a superuser (postgres), which bypasses RLS
-- unconditionally. This migration:
--
--   1. Creates a dedicated non-superuser application role (erp_app) with
--      table-level CRUD (current + default privileges so drizzle migrations
--      keep working).
--   2. Adds auth_lookup policies so pre-auth flows still work: login, token
--      refresh, forgot/reset password and their audit writes all run with NO
--      tenant context. They are gated on app.allow_auth_lookup='true', which
--      the TenantContextInterceptor sets ONLY on the four public auth routes.
--   3. FORCES row level security on every table that has an RLS policy.
--
-- Superusers keep working (RLS never applies to them); all application
-- traffic must now go through erp_app.
--
-- Tables WITHOUT policies (no tenant_id, platform tables) are deliberately
-- NOT forced: six derivable tables (accounting_journal_entry_items,
-- hostel_rooms, inventory_goods_receipt_items,
-- inventory_purchase_order_items, transport_route_stops) and platform tables
-- (tenants, plans, permissions, role_permissions, plan_features,
-- feature_flags, system_config). They remain app-layer guarded; a future
-- schema normalization migration adds tenant_id and policies for the six.
--
-- DEV NOTE: erp_app's password is set here for local development. Production
-- deployments must ALTER ROLE erp_app PASSWORD from a secret manager.
--
-- Idempotent: safe to run multiple times.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Application role
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'erp_app') THEN
    CREATE ROLE erp_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END $$;
-- Password comes from psql -v erp_app_password=... in production (secret
-- manager); falls back to the documented dev password otherwise.
\if :{?erp_app_password}
ALTER ROLE erp_app LOGIN PASSWORD :'erp_app_password';
\else
ALTER ROLE erp_app LOGIN PASSWORD 'erp_app_dev_pw';
\endif

-- ---------------------------------------------------------------------------
-- 2. Privileges (current + future tables/sequences from drizzle migrations)
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO erp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO erp_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO erp_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO erp_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO erp_app;

-- ---------------------------------------------------------------------------
-- 3. auth_lookup policies (pre-auth flows with no tenant context)
-- ---------------------------------------------------------------------------
-- users: login / forgot-password / reset-password look up by email and
-- reset-password updates the hash. All other access stays tenant-scoped.
DROP POLICY IF EXISTS auth_lookup ON users;
CREATE POLICY auth_lookup ON users
  USING (current_setting('app.allow_auth_lookup', true) = 'true')
  WITH CHECK (current_setting('app.allow_auth_lookup', true) = 'true');

-- roles / user_roles: read during login role assembly.
DROP POLICY IF EXISTS auth_lookup ON roles;
CREATE POLICY auth_lookup ON roles
  USING (current_setting('app.allow_auth_lookup', true) = 'true')
  WITH CHECK (current_setting('app.allow_auth_lookup', true) = 'true');

DROP POLICY IF EXISTS auth_lookup ON user_roles;
CREATE POLICY auth_lookup ON user_roles
  USING (current_setting('app.allow_auth_lookup', true) = 'true')
  WITH CHECK (current_setting('app.allow_auth_lookup', true) = 'true');

-- user_sessions: login inserts the session; refresh looks it up by token
-- hash. Refresh tokens carry the tenant but no GUC is set (no JWT user).
DROP POLICY IF EXISTS auth_lookup ON user_sessions;
CREATE POLICY auth_lookup ON user_sessions
  USING (current_setting('app.allow_auth_lookup', true) = 'true')
  WITH CHECK (current_setting('app.allow_auth_lookup', true) = 'true');

-- audit_logs: login success/failure entries are written before any tenant
-- context exists (NULL tenant_id rows).
DROP POLICY IF EXISTS auth_lookup ON audit_logs;
CREATE POLICY auth_lookup ON audit_logs
  USING (current_setting('app.allow_auth_lookup', true) = 'true')
  WITH CHECK (current_setting('app.allow_auth_lookup', true) = 'true');

-- api_keys: ApiKeyGuard looks up the key by hash before the tenant interceptor
-- runs (and before the key's tenant is known). The guard sets
-- app.allow_api_key_lookup for that single lookup, then pins the key's tenant
-- and clears the flag.
DROP POLICY IF EXISTS api_key_lookup ON api_keys;
CREATE POLICY api_key_lookup ON api_keys
  USING (current_setting('app.allow_api_key_lookup', true) = 'true');

-- ---------------------------------------------------------------------------
-- 4. FORCE ROW LEVEL SECURITY on every policy-bearing table
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname = 'public'
      AND c.relname NOT LIKE 'pg_%'
      AND EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public' AND p.tablename = c.relname
      )
    ORDER BY c.relname
  LOOP
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
