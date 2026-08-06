-- ============================================================================
-- Phase 12: appointments RLS (missed by phase 9/10)
-- ============================================================================
-- appointments was created in phase9 WITHOUT an RLS policy and phase10's
-- FORCE loop only touches tables that already have a policy — so it stayed
-- RLS-less (relrowsecurity=f, relforcerowsecurity=f, 0 policies) while every
-- other tenant table is enforced. This closes the gap so tenant isolation
-- applies at the database layer, matching all other tenant-scoped tables.
--
-- Idempotent: safe to run multiple times.
-- ============================================================================

-- Guarded by to_regclass: appointments is created by phase9, which may apply
-- AFTER this file (alphabetical glob order). phase9 carries the same
-- enable + policy + FORCE block, so whichever file runs first leaves the
-- table fully protected for the other.
DO $$
BEGIN
  IF to_regclass('public.appointments') IS NOT NULL THEN
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
  END IF;
END $$;
