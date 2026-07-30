-- ============================================================================
-- EDUCATIONAL ERP SAAS PLATFORM — COMPLETE DATABASE SCHEMA
-- Version: 1.0
-- Description: Full PostgreSQL schema with multi-tenant isolation, RLS,
--              RBAC, audit logging, and all module tables.
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CORE ENUM TYPES
-- ============================================================================

CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'trial', 'expired');
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled', 'trial');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'locked');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'half-day', 'holiday');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'online', 'bank_transfer', 'cheque', 'upi');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'refunded', 'cancelled');
CREATE TYPE exam_type AS ENUM ('unit_test', 'midterm', 'final', 'quiz', 'practical');
CREATE TYPE employment_type AS ENUM ('permanent', 'contract', 'probation', 'intern', 'temporary');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE notification_type AS ENUM ('sms', 'email', 'push', 'in_app');
CREATE TYPE notification_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE booking_status AS ENUM ('issued', 'returned', 'lost', 'damaged');
CREATE TYPE transport_vehicle_type AS ENUM ('bus', 'van', 'auto', 'other');
CREATE TYPE hostel_room_type AS ENUM ('single', 'shared', 'dormitory');
CREATE TYPE inventory_transaction_type AS ENUM ('in', 'out');
CREATE TYPE subject_type AS ENUM ('theory', 'practical', 'elective', 'co_curricular');

-- ============================================================================
-- PART 1: TENANT & SUBSCRIPTION CORE
-- ============================================================================

CREATE TABLE tenants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(20),
    address         TEXT,
    city            VARCHAR(100),
    state           VARCHAR(100),
    pincode         VARCHAR(10),
    country         VARCHAR(100) DEFAULT 'India',
    logo_url        TEXT,
    status          tenant_status DEFAULT 'trial',
    max_branches    INTEGER DEFAULT 1,
    max_users       INTEGER DEFAULT 50,
    max_students    INTEGER DEFAULT 500,
    max_staff       INTEGER DEFAULT 50,
    storage_limit_mb INTEGER DEFAULT 500,
    is_active       BOOLEAN DEFAULT TRUE,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_tenants_slug ON tenants(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenants_status ON tenants(status);

CREATE TABLE plans (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL,
    code            VARCHAR(50) UNIQUE NOT NULL,
    description     TEXT,
    price_monthly   DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_yearly    DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_branches    INTEGER DEFAULT 1,
    max_users       INTEGER DEFAULT 50,
    max_students    INTEGER DEFAULT 500,
    max_staff       INTEGER DEFAULT 50,
    storage_limit_mb INTEGER DEFAULT 500,
    features        JSONB DEFAULT '{}',
    is_active       BOOLEAN DEFAULT TRUE,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscriptions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id         UUID NOT NULL REFERENCES plans(id),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    billing_cycle   VARCHAR(20) DEFAULT 'monthly',
    status          subscription_status DEFAULT 'trial',
    auto_renew      BOOLEAN DEFAULT TRUE,
    trial_ends_at   DATE,
    cancelled_at    TIMESTAMPTZ,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_end_date ON subscriptions(end_date) WHERE status = 'active';

-- ============================================================================
-- PART 2: BRANCHES & LOCATIONS
-- ============================================================================

CREATE TABLE branches (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    code            VARCHAR(50) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(20),
    address         TEXT,
    city            VARCHAR(100),
    state           VARCHAR(100),
    pincode         VARCHAR(10),
    principal_id    UUID,
    status          VARCHAR(20) DEFAULT 'active',
    established_date DATE,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    UNIQUE(tenant_id, code)
);

CREATE INDEX idx_branches_tenant ON branches(tenant_id);
CREATE INDEX idx_branches_principal ON branches(principal_id);

-- ============================================================================
-- PART 3: USERS, ROLES & AUTHENTICATION
-- ============================================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email           VARCHAR(255),
    phone           VARCHAR(20),
    password_hash   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    avatar_url      TEXT,
    gender          gender_type,
    date_of_birth   DATE,
    address         TEXT,
    is_superadmin   BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    status          user_status DEFAULT 'active',
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    last_login_at   TIMESTAMPTZ,
    last_login_ip   VARCHAR(45),
    login_attempts  INTEGER DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ DEFAULT NOW(),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_phone ON users(phone) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_users_tenant_email ON users(tenant_id, email) WHERE tenant_id IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX idx_users_tenant_phone ON users(tenant_id, phone) WHERE tenant_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE roles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) NOT NULL,
    description     TEXT,
    is_system       BOOLEAN DEFAULT FALSE,
    hierarchy_level INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, slug)
);

CREATE INDEX idx_roles_tenant ON roles(tenant_id);

CREATE TABLE permissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    module          VARCHAR(100) NOT NULL,
    description     TEXT,
    is_system       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_permissions_module ON permissions(module);

CREATE TABLE role_permissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

CREATE TABLE user_roles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
    assigned_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role_id, branch_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_branch ON user_roles(branch_id);

CREATE TABLE user_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
    access_token    TEXT NOT NULL,
    refresh_token   TEXT NOT NULL,
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    device_info     JSONB DEFAULT '{}',
    device_type     VARCHAR(50),
    is_active       BOOLEAN DEFAULT TRUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    refresh_expires_at TIMESTAMPTZ NOT NULL,
    last_activity   TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_refresh ON user_sessions(refresh_token);
CREATE INDEX idx_sessions_active ON user_sessions(expires_at) WHERE is_active = TRUE;

-- ============================================================================
-- PART 4: ACADEMIC STRUCTURE
-- ============================================================================

CREATE TABLE academic_years (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    is_current      BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, branch_id, name)
);

CREATE INDEX idx_academic_years_branch ON academic_years(branch_id);
CREATE INDEX idx_academic_years_current ON academic_years(branch_id) WHERE is_current = TRUE;

CREATE TABLE departments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    code            VARCHAR(50),
    description     TEXT,
    hod_id          UUID,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    UNIQUE(tenant_id, branch_id, name)
);

CREATE INDEX idx_departments_branch ON departments(branch_id);

CREATE TABLE classes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    code            VARCHAR(50),
    description     TEXT,
    display_order   INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    UNIQUE(tenant_id, branch_id, name)
);

CREATE INDEX idx_classes_branch ON classes(branch_id);

CREATE TABLE sections (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    class_id        UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    code            VARCHAR(50),
    capacity        INTEGER DEFAULT 0,
    room_number     VARCHAR(50),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    UNIQUE(tenant_id, branch_id, class_id, name)
);

CREATE INDEX idx_sections_class ON sections(class_id);

CREATE TABLE subjects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    code            VARCHAR(50),
    subject_type    subject_type DEFAULT 'theory',
    description     TEXT,
    is_language     BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    UNIQUE(tenant_id, branch_id, code)
);

CREATE INDEX idx_subjects_branch ON subjects(branch_id);

CREATE TABLE class_subjects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    class_id        UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id      UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    is_compulsory   BOOLEAN DEFAULT TRUE,
    max_marks       INTEGER DEFAULT 100,
    pass_marks      INTEGER DEFAULT 33,
    credit_hours    DECIMAL(4,1) DEFAULT 0,
    display_order   INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, branch_id, class_id, subject_id)
);

