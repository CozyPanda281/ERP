-- ============================================================================
-- Phase 11: Multi-Factor Authentication (TOTP) support
--
-- * two_factor_recovery_codes: bcrypt-hashed one-time recovery codes shown to
--   the user once at enable time. RLS FOREED, tenant-isolated like every other
--   tenant table (superadmin rows are allowed via app.is_superadmin).
-- * users.two_factor_enabled / users.two_factor_secret already exist
--   (schema-only until now). The secret is stored AES-256-GCM encrypted via
--   the app's CryptoService, never in plaintext.
--
-- Idempotent: safe to run multiple times.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Recovery codes table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS two_factor_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash varchar(255) NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_2fa_codes_user ON two_factor_recovery_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_2fa_codes_tenant ON two_factor_recovery_codes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_2fa_codes_tenant_user_used
  ON two_factor_recovery_codes(tenant_id, user_id, used_at);

-- ---------------------------------------------------------------------------
-- 2. RLS (tenant isolation, FORCEd)
-- ---------------------------------------------------------------------------
ALTER TABLE two_factor_recovery_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON two_factor_recovery_codes;
CREATE POLICY tenant_isolation ON two_factor_recovery_codes
  USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_superadmin', true) = 'true'
  )
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR current_setting('app.is_superadmin', true) = 'true'
  );

-- Pre-auth completion of the 2FA login challenge carries only a signed mfa
-- token (no tenant GUC yet), exactly like /auth/login for user_sessions.
DROP POLICY IF EXISTS auth_lookup ON two_factor_recovery_codes;
CREATE POLICY auth_lookup ON two_factor_recovery_codes
  USING (current_setting('app.allow_auth_lookup', true) = 'true')
  WITH CHECK (current_setting('app.allow_auth_lookup', true) = 'true');

ALTER TABLE two_factor_recovery_codes FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. erp_app privileges (idempotent; ALTER DEFAULT PRIVILEGES already covers
--    tables created later, but be explicit anyway)
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON two_factor_recovery_codes TO erp_app;