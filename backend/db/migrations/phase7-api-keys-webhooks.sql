-- ---------------------------------------------------------------------------
-- Phase 7: Public API keys + webhook endpoints/deliveries
-- Idempotent. Apply via: node -e "...runSql(fs.readFileSync(...))" (pg pool)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  key_prefix varchar(20) NOT NULL,
  key_hash varchar(255) NOT NULL,
  scopes text NOT NULL DEFAULT 'read',
  rate_limit_per_minute integer NOT NULL DEFAULT 60,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  last_used_at timestamptz,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  url text NOT NULL,
  secret varchar(255) NOT NULL,
  events text NOT NULL DEFAULT '*',
  description text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_tenant ON webhook_endpoints(tenant_id);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  webhook_endpoint_id uuid NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event varchar(100) NOT NULL,
  payload text,
  status varchar(20) NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  response_status integer,
  response_body text,
  error text,
  sent_at timestamptz,
  next_retry_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_tenant ON webhook_deliveries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint ON webhook_deliveries(webhook_endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created ON webhook_deliveries(created_at);

-- ---------------------------------------------------------------------------
-- RLS: match the tenant_isolation policy used across the schema
-- (policy reads app.tenant_id / app.is_superadmin session settings)
-- ---------------------------------------------------------------------------

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON api_keys;
CREATE POLICY tenant_isolation ON api_keys
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.is_superadmin', true) = 'true'
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.is_superadmin', true) = 'true'
  );

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON webhook_endpoints;
CREATE POLICY tenant_isolation ON webhook_endpoints
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.is_superadmin', true) = 'true'
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.is_superadmin', true) = 'true'
  );

-- api_key_lookup policy: ApiKeyGuard resolves the key by hash BEFORE the
-- tenant interceptor runs. Created here because phase10-rls-force.sql may
-- apply first (alphabetical glob order) and skips api_keys via its
-- to_regclass guard. phase10's FORCE loop then forces RLS on this table.
DROP POLICY IF EXISTS api_key_lookup ON api_keys;
CREATE POLICY api_key_lookup ON api_keys
  USING (current_setting('app.allow_api_key_lookup', true) = 'true');

-- FORCE row level security (phase10's force loop may have run before these
-- tables existed, so force explicitly here as well).
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints FORCE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries FORCE ROW LEVEL SECURITY;