CREATE INDEX idx_class_subjects_class ON class_subjects(class_id);

CREATE TABLE teacher_subjects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    teacher_id      UUID NOT NULL,
    subject_id      UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    class_id        UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    section_id      UUID REFERENCES sections(id) ON DELETE CASCADE,
    is_class_teacher BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, branch_id, teacher_id, subject_id, class_id, section_id)
);

CREATE INDEX idx_teacher_subjects_teacher ON teacher_subjects(teacher_id);

-- ============================================================================
-- PART 5: ADMISSIONS & STUDENTS
-- ============================================================================

CREATE TABLE enquiries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    student_name    VARCHAR(255) NOT NULL,
    date_of_birth   DATE,
    gender          gender_type,
    parent_name     VARCHAR(255),
    parent_phone    VARCHAR(20),
    parent_email    VARCHAR(255),
    address         TEXT,
    class_id        UUID REFERENCES classes(id),
    academic_year_id UUID REFERENCES academic_years(id),
    source          VARCHAR(100),
    status          VARCHAR(50) DEFAULT 'new',
    remarks         TEXT,
    follow_up_date  DATE,
    assigned_to     UUID,
    converted_to_application BOOLEAN DEFAULT FALSE,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_enquiries_branch ON enquiries(branch_id);
CREATE INDEX idx_enquiries_status ON enquiries(status);

CREATE TABLE applications (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id           UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    application_number  VARCHAR(50) NOT NULL,
    enquiry_id          UUID REFERENCES enquiries(id),
    student_first_name  VARCHAR(100) NOT NULL,
    student_last_name   VARCHAR(100) NOT NULL,
    date_of_birth       DATE,
    gender              gender_type,
    nationality         VARCHAR(100) DEFAULT 'Indian',
    religion            VARCHAR(100),
    caste               VARCHAR(100),
    category            VARCHAR(50),
    address             TEXT,
    city                VARCHAR(100),
    state               VARCHAR(100),
    pincode             VARCHAR(10),
    phone               VARCHAR(20),
    email               VARCHAR(255),
    blood_group         VARCHAR(5),
    father_name         VARCHAR(255),
    father_phone        VARCHAR(20),
    father_email        VARCHAR(255),
    father_occupation   VARCHAR(100),
    mother_name         VARCHAR(255),
    mother_phone        VARCHAR(20),
    mother_email        VARCHAR(255),
    mother_occupation   VARCHAR(100),
    guardian_name       VARCHAR(255),
    guardian_relation   VARCHAR(50),
    guardian_phone      VARCHAR(20),
    previous_school     VARCHAR(255),
    previous_class      VARCHAR(50),
    class_id            UUID REFERENCES classes(id),
    academic_year_id    UUID REFERENCES academic_years(id),
    documents           JSONB DEFAULT '{}',
    status              VARCHAR(50) DEFAULT 'pending',
    review_remarks      TEXT,
    reviewed_by         UUID,
    reviewed_at         TIMESTAMPTZ,
    admitted            BOOLEAN DEFAULT FALSE,
    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, branch_id, application_number)
);

CREATE INDEX idx_applications_branch ON applications(branch_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_class ON applications(class_id);

CREATE TABLE students (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id           UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    admission_number    VARCHAR(50) NOT NULL,
    roll_number         VARCHAR(50),
    application_id      UUID REFERENCES applications(id),
    first_name          VARCHAR(100) NOT NULL,
    middle_name         VARCHAR(100),
    last_name           VARCHAR(100) NOT NULL,
    date_of_birth       DATE,
    gender              gender_type,
    blood_group         VARCHAR(5),
    nationality         VARCHAR(100) DEFAULT 'Indian',
    religion            VARCHAR(100),
    caste               VARCHAR(100),
    category            VARCHAR(50),
    address             TEXT,
    city                VARCHAR(100),
    state               VARCHAR(100),
    pincode             VARCHAR(10),
    phone               VARCHAR(20),
    email               VARCHAR(255),
    profile_photo_url   TEXT,
    aadhar_number       VARCHAR(20),
    samagra_id          VARCHAR(50),
    is_active           BOOLEAN DEFAULT TRUE,
    status              VARCHAR(50) DEFAULT 'active',
    admission_date      DATE,
    leaving_date        DATE,
    leaving_reason      TEXT,
    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,
    UNIQUE(tenant_id, branch_id, admission_number)
);

CREATE INDEX idx_students_branch ON students(branch_id);
CREATE INDEX idx_students_active ON students(branch_id) WHERE is_active = TRUE;
CREATE INDEX idx_students_name ON students(first_name, last_name);

CREATE TABLE student_documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    document_type   VARCHAR(100) NOT NULL,
    document_name   VARCHAR(255),
    document_number VARCHAR(100),
    file_url        TEXT NOT NULL,
    file_size       INTEGER,
    mime_type       VARCHAR(100),
    is_verified     BOOLEAN DEFAULT FALSE,
    verified_at     TIMESTAMPTZ,
    verified_by     UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_student_docs_student ON student_documents(student_id);

CREATE TABLE parents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    relationship    VARCHAR(50) NOT NULL,
    phone           VARCHAR(20),
    email           VARCHAR(255),
    occupation      VARCHAR(100),
    income          DECIMAL(10,2),
    address         TEXT,
    is_primary      BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_parents_tenant ON parents(tenant_id);

CREATE TABLE student_parents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    parent_id       UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    relationship    VARCHAR(50) NOT NULL,
    is_primary      BOOLEAN DEFAULT FALSE,
    is_emergency_contact BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, parent_id)
);

CREATE INDEX idx_student_parents_student ON student_parents(student_id);

CREATE TABLE student_academic_records (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id           UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    student_id          UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id            UUID NOT NULL REFERENCES classes(id),
    section_id          UUID REFERENCES sections(id),
    academic_year_id    UUID NOT NULL REFERENCES academic_years(id),
    roll_number         VARCHAR(50),
    is_promoted         BOOLEAN DEFAULT FALSE,
    promoted_to_class   UUID REFERENCES classes(id),
    promotion_date      DATE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, academic_year_id)
);

CREATE INDEX idx_student_academic_records_student ON student_academic_records(student_id);
CREATE INDEX idx_student_academic_records_class ON student_academic_records(class_id);

-- ============================================================================
-- PART 6: STAFF MANAGEMENT
-- ============================================================================

CREATE TABLE staff (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id           UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    user_id             UUID REFERENCES users(id),
    employee_code       VARCHAR(50) NOT NULL,
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    date_of_birth       DATE,
    gender              gender_type,
    blood_group         VARCHAR(5),
    phone               VARCHAR(20),
    email               VARCHAR(255),
    address             TEXT,
    city                VARCHAR(100),
    state               VARCHAR(100),
    pincode             VARCHAR(10),
    qualification       TEXT,
    experience_years    DECIMAL(4,1),
    joining_date        DATE,
    employment_type     employment_type DEFAULT 'permanent',
    designation         VARCHAR(100),
    department_id       UUID REFERENCES departments(id),
    basic_salary        DECIMAL(10,2),
    bank_name           VARCHAR(255),
    bank_account_no     VARCHAR(50),
    ifsc_code           VARCHAR(20),
    pan_number          VARCHAR(20),
    aadhar_number       VARCHAR(20),
    is_active           BOOLEAN DEFAULT TRUE,
    is_teaching         BOOLEAN DEFAULT FALSE,
    profile_photo_url   TEXT,
    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,
    UNIQUE(tenant_id, branch_id, employee_code)
);

