-- Phase 8: convert soft-delete unique constraints to partial unique indexes
-- (WHERE deleted_at IS NULL) so deleted rows no longer block recreation.
-- Recreates the same index names to keep application code unchanged.

-- database/001_schema.sql declares these as inline UNIQUE constraints
-- (constraint-owned indexes: DROP INDEX would fail), while drizzle-generated
-- databases have plain unique indexes. Convert any constraint form first so
-- the DROP INDEX below always works. Idempotent on both shapes.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass AS tbl
    FROM pg_constraint
    WHERE contype = 'u'
      AND conname IN (
        'classes_tenant_id_branch_id_name_key',
        'departments_tenant_id_branch_id_name_key',
        'sections_tenant_id_branch_id_class_id_name_key',
        'subjects_tenant_id_branch_id_code_key',
        'staff_tenant_id_branch_id_employee_code_key',
        'students_tenant_id_branch_id_admission_number_key',
        'branches_tenant_id_code_key'
      )
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $$;

DROP INDEX IF EXISTS classes_tenant_id_branch_id_name_key;
CREATE UNIQUE INDEX classes_tenant_id_branch_id_name_key ON classes (tenant_id, branch_id, name) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS departments_tenant_id_branch_id_name_key;
CREATE UNIQUE INDEX departments_tenant_id_branch_id_name_key ON departments (tenant_id, branch_id, name) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS sections_tenant_id_branch_id_class_id_name_key;
CREATE UNIQUE INDEX sections_tenant_id_branch_id_class_id_name_key ON sections (tenant_id, branch_id, class_id, name) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS subjects_tenant_id_branch_id_code_key;
CREATE UNIQUE INDEX subjects_tenant_id_branch_id_code_key ON subjects (tenant_id, branch_id, code) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS staff_tenant_id_branch_id_employee_code_key;
CREATE UNIQUE INDEX staff_tenant_id_branch_id_employee_code_key ON staff (tenant_id, branch_id, employee_code) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS students_tenant_id_branch_id_admission_number_key;
CREATE UNIQUE INDEX students_tenant_id_branch_id_admission_number_key ON students (tenant_id, branch_id, admission_number) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS branches_tenant_id_code_key;
CREATE UNIQUE INDEX branches_tenant_id_code_key ON branches (tenant_id, code) WHERE deleted_at IS NULL;
