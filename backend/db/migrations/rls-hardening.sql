-- ============================================================================
-- RLS Hardening Migration
-- ============================================================================
-- Adds tenant isolation at the PostgreSQL row level as defense-in-depth
-- behind the application-level guards (RolesGuard / CurrentUser scoping).
--
-- What this file does:
--   1. Adds derived tenant_id columns to user_roles and student_parents
--      (both lack their own tenant_id in the original schema) and backfills
--      them from roles/users and students respectively.
--   2. Creates tenant-isolation RLS policies on the tables that were missing
--      them: user_roles, student_parents, subscriptions, user_sessions,
--      payroll_salary_components.
--   3. Optionally (see :enable_force below) FORCES row-level security so the
--      policies apply even to the application's superuser connection.
--   4. Verifies the audit_logs composite primary key (id, created_at).
--
-- Idempotent: safe to run multiple times.
--
-- HOW POLICIES KNOW THE TENANT
-- ----------------------------
-- Policies read two session-local GUCs set per request by the application:
--   app.tenant_id     -> uuid as text, e.g. 'a19d4dcb-1449-4620-ab51-4ff39a0d2cf6'
--   app.is_superadmin -> 'true' | 'false'
-- When unset the policies fail closed (no rows visible).
--
-- FORCE NOTE
-- ----------
-- The application connects as the dedicated erp_app role (phase10), so FORCE
-- ROW LEVEL SECURITY is required for these policies to apply — the FORCE
-- statements in section 3 are unconditional and idempotent. Roles with
-- BYPASSRLS and superusers always bypass RLS regardless.
--
-- Application wiring required BEFORE enabling :enable_force (see section 3):
--   * node-postgres pool: wrap each request in a transaction and run
--       SELECT set_config('app.tenant_id', $1, true),
--              set_config('app.is_superadmin', $2, true);
--     (is_local = true keeps the GUC scoped to that request's transaction),
--     OR connect with connection option: options: '-c app.tenant_id=<id>'
--     per client checkout (session-scoped, must be reset per request).
--   * NestJS: a small guard/interceptor that begins a transaction via
--     pg.Client or sets the GUCs on the pooled client before the query.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Derived tenant_id columns (idempotent)
-- ---------------------------------------------------------------------------

ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE student_parents ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- Backfill user_roles from roles.tenant_id (fall back to users.tenant_id for
-- any legacy row whose role has no tenant). Re-running is harmless.
UPDATE user_roles ur
SET tenant_id = COALESCE(r.tenant_id, u.tenant_id)
FROM roles r, users u
WHERE ur.role_id = r.id
  AND ur.user_id = u.id
  AND ur.tenant_id IS NULL;

-- Backfill student_parents from students (students.tenant_id is NOT NULL).
UPDATE student_parents sp
SET tenant_id = s.tenant_id
FROM students s
WHERE s.id = sp.student_id
  AND sp.tenant_id IS NULL;

-- Sanity check: every non-superadmin user_roles row must have a tenant.
DO $$
DECLARE orphan_count int;
BEGIN
  SELECT count(*) INTO orphan_count
  FROM user_roles ur
  LEFT JOIN users u ON u.id = ur.user_id
  WHERE ur.tenant_id IS NULL
    AND (u.is_superadmin IS NOT TRUE OR u.is_superadmin IS NULL);
  IF orphan_count > 0 THEN
    RAISE WARNING 'RLS hardening: % user_roles rows have no resolvable tenant_id', orphan_count;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_roles_tenant ON user_roles (tenant_id);
CREATE INDEX IF NOT EXISTS idx_student_parents_tenant ON student_parents (tenant_id);

-- ---------------------------------------------------------------------------
-- 2. Tenant-isolation policies
-- ---------------------------------------------------------------------------

-- Helper expressions
--   app_tenant:      NULL-safe uuid GUC, fails closed when unset
--   app_superadmin:  true only when app.is_superadmin = 'true'

-- user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON user_roles;
CREATE POLICY tenant_isolation ON user_roles
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR (tenant_id IS NULL AND current_setting('app.is_superadmin', true) = 'true')
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR (tenant_id IS NULL AND current_setting('app.is_superadmin', true) = 'true')
  );

-- student_parents
ALTER TABLE student_parents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON student_parents;
CREATE POLICY tenant_isolation ON student_parents
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR (tenant_id IS NULL AND current_setting('app.is_superadmin', true) = 'true')
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR (tenant_id IS NULL AND current_setting('app.is_superadmin', true) = 'true')
  );

-- subscriptions (tenant_id NOT NULL)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON subscriptions;
CREATE POLICY tenant_isolation ON subscriptions
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.is_superadmin', true) = 'true'
  );

-- user_sessions (tenant_id NULL for superadmin sessions)
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON user_sessions;
CREATE POLICY tenant_isolation ON user_sessions
  USING (
    (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
     AND tenant_id IS NOT NULL)
    OR (tenant_id IS NULL AND current_setting('app.is_superadmin', true) = 'true')
  );

-- payroll_salary_components (tenant_id NOT NULL)
ALTER TABLE payroll_salary_components ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON payroll_salary_components;
CREATE POLICY tenant_isolation ON payroll_salary_components
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.is_superadmin', true) = 'true'
  );

-- ---------------------------------------------------------------------------
-- 3. FORCE RLS (mandatory)
-- ---------------------------------------------------------------------------
-- The application connects as the dedicated erp_app role and sets the
-- app.tenant_id / app.is_superadmin GUCs per request (TenantContextInterceptor),
-- so FORCE is required — without it RLS is bypassed. This was historically
-- opt-in (psql -v enable_force=true); phase10 made it the standard, so these
-- are now unconditional. Idempotent: re-running on already-forced tables is
-- a no-op.
ALTER TABLE user_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE student_parents FORCE ROW LEVEL SECURITY;
ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE user_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE payroll_salary_components FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. audit_logs partition primary key verification
-- ---------------------------------------------------------------------------
-- audit_logs is append-heavy; the composite PK (id, created_at) allows the
-- table to be partitioned by created_at later without rebuilding the PK.
DO $$
DECLARE pk_columns text;
BEGIN
  SELECT string_agg(att.attname, ',' ORDER BY arr.ord) INTO pk_columns
  FROM pg_index idx
  CROSS JOIN LATERAL unnest(idx.indkey::int2[]) WITH ORDINALITY AS arr(attnum, ord)
  JOIN pg_attribute att
    ON att.attrelid = idx.indrelid AND att.attnum = arr.attnum
  WHERE idx.indrelid = 'audit_logs'::regclass
    AND idx.indisprimary;

  IF pk_columns IS DISTINCT FROM 'id,created_at' THEN
    RAISE WARNING
      'audit_logs primary key is (%); expected (id,created_at). Fix with: '
      'ALTER TABLE audit_logs DROP CONSTRAINT audit_logs_pkey; '
      'ALTER TABLE audit_logs ADD PRIMARY KEY (id, created_at);',
      pk_columns;
  END IF;
END $$;