CREATE INDEX idx_staff_branch ON staff(branch_id);
CREATE INDEX idx_staff_department ON staff(department_id);
CREATE INDEX idx_staff_teaching ON staff(branch_id) WHERE is_teaching = TRUE;

CREATE TABLE staff_documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    document_type   VARCHAR(100) NOT NULL,
    document_number VARCHAR(100),
    file_url        TEXT NOT NULL,
    is_verified     BOOLEAN DEFAULT FALSE,
    verified_at     TIMESTAMPTZ,
    verified_by     UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_staff_docs_staff ON staff_documents(staff_id);

-- ============================================================================
-- PART 7: ATTENDANCE
-- ============================================================================

CREATE TABLE attendance (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    class_id        UUID REFERENCES classes(id),
    section_id      UUID REFERENCES sections(id),
    subject_id      UUID REFERENCES subjects(id),
    teacher_id      UUID REFERENCES staff(id),
    date            DATE NOT NULL,
    start_time      TIME,
    end_time        TIME,
    total_present   INTEGER DEFAULT 0,
    total_absent    INTEGER DEFAULT 0,
    total_students  INTEGER DEFAULT 0,
    remarks         TEXT,
    created_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, branch_id, class_id, section_id, date)
);

CREATE INDEX idx_attendance_branch ON attendance(branch_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_class_date ON attendance(class_id, date);

CREATE TABLE attendance_records (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    attendance_id   UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status          attendance_status NOT NULL DEFAULT 'present',
    check_in_time   TIME,
    check_out_time  TIME,
    remarks         TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(attendance_id, student_id)
);

CREATE INDEX idx_attendance_records_attendance ON attendance_records(attendance_id);
CREATE INDEX idx_attendance_records_student ON attendance_records(student_id);

CREATE TABLE staff_attendance (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    check_in        TIMESTAMPTZ,
    check_out       TIMESTAMPTZ,
    status          attendance_status DEFAULT 'present',
    hours_worked    DECIMAL(4,1),
    overtime_hours  DECIMAL(4,1),
    remarks         TEXT,
    marked_by       UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, branch_id, staff_id, date)
);

CREATE INDEX idx_staff_attendance_staff ON staff_attendance(staff_id);
CREATE INDEX idx_staff_attendance_date ON staff_attendance(date);

-- ============================================================================
-- PART 8: LEAVE MANAGEMENT
-- ============================================================================

CREATE TABLE leave_types (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    code            VARCHAR(50) NOT NULL,
    days_allowed    INTEGER NOT NULL,
    is_paid         BOOLEAN DEFAULT TRUE,
    carry_forward   BOOLEAN DEFAULT FALSE,
    max_carry_forward INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

CREATE TABLE leave_requests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    leave_type_id   UUID NOT NULL REFERENCES leave_types(id),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    total_days      INTEGER NOT NULL,
    reason          TEXT,
    status          leave_status DEFAULT 'pending',
    approved_by     UUID,
    approved_at     TIMESTAMPTZ,
    reject_reason   TEXT,
    document_url    TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leave_requests_staff ON leave_requests(staff_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- ============================================================================
-- PART 9: FEE & FINANCE
-- ============================================================================

CREATE TABLE fee_structures (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    class_id        UUID REFERENCES classes(id),
    academic_year_id UUID REFERENCES academic_years(id),
    frequency       VARCHAR(50) DEFAULT 'monthly',
    is_active       BOOLEAN DEFAULT TRUE,
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_fee_structures_branch ON fee_structures(branch_id);
CREATE INDEX idx_fee_structures_class ON fee_structures(class_id);

CREATE TABLE fee_structure_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    fee_structure_id UUID NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    amount          DECIMAL(10,2) NOT NULL,
    is_optional     BOOLEAN DEFAULT FALSE,
    is_recurring    BOOLEAN DEFAULT TRUE,
    frequency       VARCHAR(50) DEFAULT 'monthly',
    due_day         INTEGER,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fee_items_structure ON fee_structure_items(fee_structure_id);

CREATE TABLE fee_discounts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    discount_type   VARCHAR(20) NOT NULL,
    value           DECIMAL(10,2) NOT NULL,
    applicable_to   VARCHAR(50) DEFAULT 'all',
    applicable_ids  JSONB DEFAULT '[]',
    is_active       BOOLEAN DEFAULT TRUE,
    valid_from      DATE,
    valid_until     DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fee_concessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    fee_structure_item_id UUID REFERENCES fee_structure_items(id),
    discount_id     UUID REFERENCES fee_discounts(id),
    amount          DECIMAL(10,2) NOT NULL,
    type            VARCHAR(20) NOT NULL,
    approved_by     UUID,
    valid_from      DATE,
    valid_until     DATE,
    remarks         TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fee_concessions_student ON fee_concessions(student_id);

CREATE TABLE student_fee_accounts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id           UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    student_id          UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    fee_structure_id    UUID REFERENCES fee_structures(id),
    academic_year_id    UUID REFERENCES academic_years(id),
    total_fee           DECIMAL(12,2) DEFAULT 0,
    total_discount      DECIMAL(12,2) DEFAULT 0,
    total_paid          DECIMAL(12,2) DEFAULT 0,
    total_due           DECIMAL(12,2) DEFAULT 0,
    status              VARCHAR(50) DEFAULT 'active',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, academic_year_id)
);

CREATE INDEX idx_fee_accounts_student ON student_fee_accounts(student_id);
CREATE INDEX idx_fee_accounts_status ON student_fee_accounts(status);
CREATE INDEX idx_fee_accounts_due ON student_fee_accounts(total_due) WHERE total_due > 0;

CREATE TABLE fee_transactions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    fee_account_id  UUID REFERENCES student_fee_accounts(id),
    transaction_no  VARCHAR(50) NOT NULL,
    invoice_no      VARCHAR(50),
    amount          DECIMAL(12,2) NOT NULL,
    payment_method  payment_method,
    payment_date    TIMESTAMPTZ DEFAULT NOW(),
    due_date        DATE,
    paid_date       DATE,
    reference_number VARCHAR(100),
    cheque_number   VARCHAR(50),
    cheque_date     DATE,
    bank_name       VARCHAR(255),
    upi_id          VARCHAR(100),
    gateway_response JSONB DEFAULT '{}',
    status          transaction_status DEFAULT 'completed',
    remarks         TEXT,
    reconciled      BOOLEAN DEFAULT FALSE,
    reconciled_at   TIMESTAMPTZ,
    created_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, branch_id, transaction_no)
);

CREATE INDEX idx_fee_transactions_student ON fee_transactions(student_id);
CREATE INDEX idx_fee_transactions_account ON fee_transactions(fee_account_id);
CREATE INDEX idx_fee_transactions_status ON fee_transactions(status);
CREATE INDEX idx_fee_transactions_date ON fee_transactions(payment_date);

