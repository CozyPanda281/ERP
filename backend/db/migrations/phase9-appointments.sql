-- Phase 9: appointments (principal <-> staff / parent appointment calendar)

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  location VARCHAR(200),
  mode VARCHAR(20) DEFAULT 'in_person',
  requested_by UUID NOT NULL REFERENCES users(id),
  requested_by_role VARCHAR(50) NOT NULL,
  requested_by_name VARCHAR(255) NOT NULL,
  participants JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'pending',
  cancelled_reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_branch ON appointments (tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_appointments_requested_by ON appointments (requested_by);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments (status);

-- RLS (mirrors phase12-appointments-rls.sql): phase12 may run BEFORE this file
-- (alphabetical glob order) and guards on to_regclass; this block guarantees
-- enable + policy + FORCE regardless of which file applies first.
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON appointments;
CREATE POLICY tenant_isolation ON appointments
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.is_superadmin', true) = 'true'
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.is_superadmin', true) = 'true'
  );

ALTER TABLE appointments FORCE ROW LEVEL SECURITY;