CREATE TABLE fee_receipts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transaction_id  UUID NOT NULL REFERENCES fee_transactions(id) ON DELETE CASCADE,
    receipt_number  VARCHAR(50) NOT NULL,
    receipt_date    DATE NOT NULL,
    receipt_url     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, receipt_number)
);

CREATE INDEX idx_fee_receipts_transaction ON fee_receipts(transaction_id);

CREATE TABLE fee_invoices (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    invoice_number  VARCHAR(50) NOT NULL,
    invoice_date    DATE NOT NULL,
    due_date        DATE NOT NULL,
    items           JSONB NOT NULL DEFAULT '[]',
    subtotal        DECIMAL(12,2) NOT NULL,
    discount_total  DECIMAL(12,2) DEFAULT 0,
    total_amount    DECIMAL(12,2) NOT NULL,
    amount_paid     DECIMAL(12,2) DEFAULT 0,
    balance_due     DECIMAL(12,2) DEFAULT 0,
    status          VARCHAR(50) DEFAULT 'pending',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, branch_id, invoice_number)
);

CREATE INDEX idx_fee_invoices_student ON fee_invoices(student_id);
CREATE INDEX idx_fee_invoices_status ON fee_invoices(status);
CREATE INDEX idx_fee_invoices_due ON fee_invoices(due_date) WHERE status = 'pending';

-- ============================================================================
-- PART 10: PAYROLL
-- ============================================================================

CREATE TABLE payroll_salary_components (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    type            VARCHAR(20) NOT NULL,
    calculation_type VARCHAR(50) DEFAULT 'fixed',
    value           DECIMAL(10,2) DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payroll (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    month           INTEGER NOT NULL,
    year            INTEGER NOT NULL,
    basic_pay       DECIMAL(10,2) DEFAULT 0,
    allowances      JSONB DEFAULT '[]',
    deductions      JSONB DEFAULT '[]',
    gross_pay       DECIMAL(10,2) DEFAULT 0,
    total_deductions DECIMAL(10,2) DEFAULT 0,
    net_pay         DECIMAL(10,2) DEFAULT 0,
    payment_date    DATE,
    payment_method  payment_method,
    transaction_ref VARCHAR(100),
    status          VARCHAR(50) DEFAULT 'draft',
    remarks         TEXT,
    processed_by    UUID,
    processed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(staff_id, month, year)
);

CREATE INDEX idx_payroll_staff ON payroll(staff_id);
CREATE INDEX idx_payroll_month_year ON payroll(month, year);
CREATE INDEX idx_payroll_status ON payroll(status);

-- ============================================================================
-- PART 11: EXPENSES & INCOME
-- ============================================================================

CREATE TABLE expense_categories (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE TABLE expenses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES expense_categories(id),
    amount          DECIMAL(12,2) NOT NULL,
    description     TEXT NOT NULL,
    expense_date    DATE NOT NULL,
    payment_method  payment_method,
    reference_number VARCHAR(100),
    vendor_name     VARCHAR(255),
    bill_number     VARCHAR(100),
    bill_url        TEXT,
    approved_by     UUID,
    approved_at     TIMESTAMPTZ,
    created_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_branch ON expenses(branch_id);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);

CREATE TABLE income_categories (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE TABLE income (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES income_categories(id),
    amount          DECIMAL(12,2) NOT NULL,
    description     TEXT NOT NULL,
    income_date     DATE NOT NULL,
    payment_method  payment_method,
    reference_number VARCHAR(100),
    created_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_income_branch ON income(branch_id);
CREATE INDEX idx_income_date ON income(income_date);

-- ============================================================================
-- PART 12: EXAMINATIONS & RESULTS
-- ============================================================================

CREATE TABLE exams (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    exam_type       exam_type DEFAULT 'unit_test',
    class_id        UUID REFERENCES classes(id),
    academic_year_id UUID REFERENCES academic_years(id),
    start_date      DATE,
    end_date        DATE,
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exams_branch ON exams(branch_id);
CREATE INDEX idx_exams_class ON exams(class_id);
CREATE INDEX idx_exams_type ON exams(exam_type);

CREATE TABLE exam_schedules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    exam_id         UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    subject_id      UUID NOT NULL REFERENCES subjects(id),
    class_id        UUID REFERENCES classes(id),
    date            DATE,
    start_time      TIME,
    end_time        TIME,
    max_marks       INTEGER DEFAULT 100,
    pass_marks      INTEGER DEFAULT 33,
    room_number     VARCHAR(50),
    invigilator_id  UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exam_schedules_exam ON exam_schedules(exam_id);
CREATE INDEX idx_exam_schedules_subject ON exam_schedules(subject_id);

CREATE TABLE marks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    exam_schedule_id UUID NOT NULL REFERENCES exam_schedules(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    marks_obtained  DECIMAL(6,2),
    max_marks       INTEGER DEFAULT 100,
    is_absent       BOOLEAN DEFAULT FALSE,
    is_malpractice  BOOLEAN DEFAULT FALSE,
    grade           VARCHAR(5),
    grade_point     DECIMAL(3,1),
    remarks         TEXT,
    entered_by      UUID,
    entered_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(exam_schedule_id, student_id)
);

CREATE INDEX idx_marks_exam_schedule ON marks(exam_schedule_id);
CREATE INDEX idx_marks_student ON marks(student_id);

CREATE TABLE exam_results (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    exam_id         UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    total_marks     DECIMAL(8,2) DEFAULT 0,
    percentage      DECIMAL(5,2),
    grade           VARCHAR(5),
    rank            INTEGER,
    result_status   VARCHAR(20) DEFAULT 'pass',
    is_promoted     BOOLEAN,
    remarks         TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(exam_id, student_id)
);

CREATE INDEX idx_exam_results_exam ON exam_results(exam_id);
CREATE INDEX idx_exam_results_student ON exam_results(student_id);
CREATE INDEX idx_exam_results_rank ON exam_results(exam_id, rank);

-- ============================================================================
-- PART 13: TIMETABLE
-- ============================================================================

CREATE TABLE timetables (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    class_id        UUID NOT NULL REFERENCES classes(id),
    section_id      UUID REFERENCES sections(id),
    academic_year_id UUID REFERENCES academic_years(id),
    is_active       BOOLEAN DEFAULT TRUE,
    valid_from      DATE,
    valid_until     DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_timetables_class ON timetables(class_id);

CREATE TABLE timetable_entries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    timetable_id    UUID NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
    day_of_week     SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    subject_id      UUID NOT NULL REFERENCES subjects(id),
    teacher_id      UUID REFERENCES staff(id),
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    room_number     VARCHAR(50),
    is_break        BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_timetable_entries_timetable ON timetable_entries(timetable_id);
CREATE INDEX idx_timetable_entries_day ON timetable_entries(timetable_id, day_of_week);

-- ============================================================================
-- PART 14: HOMEWORK & ASSIGNMENTS
-- ============================================================================

CREATE TABLE homework (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    class_id        UUID NOT NULL REFERENCES classes(id),
    section_id      UUID REFERENCES sections(id),
    subject_id      UUID NOT NULL REFERENCES subjects(id),
    teacher_id      UUID NOT NULL REFERENCES staff(id),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    attachment_urls JSONB DEFAULT '[]',
    due_date        TIMESTAMPTZ NOT NULL,
    max_marks       INTEGER,
    is_mandatory    BOOLEAN DEFAULT TRUE,
    status          VARCHAR(50) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_homework_class ON homework(class_id);
CREATE INDEX idx_homework_teacher ON homework(teacher_id);
CREATE INDEX idx_homework_due ON homework(due_date) WHERE status = 'active';

CREATE TABLE homework_submissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    homework_id     UUID NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    submission_text TEXT,
    attachment_urls JSONB DEFAULT '[]',
    submitted_at    TIMESTAMPTZ DEFAULT NOW(),
    is_late         BOOLEAN DEFAULT FALSE,
    marks_obtained  DECIMAL(6,2),
    feedback        TEXT,
    status          VARCHAR(50) DEFAULT 'submitted',
    graded_by       UUID,
    graded_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(homework_id, student_id)
);

CREATE INDEX idx_homework_submissions_homework ON homework_submissions(homework_id);
CREATE INDEX idx_homework_submissions_student ON homework_submissions(student_id);

CREATE TABLE assignments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    class_id        UUID NOT NULL REFERENCES classes(id),
    section_id      UUID REFERENCES sections(id),
    subject_id      UUID NOT NULL REFERENCES subjects(id),
    teacher_id      UUID NOT NULL REFERENCES staff(id),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    assignment_type VARCHAR(50) DEFAULT 'written',
    attachment_urls JSONB DEFAULT '[]',
    due_date        TIMESTAMPTZ NOT NULL,
    max_marks       INTEGER,
    status          VARCHAR(50) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assignments_class ON assignments(class_id);

CREATE TABLE assignment_submissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    assignment_id   UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    submission_text TEXT,
    attachment_urls JSONB DEFAULT '[]',
    submitted_at    TIMESTAMPTZ DEFAULT NOW(),
    is_late         BOOLEAN DEFAULT FALSE,
    marks_obtained  DECIMAL(6,2),
    feedback        TEXT,
    status          VARCHAR(50) DEFAULT 'submitted',
    graded_by       UUID,
    graded_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assignment_id, student_id)
);

CREATE INDEX idx_assignment_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX idx_assignment_submissions_student ON assignment_submissions(student_id);

-- ============================================================================
-- PART 15: LESSON PLANS
-- ============================================================================

CREATE TABLE lesson_plans (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    teacher_id      UUID NOT NULL REFERENCES staff(id),
    subject_id      UUID NOT NULL REFERENCES subjects(id),
    class_id        UUID NOT NULL REFERENCES classes(id),
    section_id      UUID REFERENCES sections(id),
    title           VARCHAR(255) NOT NULL,
    objectives      TEXT,
    content         TEXT,
    teaching_method VARCHAR(100),
    resources       TEXT,
    duration_minutes INTEGER,
    date            DATE,
    status          VARCHAR(50) DEFAULT 'draft',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lesson_plans_teacher ON lesson_plans(teacher_id);
CREATE INDEX idx_lesson_plans_date ON lesson_plans(date);

-- ============================================================================
-- PART 16: LIBRARY
-- ============================================================================

CREATE TABLE book_categories (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE TABLE books (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id           UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    isbn                VARCHAR(20),
    title               VARCHAR(255) NOT NULL,
    author              VARCHAR(255) NOT NULL,
    publisher           VARCHAR(255),
    edition             VARCHAR(50),
    category_id         UUID REFERENCES book_categories(id),
    language            VARCHAR(50) DEFAULT 'English',
    pages               INTEGER,
    shelf_location      VARCHAR(100),
    purchase_date       DATE,
    purchase_price      DECIMAL(10,2),
    quantity            INTEGER NOT NULL DEFAULT 1,
    available_quantity  INTEGER NOT NULL DEFAULT 1,
    damaged_quantity    INTEGER DEFAULT 0,
    lost_quantity       INTEGER DEFAULT 0,
    description         TEXT,
    cover_image_url     TEXT,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_books_branch ON books(branch_id);
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_category ON books(category_id);
CREATE INDEX idx_books_title ON books(title);

CREATE TABLE book_issues (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    book_id         UUID NOT NULL REFERENCES books(id),
    issuer_type     VARCHAR(20) NOT NULL,
    issuer_id       UUID NOT NULL,
    issue_date      DATE NOT NULL,
    due_date        DATE NOT NULL,
    return_date     DATE,
    fine_amount     DECIMAL(10,2) DEFAULT 0,
    fine_paid       BOOLEAN DEFAULT FALSE,
    fine_paid_date  DATE,
    status          booking_status DEFAULT 'issued',
    issued_by       UUID,
    remarks         TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_book_issues_branch ON book_issues(branch_id);
CREATE INDEX idx_book_issues_book ON book_issues(book_id);
CREATE INDEX idx_book_issues_status ON book_issues(status);
CREATE INDEX idx_book_issues_due ON book_issues(due_date) WHERE status = 'issued';

-- ============================================================================
-- PART 17: TRANSPORT
-- ============================================================================

CREATE TABLE vehicles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id           UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    vehicle_number      VARCHAR(50) NOT NULL,
    vehicle_type        transport_vehicle_type DEFAULT 'bus',
    capacity            INTEGER NOT NULL,
    model               VARCHAR(100),
    manufacturer        VARCHAR(100),
    manufacture_year    INTEGER,
    chassis_number      VARCHAR(100),
    engine_number       VARCHAR(100),
    insurance_provider  VARCHAR(255),
    insurance_expiry    DATE,
    fitness_expiry      DATE,
    pollution_expiry    DATE,
    status              VARCHAR(50) DEFAULT 'active',
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,
    UNIQUE(tenant_id, branch_id, vehicle_number)
);

CREATE INDEX idx_vehicles_branch ON vehicles(branch_id);

CREATE TABLE drivers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    phone           VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    email           VARCHAR(255),
    license_number  VARCHAR(50) NOT NULL,
    license_expiry  DATE,
    address         TEXT,
    date_of_birth   DATE,
    joining_date    DATE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, branch_id, license_number)
);

CREATE TABLE routes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    distance_km     DECIMAL(8,2),
    vehicle_id      UUID REFERENCES vehicles(id),
    driver_id       UUID REFERENCES drivers(id),
    status          VARCHAR(50) DEFAULT 'active',
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, branch_id, name)
);

CREATE INDEX idx_routes_branch ON routes(branch_id);

CREATE TABLE route_stops (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    route_id        UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    address         TEXT,
    latitude        DECIMAL(10,7),
    longitude       DECIMAL(10,7),
    stop_order      INTEGER NOT NULL,
    pickup_time     TIME,
    drop_time       TIME,
    fee             DECIMAL(10,2) DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_route_stops_route ON route_stops(route_id);

CREATE TABLE student_transport (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    route_id        UUID NOT NULL REFERENCES routes(id),
    stop_id         UUID NOT NULL REFERENCES route_stops(id),
    fee             DECIMAL(10,2) DEFAULT 0,
    pickup_point    TEXT,
    drop_point      TEXT,
    academic_year_id UUID REFERENCES academic_years(id),
    status          VARCHAR(50) DEFAULT 'active',
    effective_from  DATE,
    effective_until DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, academic_year_id)
);

CREATE INDEX idx_student_transport_student ON student_transport(student_id);
CREATE INDEX idx_student_transport_route ON student_transport(route_id);

CREATE TABLE transport_fuel_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    vehicle_id      UUID NOT NULL REFERENCES vehicles(id),
    fuel_date       DATE NOT NULL,
    fuel_type       VARCHAR(50),
    quantity_liters DECIMAL(8,2) NOT NULL,
    cost_per_liter  DECIMAL(8,2),
    total_cost      DECIMAL(10,2),
    odometer_reading INTEGER,
    vendor_name     VARCHAR(255),
    bill_number     VARCHAR(100),
    bill_url        TEXT,
    remarks         TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fuel_logs_vehicle ON transport_fuel_logs(vehicle_id);

CREATE TABLE transport_maintenance (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    vehicle_id      UUID NOT NULL REFERENCES vehicles(id),
    maintenance_type VARCHAR(100) NOT NULL,
    description     TEXT,
    service_date    DATE NOT NULL,
    cost            DECIMAL(10,2),
    service_center  VARCHAR(255),
    bill_number     VARCHAR(100),
    bill_url        TEXT,
    next_service_date DATE,
    odometer_reading INTEGER,
    remarks         TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transport_maintenance_vehicle ON transport_maintenance(vehicle_id);

-- ============================================================================
-- PART 18: HOSTEL
-- ============================================================================

CREATE TABLE hostel_rooms (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    room_number     VARCHAR(50) NOT NULL,
    floor           VARCHAR(50),
    building        VARCHAR(100),
    room_type       hostel_room_type DEFAULT 'shared',
    capacity        INTEGER NOT NULL,
    current_occupancy INTEGER DEFAULT 0,
    fee_per_bed     DECIMAL(10,2) DEFAULT 0,
    amenities       JSONB DEFAULT '[]',
    status          VARCHAR(50) DEFAULT 'available',
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, branch_id, room_number)
);

CREATE INDEX idx_hostel_rooms_branch ON hostel_rooms(branch_id);
CREATE INDEX idx_hostel_rooms_status ON hostel_rooms(status);

CREATE TABLE hostel_beds (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    room_id         UUID NOT NULL REFERENCES hostel_rooms(id) ON DELETE CASCADE,
    bed_number      VARCHAR(50) NOT NULL,
    is_occupied     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, bed_number)
);

CREATE INDEX idx_hostel_beds_room ON hostel_beds(room_id);

CREATE TABLE student_hostel (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    room_id         UUID NOT NULL REFERENCES hostel_rooms(id),
    bed_id          UUID NOT NULL REFERENCES hostel_beds(id),
    check_in_date   DATE NOT NULL,
    check_out_date  DATE,
    fee             DECIMAL(10,2) DEFAULT 0,
    academic_year_id UUID REFERENCES academic_years(id),
    status          VARCHAR(50) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_student_hostel_student ON student_hostel(student_id);
CREATE INDEX idx_student_hostel_room ON student_hostel(room_id);

CREATE TABLE hostel_complaints (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    complaint_type  VARCHAR(100) NOT NULL,
    description     TEXT NOT NULL,
    priority        notification_priority DEFAULT 'medium',
    status          VARCHAR(50) DEFAULT 'open',
    resolved_at     TIMESTAMPTZ,
    resolved_by     UUID,
    resolution_notes TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hostel_complaints_student ON hostel_complaints(student_id);
CREATE INDEX idx_hostel_complaints_status ON hostel_complaints(status);

CREATE TABLE hostel_visitors (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    visitor_name    VARCHAR(255) NOT NULL,
    relationship    VARCHAR(100),
    phone           VARCHAR(20),
    visit_date      DATE NOT NULL,
    check_in_time   TIMESTAMPTZ,
    check_out_time  TIMESTAMPTZ,
    purpose         TEXT,
    id_proof        VARCHAR(100),
    id_number       VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 19: COMMUNICATION & NOTIFICATIONS
-- ============================================================================

CREATE TABLE notification_templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    code            VARCHAR(100) NOT NULL,
    type            notification_type NOT NULL,
    subject         VARCHAR(255),
    body            TEXT NOT NULL,
    variables       JSONB DEFAULT '[]',
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID REFERENCES branches(id),
    sender_id       UUID,
    title           VARCHAR(255) NOT NULL,
    message         TEXT NOT NULL,
    type            notification_type DEFAULT 'in_app',
    priority        notification_priority DEFAULT 'low',
    target_roles    JSONB DEFAULT '[]',
    target_users    JSONB DEFAULT '[]',
    metadata        JSONB DEFAULT '{}',
    allow_dismiss   BOOLEAN DEFAULT TRUE,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at);

CREATE TABLE notification_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    recipient_id    UUID NOT NULL,
    recipient_type  VARCHAR(50) NOT NULL,
    channel         notification_type NOT NULL,
    status          VARCHAR(50) DEFAULT 'pending',
    sent_at         TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    read_at         TIMESTAMPTZ,
    error_message   TEXT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_logs_notification ON notification_logs(notification_id);
CREATE INDEX idx_notification_logs_recipient ON notification_logs(recipient_id);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);

CREATE TABLE announcements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    content         TEXT NOT NULL,
    target_roles    JSONB DEFAULT '[]',
    target_classes  JSONB DEFAULT '[]',
    attachment_urls JSONB DEFAULT '[]',
    priority        notification_priority DEFAULT 'low',
    is_pinned       BOOLEAN DEFAULT FALSE,
    published_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_announcements_branch ON announcements(branch_id);
CREATE INDEX idx_announcements_published ON announcements(published_at);

CREATE TABLE circulars (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    circular_number VARCHAR(50) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    content         TEXT NOT NULL,
    target_roles    JSONB DEFAULT '[]',
    attachment_urls JSONB DEFAULT '[]',
    issue_date      DATE NOT NULL,
    created_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, branch_id, circular_number)
);

-- ============================================================================
-- PART 20: INVENTORY & ASSETS
-- ============================================================================

CREATE TABLE inventory_categories (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE TABLE inventory_items (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id           UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    category_id         UUID REFERENCES inventory_categories(id),
    name                VARCHAR(255) NOT NULL,
    sku                 VARCHAR(100),
    description         TEXT,
    unit                VARCHAR(50),
    quantity            DECIMAL(12,2) DEFAULT 0,
    min_quantity        DECIMAL(12,2) DEFAULT 0,
    max_quantity        DECIMAL(12,2),
    unit_price          DECIMAL(10,2),
    total_value         DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    location            VARCHAR(255),
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_inventory_items_branch ON inventory_items(branch_id);
CREATE INDEX idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX idx_inventory_items_low_stock ON inventory_items(quantity) WHERE quantity <= min_quantity;

CREATE TABLE inventory_transactions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    item_id         UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    transaction_type inventory_transaction_type NOT NULL,
    quantity        DECIMAL(12,2) NOT NULL,
    unit_price      DECIMAL(10,2),
    total_amount    DECIMAL(12,2),
    reference_type  VARCHAR(50),
    reference_id    UUID,
    vendor_name     VARCHAR(255),
    bill_number     VARCHAR(100),
    remarks         TEXT,
    created_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_transactions_item ON inventory_transactions(item_id);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(transaction_type);

CREATE TABLE assets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    asset_type      VARCHAR(100) NOT NULL,
    asset_code      VARCHAR(50),
    description     TEXT,
    purchase_date   DATE,
    purchase_price  DECIMAL(12,2),
    current_value   DECIMAL(12,2),
    depreciation_method VARCHAR(50),
    depreciation_rate DECIMAL(5,2),
    warranty_expiry DATE,
    warranty_details TEXT,
    location        VARCHAR(255),
    status          VARCHAR(50) DEFAULT 'active',
    assigned_to     UUID,
    condition_note  TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_assets_branch ON assets(branch_id);
CREATE INDEX idx_assets_type ON assets(asset_type);
CREATE INDEX idx_assets_status ON assets(status);

-- ============================================================================
-- PART 21: HR & RECRUITMENT
-- ============================================================================

CREATE TABLE job_postings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    department_id   UUID REFERENCES departments(id),
    employment_type employment_type DEFAULT 'permanent',
    description     TEXT,
    requirements    TEXT,
    salary_range    VARCHAR(100),
    location        VARCHAR(255),
    vacancies       INTEGER DEFAULT 1,
    posted_date     DATE,
    closing_date    DATE,
    status          VARCHAR(50) DEFAULT 'open',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE job_applications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    job_posting_id  UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    applicant_name  VARCHAR(255) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(20),
    resume_url      TEXT,
    cover_letter    TEXT,
    qualification   TEXT,
    experience_years DECIMAL(4,1),
    current_company VARCHAR(255),
    current_ctc     VARCHAR(100),
    expected_ctc    VARCHAR(100),
    notice_period   VARCHAR(50),
    status          VARCHAR(50) DEFAULT 'applied',
    review_notes    TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE performance_reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    review_period   VARCHAR(100) NOT NULL,
    review_date     DATE NOT NULL,
    reviewed_by     UUID NOT NULL,
    ratings         JSONB DEFAULT '{}',
    overall_rating  DECIMAL(3,1),
    strengths       TEXT,
    areas_for_improvement TEXT,
    goals           JSONB DEFAULT '[]',
    comments        TEXT,
    status          VARCHAR(50) DEFAULT 'draft',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_performance_reviews_staff ON performance_reviews(staff_id);

-- ============================================================================
-- PART 22: VISITOR MANAGEMENT
-- ============================================================================

CREATE TABLE visitors (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    email           VARCHAR(255),
    address         TEXT,
    id_proof_type   VARCHAR(100),
    id_proof_number VARCHAR(100),
    purpose         TEXT NOT NULL,
    person_to_meet  VARCHAR(255),
    department      VARCHAR(100),
    check_in_time   TIMESTAMPTZ NOT NULL,
    check_out_time  TIMESTAMPTZ,
    vehicle_number  VARCHAR(50),
    badge_number    VARCHAR(50),
    temperature     DECIMAL(4,1),
    is_pre_approved BOOLEAN DEFAULT FALSE,
    status          VARCHAR(50) DEFAULT 'checked_in',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_visitors_branch ON visitors(branch_id);
CREATE INDEX idx_visitors_status ON visitors(status);
CREATE INDEX idx_visitors_date ON visitors(check_in_time);

-- ============================================================================
-- PART 23: ID CARDS & CERTIFICATES
-- ============================================================================

CREATE TABLE id_card_templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    template_type   VARCHAR(50) NOT NULL,
    design_config   JSONB NOT NULL DEFAULT '{}',
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE certificate_templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    certificate_type VARCHAR(100) NOT NULL,
    design_config   JSONB NOT NULL DEFAULT '{}',
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE certificates (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id           UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    certificate_number  VARCHAR(50) NOT NULL,
    template_id         UUID REFERENCES certificate_templates(id),
    recipient_type      VARCHAR(50) NOT NULL,
    recipient_id        UUID NOT NULL,
    issued_date         DATE NOT NULL,
    issue_reason        TEXT,
    certificate_url     TEXT,
    signed_by           UUID,
    status              VARCHAR(50) DEFAULT 'draft',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, branch_id, certificate_number)
);

-- ============================================================================
-- PART 24: AUDIT LOGGING
-- ============================================================================

CREATE TABLE audit_logs (
    id              UUID DEFAULT uuid_generate_v4(),
    tenant_id       UUID,
    user_id         UUID,
    branch_id       UUID,
    action          VARCHAR(100) NOT NULL,
    module          VARCHAR(100) NOT NULL,
    resource_type   VARCHAR(100),
    resource_id     UUID,
    description     TEXT,
    changes         JSONB DEFAULT '{}',
    metadata        JSONB DEFAULT '{}',
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    session_id      UUID,
    outcome         VARCHAR(20) DEFAULT 'success',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_module ON audit_logs(module);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Create monthly partitions for audit_logs
CREATE TABLE audit_logs_2026_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE audit_logs_2026_02 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE audit_logs_2026_03 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE audit_logs_2026_04 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE audit_logs_2026_05 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE audit_logs_2026_06 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE audit_logs_2026_07 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE audit_logs_2026_08 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE audit_logs_2026_09 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE audit_logs_2026_10 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE audit_logs_2026_11 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE audit_logs_2026_12 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
CREATE TABLE audit_logs_default PARTITION OF audit_logs DEFAULT;

-- ============================================================================
-- PART 25: SETTINGS & CONFIGURATION
-- ============================================================================

CREATE TABLE tenant_settings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    setting_key     VARCHAR(255) NOT NULL,
    setting_value   JSONB NOT NULL DEFAULT '{}',
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, setting_key)
);

CREATE TABLE branding_settings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    primary_color   VARCHAR(7) DEFAULT '#2563eb',
    secondary_color VARCHAR(7) DEFAULT '#1e40af',
    accent_color    VARCHAR(7) DEFAULT '#f59e0b',
    logo_url        TEXT,
    favicon_url     TEXT,
    login_bg_url    TEXT,
    login_page_text VARCHAR(255),
    footer_text     TEXT,
    custom_domain   VARCHAR(255),
    custom_css      TEXT,
    is_white_label  BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id)
);

CREATE TABLE system_config (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key      VARCHAR(255) UNIQUE NOT NULL,
    config_value    JSONB NOT NULL DEFAULT '{}',
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 26: FEATURE FLAGS
-- ============================================================================

CREATE TABLE feature_flags (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(100) UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    module          VARCHAR(100) NOT NULL,
    is_system       BOOLEAN DEFAULT FALSE,
    default_value   BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE plan_features (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id         UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    feature_flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
    is_enabled      BOOLEAN DEFAULT FALSE,
    feature_value   VARCHAR(255),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plan_id, feature_flag_id)
);

CREATE TABLE tenant_features (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    feature_flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
    is_enabled      BOOLEAN DEFAULT FALSE,
    feature_value   VARCHAR(255),
    override_plan   BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, feature_flag_id)
);

-- ============================================================================
-- PART 27: ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_academic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structure_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_concessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_fee_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_transport ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_hostel ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE branding_settings ENABLE ROW LEVEL SECURITY;

-- SuperAdmin bypass policy
CREATE POLICY superadmin_all_tenants ON tenants
    FOR ALL USING (
        current_setting('app.current_user_id', TRUE) IN (
            SELECT id FROM users WHERE is_superadmin = TRUE
        )
    );

-- Function to generate tenant isolation policy for any table
CREATE OR REPLACE FUNCTION create_tenant_isolation_policy(table_name TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format(
        'CREATE POLICY tenant_isolation_%s ON %I FOR ALL USING (
            tenant_id = current_setting(''app.current_tenant_id'')::UUID
            OR current_setting(''app.is_superadmin'', TRUE) = ''true''
        )',
        table_name, table_name
    );
END;
$$ LANGUAGE plpgsql;

-- Apply tenant isolation policies to all tenant-scoped tables
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'branches', 'users', 'roles',
        'academic_years', 'departments', 'classes', 'sections', 'subjects',
        'class_subjects', 'teacher_subjects',
        'enquiries', 'applications', 'students', 'student_documents',
        'parents', 'student_academic_records',
        'staff', 'staff_documents',
        'attendance', 'attendance_records', 'staff_attendance',
        'leave_types', 'leave_requests',
        'fee_structures', 'fee_structure_items', 'fee_discounts', 'fee_concessions',
        'student_fee_accounts', 'fee_transactions', 'fee_receipts', 'fee_invoices',
        'payroll', 'expenses', 'income',
        'exams', 'exam_schedules', 'marks', 'exam_results',
        'timetables', 'timetable_entries',
        'homework', 'homework_submissions', 'assignments', 'assignment_submissions', 'lesson_plans',
        'books', 'book_issues',
        'vehicles', 'drivers', 'routes', 'route_stops', 'student_transport',
        'hostel_rooms', 'hostel_beds', 'student_hostel', 'hostel_complaints',
        'notifications', 'notification_logs', 'announcements',
        'inventory_items', 'inventory_transactions', 'assets',
        'visitors', 'certificates',
        'tenant_settings', 'branding_settings'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        PERFORM create_tenant_isolation_policy(tbl);
    END LOOP;
END;
$$;

-- ============================================================================
-- PART 28: SEED DATA
-- ============================================================================

-- Default system roles (seeded for every new tenant)
INSERT INTO roles (tenant_id, name, slug, description, is_system, hierarchy_level) VALUES
    (NULL, 'ERP SuperAdmin', 'erp-superadmin', 'Platform-wide administrator', TRUE, 0);

-- Note: The following roles are created per-tenant at tenant creation time:
-- organization-owner, principal, reception, teacher, accountant, hr,
-- librarian, transport-manager, hostel-manager, lab-assistant, it-admin,
-- office-staff, parent, student

-- Default subscription plans
INSERT INTO plans (name, code, description, price_monthly, price_yearly, max_branches, max_users, max_students, max_staff, storage_limit_mb, features, sort_order) VALUES
    ('Basic', 'basic', 'For small schools and coaching centres', 0, 0, 1, 20, 200, 20, 200,
     '{"reception": false, "multi_branch": false, "custom_branding": false, "custom_login": false, "hostel": false, "transport": false, "library": false, "white_label": false, "api_access": false}',
     1),
    ('Pro', 'pro', 'For medium-sized institutions', 499, 4999, 1, 100, 1000, 50, 1024,
     '{"reception": true, "multi_branch": false, "custom_branding": true, "custom_login": true, "hostel": false, "transport": false, "library": false, "white_label": false, "api_access": false}',
     2),
    ('Enterprise', 'enterprise', 'For universities and school groups', 1999, 19999, 999, 9999, 50000, 5000, 10240,
     '{"reception": true, "multi_branch": true, "custom_branding": true, "custom_login": true, "hostel": true, "transport": true, "library": true, "white_label": true, "api_access": true}',
     3);

-- Default feature flags
INSERT INTO feature_flags (code, name, description, module, default_value) VALUES
    ('multi_branch', 'Multi-Branch Support', 'Allow multiple branches per institution', 'core', FALSE),
    ('reception', 'Reception Module', 'Reception dashboard and visitor management', 'admin', FALSE),
    ('hostel', 'Hostel Management', 'Hostel room, bed and student allocation', 'hostel', FALSE),
    ('transport', 'Transport Management', 'Vehicle, route and student transport', 'transport', FALSE),
    ('library', 'Library Management', 'Book catalogue, issue and return system', 'library', FALSE),
    ('cctv', 'CCTV Integration', 'CCTV camera monitoring integration', 'security', FALSE),
    ('ai_assistant', 'AI Assistant', 'AI-powered assistant for analytics', 'ai', FALSE),
    ('custom_branding', 'Custom Branding', 'Custom institution branding and theme', 'branding', FALSE),
    ('custom_login', 'Custom Login Page', 'Customized login page per institution', 'branding', FALSE),
    ('white_label', 'White Label', 'Remove ERP branding entirely', 'branding', FALSE),
    ('api_access', 'API Access', 'REST API access for third-party integration', 'api', FALSE),
    ('payroll', 'Payroll Management', 'Staff salary and payroll processing', 'hr', TRUE),
    ('assignments', 'Assignments Module', 'Digital assignment submission system', 'academic', TRUE),
    ('lesson_plans', 'Lesson Plans', 'Digital lesson planning for teachers', 'academic', TRUE),
    ('online_exams', 'Online Examinations', 'Conduct online exams on the platform', 'academic', FALSE),
    ('lms', 'LMS Module', 'Learning management system', 'academic', FALSE),
    ('video_conferencing', 'Video Conferencing', 'Integrated video conferencing for classes', 'communication', FALSE);

-- ============================================================================
-- PART 29: TRIGGERS & AUTOMATION
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT table_name FROM information_schema.columns
        WHERE column_name = 'updated_at'
        AND table_schema = 'public'
        AND table_name NOT LIKE 'audit_logs%'
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
            tbl, tbl
        );
    END LOOP;
END;
$$;

-- Auto-log critical actions
-- Usage: CREATE TRIGGER trg_audit_students AFTER INSERT OR UPDATE OR DELETE ON students
--     FOR EACH ROW EXECUTE FUNCTION log_audit_entry('action_name', 'module_name');
CREATE OR REPLACE FUNCTION log_audit_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_branch_id UUID;
    v_session_id UUID;
BEGIN
    BEGIN
        v_branch_id := current_setting('app.current_branch_id', TRUE)::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_branch_id := NULL;
    END;
    BEGIN
        v_session_id := current_setting('app.current_session_id', TRUE)::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_session_id := NULL;
    END;

    INSERT INTO audit_logs (
        tenant_id, user_id, branch_id, session_id,
        action, module, resource_type, resource_id,
        description, changes, ip_address, user_agent
    ) VALUES (
        current_setting('app.current_tenant_id', TRUE)::UUID,
        current_setting('app.current_user_id', TRUE)::UUID,
        v_branch_id, v_session_id,
        TG_ARGV[0], TG_ARGV[1], TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP || ' on ' || TG_TABLE_NAME,
        CASE
            WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb
            WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW))
            ELSE row_to_json(NEW)::jsonb
        END,
        current_setting('app.client_ip', TRUE),
        current_setting('app.user_agent', TRUE)
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
