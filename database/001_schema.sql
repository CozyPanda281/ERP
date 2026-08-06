-- ============================================================================
-- 001_schema.sql — CANONICAL BASE SCHEMA (AUTO-GENERATED — DO NOT HAND-EDIT)
-- ============================================================================
-- Provenance: regenerated from the application's source of truth,
-- backend/src/database/schema/** (Drizzle ORM), via:
--   1. npx drizzle-kit push --force  (to an EMPTY database)
--   2. pg_dump --schema-only --no-owner --no-privileges
-- The result is the exact physical schema the application expects (109
-- tables), byte-for-byte equivalent to a drizzle-generated database.
--
-- REGENERATION RULES
-- ------------------
-- * When the Drizzle schema changes, regenerate this file the same way and
--   verify: fresh-DB drill (001 + backend/db/migrations/*.sql in glob order,
--   ON_ERROR_STOP=1) then RLS parity check against the reference database
--   (dev): equal table set, equal relrowsecurity/relforcerowsecurity set.
-- * NEVER hand-edit table DDL here — migrations in backend/db/migrations/
--   are the only place schema evolution lives.
-- * This file carries NO RLS: row-level security is applied exclusively by
--   backend/db/migrations/rls-hardening.sql, rls-full-tenancy.sql and
--   phase7/9/10/11/12 (enable + policy + FORCE, in any glob order).
-- * PART 99 seed rows are the only data; tenant data comes from seed scripts.
--
-- Historical note: the previous hand-written 001_schema.sql (107 CREATE TABLE
-- statements, old module names like books/vehicles/hostel_rooms, monthly
-- audit_logs partitions, inline RLS section) had NEVER applied cleanly and no
-- longer matched the application schema. It was replaced by this file on
-- 2026-08-06.
-- ============================================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: academic_years; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academic_years (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_current boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: accounting_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    account_code character varying(50) NOT NULL,
    account_name character varying(200) NOT NULL,
    account_type character varying(50) NOT NULL,
    parent_id uuid,
    description text,
    opening_balance numeric(14,2) DEFAULT '0'::numeric,
    is_active boolean DEFAULT true,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);


--
-- Name: accounting_budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    fiscal_year_id uuid,
    account_id uuid NOT NULL,
    budgeted_amount numeric(14,2) NOT NULL,
    actual_amount numeric(14,2) DEFAULT '0'::numeric,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: accounting_journal_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_journal_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    entry_number character varying(50) NOT NULL,
    entry_date date NOT NULL,
    reference character varying(100),
    description text,
    entry_type character varying(50),
    status character varying(20) DEFAULT 'posted'::character varying,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: accounting_journal_entry_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_journal_entry_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    journal_entry_id uuid NOT NULL,
    account_id uuid NOT NULL,
    debit numeric(14,2) DEFAULT '0'::numeric,
    credit numeric(14,2) DEFAULT '0'::numeric,
    description text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    target_roles jsonb DEFAULT '[]'::jsonb,
    target_classes jsonb DEFAULT '[]'::jsonb,
    attachment_urls jsonb DEFAULT '[]'::jsonb,
    priority character varying(10) DEFAULT 'low'::character varying,
    is_pinned boolean DEFAULT false,
    published_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    key_prefix character varying(20) NOT NULL,
    key_hash character varying(255) NOT NULL,
    scopes text DEFAULT 'read'::text,
    rate_limit_per_minute integer DEFAULT 60,
    created_by uuid,
    last_used_at timestamp with time zone,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    application_number character varying(50) NOT NULL,
    enquiry_id uuid,
    student_first_name character varying(100) NOT NULL,
    student_last_name character varying(100) NOT NULL,
    date_of_birth date,
    gender character varying(10),
    nationality character varying(100) DEFAULT 'Indian'::character varying,
    religion character varying(100),
    caste character varying(100),
    category character varying(50),
    address text,
    city character varying(100),
    state character varying(100),
    pincode character varying(10),
    phone character varying(20),
    email character varying(255),
    blood_group character varying(5),
    father_name character varying(255),
    father_phone character varying(20),
    father_email character varying(255),
    father_occupation character varying(100),
    mother_name character varying(255),
    mother_phone character varying(20),
    mother_email character varying(255),
    mother_occupation character varying(100),
    guardian_name character varying(255),
    guardian_relation character varying(50),
    guardian_phone character varying(20),
    previous_school character varying(255),
    previous_class character varying(50),
    class_id uuid,
    academic_year_id uuid,
    documents jsonb DEFAULT '{}'::jsonb,
    status character varying(50) DEFAULT 'pending'::character varying,
    review_remarks text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    admitted boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    scheduled_at timestamp with time zone NOT NULL,
    duration_minutes integer DEFAULT 30,
    location character varying(200),
    mode character varying(20) DEFAULT 'in_person'::character varying,
    requested_by uuid NOT NULL,
    requested_by_role character varying(50) NOT NULL,
    requested_by_name character varying(255) NOT NULL,
    participants jsonb DEFAULT '[]'::jsonb,
    status character varying(20) DEFAULT 'pending'::character varying,
    cancelled_reason text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    asset_type character varying(100) NOT NULL,
    asset_code character varying(50),
    description text,
    purchase_date date,
    purchase_price numeric(12,2),
    current_value numeric(12,2),
    depreciation_method character varying(50),
    depreciation_rate numeric(5,2),
    warranty_expiry date,
    warranty_details text,
    location character varying(255),
    status character varying(50) DEFAULT 'active'::character varying,
    assigned_to uuid,
    condition_note text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);


--
-- Name: assignment_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    assignment_id uuid NOT NULL,
    student_id uuid NOT NULL,
    submission_text text,
    attachment_urls jsonb DEFAULT '[]'::jsonb,
    submitted_at timestamp with time zone DEFAULT now(),
    is_late boolean DEFAULT false,
    marks_obtained numeric(6,2),
    feedback text,
    status character varying(50) DEFAULT 'submitted'::character varying,
    graded_by uuid,
    graded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    class_id uuid NOT NULL,
    section_id uuid,
    subject_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    assignment_type character varying(50) DEFAULT 'written'::character varying,
    attachment_urls jsonb DEFAULT '[]'::jsonb,
    due_date timestamp with time zone NOT NULL,
    max_marks integer,
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    class_id uuid,
    section_id uuid,
    subject_id uuid,
    teacher_id uuid,
    timetable_entry_id uuid,
    date date NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    total_present integer DEFAULT 0,
    total_absent integer DEFAULT 0,
    total_students integer DEFAULT 0,
    remarks text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: attendance_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    attendance_id uuid NOT NULL,
    student_id uuid NOT NULL,
    status character varying(20) DEFAULT 'present'::character varying NOT NULL,
    check_in_time time without time zone,
    check_out_time time without time zone,
    remarks text,
    marked_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    user_id uuid,
    branch_id uuid,
    action character varying(100) NOT NULL,
    module character varying(100) NOT NULL,
    resource_type character varying(100),
    resource_id uuid,
    description text,
    changes jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    ip_address character varying(45),
    user_agent text,
    session_id uuid,
    outcome character varying(20) DEFAULT 'success'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: book_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.book_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    email character varying(255),
    phone character varying(20),
    address text,
    city character varying(100),
    state character varying(100),
    pincode character varying(10),
    principal_id uuid,
    status character varying(20) DEFAULT 'active'::character varying,
    established_date date,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: branding_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branding_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    primary_color character varying(7) DEFAULT '#2563eb'::character varying,
    secondary_color character varying(7) DEFAULT '#1e40af'::character varying,
    accent_color character varying(7) DEFAULT '#f59e0b'::character varying,
    logo_url text,
    favicon_url text,
    login_bg_url text,
    login_page_text character varying(255),
    footer_text text,
    custom_domain character varying(255),
    custom_css text,
    is_white_label boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: certificate_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certificate_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    certificate_type character varying(100) NOT NULL,
    design_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certificates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    certificate_number character varying(50) NOT NULL,
    template_id uuid,
    recipient_type character varying(50) NOT NULL,
    recipient_id uuid NOT NULL,
    issued_date date NOT NULL,
    issue_reason text,
    certificate_url text,
    signed_by uuid,
    status character varying(50) DEFAULT 'draft'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: circulars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.circulars (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    circular_number character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    target_roles jsonb DEFAULT '[]'::jsonb,
    attachment_urls jsonb DEFAULT '[]'::jsonb,
    issue_date date NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: class_subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    class_id uuid NOT NULL,
    subject_id uuid NOT NULL,
    is_compulsory boolean DEFAULT true,
    max_marks integer DEFAULT 100,
    pass_marks integer DEFAULT 33,
    credit_hours numeric(4,1) DEFAULT '0'::numeric,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: classes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.classes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50),
    description text,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50),
    description text,
    hod_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: enquiries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enquiries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    student_name character varying(255) NOT NULL,
    date_of_birth date,
    gender character varying(10),
    parent_name character varying(255),
    parent_phone character varying(20),
    parent_email character varying(255),
    address text,
    class_id uuid,
    academic_year_id uuid,
    source character varying(100),
    status character varying(50) DEFAULT 'new'::character varying,
    remarks text,
    follow_up_date date,
    assigned_to uuid,
    converted_to_application boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: exam_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    exam_id uuid NOT NULL,
    student_id uuid NOT NULL,
    total_marks numeric(8,2) DEFAULT '0'::numeric,
    percentage numeric(5,2),
    grade character varying(5),
    rank integer,
    result_status character varying(20) DEFAULT 'pass'::character varying,
    is_promoted boolean,
    remarks text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: exam_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    exam_id uuid NOT NULL,
    subject_id uuid NOT NULL,
    class_id uuid,
    date date,
    start_time time without time zone,
    end_time time without time zone,
    max_marks integer DEFAULT 100,
    pass_marks integer DEFAULT 33,
    room_number character varying(50),
    invigilator_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    exam_type character varying(20) DEFAULT 'unit_test'::character varying,
    class_id uuid,
    academic_year_id uuid,
    start_date date,
    end_date date,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    category_id uuid,
    amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    description text NOT NULL,
    expense_date date NOT NULL,
    payment_method character varying(20),
    reference_number character varying(100),
    vendor_name character varying(255),
    bill_number character varying(100),
    bill_url text,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: feature_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    module character varying(100) NOT NULL,
    is_system boolean DEFAULT false,
    default_value boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: fee_concessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_concessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    student_id uuid NOT NULL,
    fee_structure_item_id uuid,
    discount_id uuid,
    amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    type character varying(20) NOT NULL,
    approved_by uuid,
    valid_from date,
    valid_until date,
    remarks text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: fee_discounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_discounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    discount_type character varying(20) NOT NULL,
    value numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    applicable_to character varying(50) DEFAULT 'all'::character varying,
    applicable_ids jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    valid_from date,
    valid_until date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: fee_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    student_id uuid NOT NULL,
    invoice_number character varying(50) NOT NULL,
    invoice_date date NOT NULL,
    due_date date NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    subtotal numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    discount_total numeric(12,2) DEFAULT '0'::numeric,
    total_amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    amount_paid numeric(12,2) DEFAULT '0'::numeric,
    balance_due numeric(12,2) DEFAULT '0'::numeric,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: fee_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    transaction_id uuid NOT NULL,
    receipt_number character varying(50) NOT NULL,
    receipt_date date NOT NULL,
    receipt_url text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: fee_structure_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_structure_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    fee_structure_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    is_optional boolean DEFAULT false,
    is_recurring boolean DEFAULT true,
    frequency character varying(50) DEFAULT 'monthly'::character varying,
    due_day integer,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: fee_structures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_structures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    class_id uuid,
    academic_year_id uuid,
    frequency character varying(50) DEFAULT 'monthly'::character varying,
    is_active boolean DEFAULT true,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: fee_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fee_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    student_id uuid NOT NULL,
    fee_account_id uuid,
    transaction_no character varying(50) NOT NULL,
    invoice_no character varying(50),
    amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    payment_method character varying(20),
    payment_date timestamp with time zone DEFAULT now(),
    due_date date,
    paid_date date,
    reference_number character varying(100),
    cheque_number character varying(50),
    cheque_date date,
    bank_name character varying(255),
    upi_id character varying(100),
    gateway_response jsonb DEFAULT '{}'::jsonb,
    status character varying(20) DEFAULT 'completed'::character varying,
    remarks text,
    reconciled boolean DEFAULT false,
    reconciled_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: homework; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.homework (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    class_id uuid NOT NULL,
    section_id uuid,
    subject_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    attachment_urls jsonb DEFAULT '[]'::jsonb,
    due_date timestamp with time zone NOT NULL,
    max_marks integer,
    is_mandatory boolean DEFAULT true,
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: homework_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.homework_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    homework_id uuid NOT NULL,
    student_id uuid NOT NULL,
    submission_text text,
    attachment_urls jsonb DEFAULT '[]'::jsonb,
    submitted_at timestamp with time zone DEFAULT now(),
    is_late boolean DEFAULT false,
    marks_obtained numeric(6,2),
    feedback text,
    status character varying(50) DEFAULT 'submitted'::character varying,
    graded_by uuid,
    graded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: hostel_attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hostel_attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    hostel_id uuid NOT NULL,
    student_id uuid NOT NULL,
    date date NOT NULL,
    check_in timestamp without time zone,
    check_out timestamp without time zone,
    status character varying(20) DEFAULT 'present'::character varying,
    remarks text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: hostel_bed_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hostel_bed_allocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    room_id uuid NOT NULL,
    student_id uuid NOT NULL,
    bed_number character varying(20),
    allocation_date date NOT NULL,
    vacate_date date,
    status character varying(20) DEFAULT 'active'::character varying,
    remarks text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);


--
-- Name: hostel_discipline; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hostel_discipline (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    student_id uuid NOT NULL,
    incident_date date NOT NULL,
    incident_type character varying(100) NOT NULL,
    description text,
    action_taken text,
    reported_by uuid,
    status character varying(20) DEFAULT 'resolved'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: hostel_rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hostel_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hostel_id uuid NOT NULL,
    room_number character varying(20) NOT NULL,
    floor integer,
    capacity integer DEFAULT 1,
    bed_count integer DEFAULT 1,
    room_type character varying(50),
    rent_amount numeric(10,2),
    is_active boolean DEFAULT true,
    status character varying(20) DEFAULT 'available'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);


--
-- Name: hostel_visitors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hostel_visitors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    student_id uuid NOT NULL,
    visitor_name character varying(255) NOT NULL,
    relationship character varying(100),
    phone character varying(20),
    visit_date date NOT NULL,
    check_in_time timestamp without time zone,
    check_out_time timestamp without time zone,
    purpose text,
    id_proof character varying(100),
    id_number character varying(100),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: hostels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hostels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    code character varying(50),
    address text,
    warden_id uuid,
    total_rooms integer DEFAULT 0,
    total_beds integer DEFAULT 0,
    is_active boolean DEFAULT true,
    status character varying(20) DEFAULT 'active'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);


--
-- Name: id_card_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.id_card_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    template_type character varying(50) NOT NULL,
    design_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: import_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid,
    entity_type character varying(100) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_type character varying(50) NOT NULL,
    original_file_name text,
    file_size integer,
    total_rows integer DEFAULT 0,
    valid_rows integer DEFAULT 0,
    error_rows integer DEFAULT 0,
    status character varying(50) DEFAULT 'pending_review'::character varying,
    preview_data jsonb DEFAULT '[]'::jsonb,
    column_mapping jsonb DEFAULT '{}'::jsonb,
    validation_errors jsonb DEFAULT '[]'::jsonb,
    deployed_at timestamp with time zone,
    deployed_by uuid,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_notes text,
    rejection_reason text,
    rollback_data jsonb DEFAULT '[]'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: income; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.income (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    category_id uuid,
    amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    description text NOT NULL,
    income_date date NOT NULL,
    payment_method character varying(20),
    reference_number character varying(100),
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: income_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.income_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: inventory_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    code character varying(50),
    description text,
    parent_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);


--
-- Name: inventory_goods_receipt_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_goods_receipt_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    grn_id uuid NOT NULL,
    item_id uuid NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: inventory_goods_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_goods_receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    po_id uuid,
    receipt_number character varying(50) NOT NULL,
    receipt_date date NOT NULL,
    notes text,
    status character varying(20) DEFAULT 'received'::character varying,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    category_id uuid,
    name character varying(200) NOT NULL,
    code character varying(50),
    unit character varying(50),
    reorder_level integer DEFAULT 0,
    current_stock integer DEFAULT 0,
    unit_price numeric(10,2),
    tax_rate numeric(5,2) DEFAULT '0'::numeric,
    is_active boolean DEFAULT true,
    status character varying(20) DEFAULT 'active'::character varying,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);


--
-- Name: inventory_purchase_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_purchase_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    po_id uuid NOT NULL,
    item_id uuid NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(12,2),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: inventory_purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    order_number character varying(50) NOT NULL,
    supplier_id uuid NOT NULL,
    order_date date NOT NULL,
    expected_date date,
    status character varying(20) DEFAULT 'draft'::character varying,
    total_amount numeric(12,2),
    notes text,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);


--
-- Name: inventory_stock_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_stock_adjustments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    item_id uuid NOT NULL,
    adjustment_type character varying(20) NOT NULL,
    quantity integer NOT NULL,
    reason character varying(200),
    reference_number character varying(50),
    adjusted_by uuid,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: inventory_suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    code character varying(50),
    contact_person character varying(100),
    phone character varying(20),
    email character varying(200),
    address text,
    is_active boolean DEFAULT true,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);


--
-- Name: job_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    job_posting_id uuid NOT NULL,
    applicant_name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(20),
    resume_url text,
    cover_letter text,
    qualification text,
    experience_years numeric(4,1),
    current_company character varying(255),
    current_ctc character varying(100),
    expected_ctc character varying(100),
    notice_period character varying(50),
    status character varying(50) DEFAULT 'applied'::character varying,
    review_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: job_postings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_postings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    department_id uuid,
    employment_type character varying(20) DEFAULT 'permanent'::character varying,
    description text,
    requirements text,
    salary_range character varying(100),
    location character varying(255),
    vacancies integer DEFAULT 1,
    posted_date date,
    closing_date date,
    status character varying(50) DEFAULT 'open'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    leave_type_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    total_days integer NOT NULL,
    reason text,
    status character varying(20) DEFAULT 'pending'::character varying,
    approved_by uuid,
    approved_at timestamp with time zone,
    reject_reason text,
    document_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: leave_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    days_allowed integer NOT NULL,
    is_paid boolean DEFAULT true,
    carry_forward boolean DEFAULT false,
    max_carry_forward integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: lesson_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    subject_id uuid NOT NULL,
    class_id uuid NOT NULL,
    section_id uuid,
    title character varying(255) NOT NULL,
    objectives text,
    content text,
    teaching_method character varying(100),
    resources text,
    duration_minutes integer,
    date date,
    status character varying(50) DEFAULT 'draft'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: library_books; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.library_books (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    title character varying(300) NOT NULL,
    author character varying(200),
    isbn character varying(50),
    publisher character varying(200),
    edition character varying(50),
    category character varying(100),
    language character varying(50) DEFAULT 'English'::character varying,
    total_copies integer DEFAULT 1,
    available_copies integer DEFAULT 1,
    shelf_location character varying(50),
    is_active boolean DEFAULT true,
    status character varying(20) DEFAULT 'active'::character varying,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);


--
-- Name: library_issues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.library_issues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    member_id uuid NOT NULL,
    book_id uuid NOT NULL,
    issue_date date NOT NULL,
    due_date date NOT NULL,
    return_date date,
    status character varying(20) DEFAULT 'issued'::character varying,
    fine_amount numeric(10,2) DEFAULT '0'::numeric,
    remarks text,
    issued_by uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: library_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.library_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    member_id uuid NOT NULL,
    member_type character varying(20) NOT NULL,
    membership_date date NOT NULL,
    expiry_date date,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);


--
-- Name: marks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    exam_schedule_id uuid NOT NULL,
    student_id uuid NOT NULL,
    marks_obtained numeric(6,2),
    max_marks integer DEFAULT 100,
    is_absent boolean DEFAULT false,
    is_malpractice boolean DEFAULT false,
    grade character varying(5),
    grade_point numeric(3,1),
    remarks text,
    entered_by uuid,
    entered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: notification_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    notification_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    recipient_type character varying(50) NOT NULL,
    channel character varying(10) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    sent_at timestamp with time zone,
    delivered_at timestamp with time zone,
    read_at timestamp with time zone,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: notification_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    name character varying(255) NOT NULL,
    code character varying(100) NOT NULL,
    type character varying(10) NOT NULL,
    subject character varying(255),
    body text NOT NULL,
    variables jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid,
    sender_id uuid,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    type character varying(10) DEFAULT 'in_app'::character varying,
    priority character varying(10) DEFAULT 'low'::character varying,
    target_roles jsonb DEFAULT '[]'::jsonb,
    target_users jsonb DEFAULT '[]'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    allow_dismiss boolean DEFAULT true,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: parents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    relationship character varying(50) NOT NULL,
    phone character varying(20),
    email character varying(255),
    occupation character varying(100),
    income numeric(10,2),
    address text,
    is_primary boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: payroll; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    basic_pay numeric(10,2) DEFAULT '0'::numeric,
    allowances jsonb DEFAULT '[]'::jsonb,
    deductions jsonb DEFAULT '[]'::jsonb,
    gross_pay numeric(10,2) DEFAULT '0'::numeric,
    total_deductions numeric(10,2) DEFAULT '0'::numeric,
    net_pay numeric(10,2) DEFAULT '0'::numeric,
    payment_date date,
    payment_method character varying(20),
    transaction_ref character varying(100),
    status character varying(50) DEFAULT 'draft'::character varying,
    remarks text,
    processed_by uuid,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: payroll_salary_components; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_salary_components (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(20) NOT NULL,
    calculation_type character varying(50) DEFAULT 'fixed'::character varying,
    value numeric(10,2) DEFAULT '0'::numeric,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: performance_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.performance_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    review_period character varying(100) NOT NULL,
    review_date date NOT NULL,
    reviewed_by uuid NOT NULL,
    ratings jsonb DEFAULT '{}'::jsonb,
    overall_rating numeric(3,1),
    strengths text,
    areas_for_improvement text,
    goals jsonb DEFAULT '[]'::jsonb,
    comments text,
    status character varying(50) DEFAULT 'draft'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    module character varying(100) NOT NULL,
    description text,
    is_system boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: plan_features; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_features (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    feature_flag_id uuid NOT NULL,
    is_enabled boolean DEFAULT false,
    feature_value character varying(255),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    price_monthly numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    price_yearly numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    max_branches integer DEFAULT 1,
    max_users integer DEFAULT 50,
    max_students integer DEFAULT 500,
    max_staff integer DEFAULT 50,
    storage_limit_mb integer DEFAULT 500,
    features jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    description text,
    is_system boolean DEFAULT false,
    hierarchy_level integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    class_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50),
    capacity integer DEFAULT 0,
    room_number character varying(50),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    user_id uuid,
    employee_code character varying(50) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    date_of_birth date,
    gender character varying(10),
    blood_group character varying(5),
    phone character varying(20),
    email character varying(255),
    address text,
    city character varying(100),
    state character varying(100),
    pincode character varying(10),
    qualification text,
    experience_years numeric(4,1),
    joining_date date,
    employment_type character varying(20) DEFAULT 'permanent'::character varying,
    designation character varying(100),
    department_id uuid,
    basic_salary numeric(10,2),
    bank_name character varying(255),
    bank_account_no character varying(50),
    ifsc_code character varying(20),
    pan_number character varying(20),
    aadhar_number character varying(20),
    is_active boolean DEFAULT true,
    is_teaching boolean DEFAULT false,
    profile_photo_url text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: staff_attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    date date NOT NULL,
    check_in timestamp with time zone,
    check_out timestamp with time zone,
    status character varying(10) DEFAULT 'present'::character varying,
    hours_worked numeric(4,1),
    overtime_hours numeric(4,1),
    remarks text,
    marked_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: staff_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    document_type character varying(100) NOT NULL,
    document_number character varying(100),
    file_url text NOT NULL,
    is_verified boolean DEFAULT false,
    verified_at timestamp with time zone,
    verified_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: student_academic_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_academic_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    student_id uuid NOT NULL,
    class_id uuid NOT NULL,
    section_id uuid,
    academic_year_id uuid NOT NULL,
    roll_number character varying(50),
    is_promoted boolean DEFAULT false,
    promoted_to_class uuid,
    promotion_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: student_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    student_id uuid NOT NULL,
    document_type character varying(100) NOT NULL,
    document_name character varying(255),
    document_number character varying(100),
    file_url text NOT NULL,
    file_size integer,
    mime_type character varying(100),
    is_verified boolean DEFAULT false,
    verified_at timestamp with time zone,
    verified_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: student_fee_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_fee_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    student_id uuid NOT NULL,
    fee_structure_id uuid,
    academic_year_id uuid,
    total_fee numeric(12,2) DEFAULT '0'::numeric,
    total_discount numeric(12,2) DEFAULT '0'::numeric,
    total_paid numeric(12,2) DEFAULT '0'::numeric,
    total_due numeric(12,2) DEFAULT '0'::numeric,
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: student_parents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_parents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    student_id uuid NOT NULL,
    parent_id uuid NOT NULL,
    relationship character varying(50) NOT NULL,
    is_primary boolean DEFAULT false,
    is_emergency_contact boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    admission_number character varying(50) NOT NULL,
    roll_number character varying(50),
    application_id uuid,
    first_name character varying(100) NOT NULL,
    middle_name character varying(100),
    last_name character varying(100) NOT NULL,
    date_of_birth date,
    gender character varying(10),
    blood_group character varying(5),
    nationality character varying(100) DEFAULT 'Indian'::character varying,
    religion character varying(100),
    caste character varying(100),
    category character varying(50),
    address text,
    city character varying(100),
    state character varying(100),
    pincode character varying(10),
    phone character varying(20),
    email character varying(255),
    profile_photo_url text,
    aadhar_number character varying(20),
    samagra_id character varying(50),
    is_active boolean DEFAULT true,
    status character varying(50) DEFAULT 'active'::character varying,
    admission_date date,
    leaving_date date,
    leaving_reason text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50),
    subject_type character varying(20) DEFAULT 'theory'::character varying,
    description text,
    is_language boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    billing_cycle character varying(20) DEFAULT 'monthly'::character varying,
    status character varying(20) DEFAULT 'trial'::character varying,
    auto_renew boolean DEFAULT true,
    trial_ends_at date,
    cancelled_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: system_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_key character varying(255) NOT NULL,
    config_value jsonb DEFAULT '{}'::jsonb NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: teacher_subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teacher_subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    subject_id uuid NOT NULL,
    class_id uuid NOT NULL,
    section_id uuid,
    is_class_teacher boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: tenant_features; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_features (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    feature_flag_id uuid NOT NULL,
    is_enabled boolean DEFAULT false,
    feature_value character varying(255),
    override_plan boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: tenant_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    setting_key character varying(255) NOT NULL,
    setting_value jsonb DEFAULT '{}'::jsonb NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(100) NOT NULL,
    email character varying(255),
    phone character varying(20),
    address text,
    city character varying(100),
    state character varying(100),
    pincode character varying(10),
    country character varying(100) DEFAULT 'India'::character varying,
    logo_url text,
    status character varying(20) DEFAULT 'trial'::character varying,
    max_branches integer DEFAULT 1,
    max_users integer DEFAULT 50,
    max_students integer DEFAULT 500,
    max_staff integer DEFAULT 50,
    storage_limit_mb integer DEFAULT 500,
    is_active boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: timetable_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timetable_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    timetable_id uuid NOT NULL,
    day_of_week smallint NOT NULL,
    subject_id uuid NOT NULL,
    teacher_id uuid,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    room_number character varying(50),
    is_break boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: timetables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timetables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    class_id uuid NOT NULL,
    section_id uuid,
    academic_year_id uuid,
    is_active boolean DEFAULT true,
    valid_from date,
    valid_until date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: transport_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transport_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    student_id uuid NOT NULL,
    route_id uuid NOT NULL,
    stop_id uuid,
    academic_year_id uuid,
    effective_from date NOT NULL,
    effective_to date,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);


--
-- Name: transport_fuel_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transport_fuel_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    fuel_date date NOT NULL,
    fuel_type character varying(50),
    quantity_liters numeric(8,2) NOT NULL,
    cost_per_liter numeric(8,2),
    total_cost numeric(10,2),
    odometer_reading integer,
    vendor_name character varying(255),
    bill_number character varying(100),
    bill_url text,
    remarks text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: transport_maintenance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transport_maintenance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    maintenance_type character varying(100) NOT NULL,
    description text,
    service_date date NOT NULL,
    cost numeric(10,2),
    service_center character varying(255),
    bill_number character varying(100),
    bill_url text,
    next_service_date date,
    odometer_reading integer,
    remarks text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: transport_route_stops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transport_route_stops (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    route_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    address text,
    latitude character varying(50),
    longitude character varying(50),
    stop_order integer NOT NULL,
    pickup_time character varying(10),
    drop_time character varying(10),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: transport_routes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transport_routes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    vehicle_id uuid,
    description text,
    distance numeric(10,2),
    fare numeric(10,2),
    is_active boolean DEFAULT true,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);


--
-- Name: transport_vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transport_vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    vehicle_number character varying(50) NOT NULL,
    model character varying(100),
    capacity integer,
    driver_name character varying(100),
    driver_phone character varying(20),
    insurance_expiry date,
    is_active boolean DEFAULT true,
    status character varying(20) DEFAULT 'active'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    deleted_at timestamp without time zone
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    branch_id uuid,
    assigned_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    tenant_id uuid,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    ip_address character varying(45),
    user_agent text,
    device_info jsonb DEFAULT '{}'::jsonb,
    device_type character varying(50),
    is_active boolean DEFAULT true,
    expires_at timestamp with time zone NOT NULL,
    refresh_expires_at timestamp with time zone NOT NULL,
    last_activity timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    email character varying(255),
    phone character varying(20),
    password_hash character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    avatar_url text,
    gender character varying(10),
    date_of_birth date,
    address text,
    is_superadmin boolean DEFAULT false,
    is_active boolean DEFAULT true,
    status character varying(20) DEFAULT 'active'::character varying,
    two_factor_enabled boolean DEFAULT false,
    two_factor_secret character varying(255),
    last_login_at timestamp with time zone,
    last_login_ip character varying(45),
    login_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    password_changed_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: visitors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visitors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    phone character varying(20),
    email character varying(255),
    address text,
    id_proof_type character varying(100),
    id_proof_number character varying(100),
    purpose text NOT NULL,
    person_to_meet character varying(255),
    department character varying(100),
    check_in_time timestamp with time zone NOT NULL,
    check_out_time timestamp with time zone,
    vehicle_number character varying(50),
    badge_number character varying(50),
    temperature numeric(4,1),
    is_pre_approved boolean DEFAULT false,
    status character varying(50) DEFAULT 'checked_in'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: webhook_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    webhook_endpoint_id uuid NOT NULL,
    event character varying(100) NOT NULL,
    payload text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    response_status integer,
    response_body text,
    error text,
    sent_at timestamp with time zone,
    next_retry_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: webhook_endpoints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_endpoints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    url text NOT NULL,
    secret character varying(255) NOT NULL,
    events text DEFAULT '*'::text NOT NULL,
    description text,
    created_by uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: academic_years academic_years_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_years
    ADD CONSTRAINT academic_years_pkey PRIMARY KEY (id);


--
-- Name: accounting_accounts accounting_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_accounts
    ADD CONSTRAINT accounting_accounts_pkey PRIMARY KEY (id);


--
-- Name: accounting_budgets accounting_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_budgets
    ADD CONSTRAINT accounting_budgets_pkey PRIMARY KEY (id);


--
-- Name: accounting_journal_entries accounting_journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_journal_entries
    ADD CONSTRAINT accounting_journal_entries_pkey PRIMARY KEY (id);


--
-- Name: accounting_journal_entry_items accounting_journal_entry_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_journal_entry_items
    ADD CONSTRAINT accounting_journal_entry_items_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: assignment_submissions assignment_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_pkey PRIMARY KEY (id);


--
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: attendance_records attendance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_id_created_at_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_id_created_at_pk PRIMARY KEY (id, created_at);


--
-- Name: book_categories book_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.book_categories
    ADD CONSTRAINT book_categories_pkey PRIMARY KEY (id);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: branding_settings branding_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branding_settings
    ADD CONSTRAINT branding_settings_pkey PRIMARY KEY (id);


--
-- Name: certificate_templates certificate_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificate_templates
    ADD CONSTRAINT certificate_templates_pkey PRIMARY KEY (id);


--
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (id);


--
-- Name: circulars circulars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.circulars
    ADD CONSTRAINT circulars_pkey PRIMARY KEY (id);


--
-- Name: class_subjects class_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_subjects
    ADD CONSTRAINT class_subjects_pkey PRIMARY KEY (id);


--
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: enquiries enquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_pkey PRIMARY KEY (id);


--
-- Name: exam_results exam_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_results
    ADD CONSTRAINT exam_results_pkey PRIMARY KEY (id);


--
-- Name: exam_schedules exam_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_schedules
    ADD CONSTRAINT exam_schedules_pkey PRIMARY KEY (id);


--
-- Name: exams exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_pkey PRIMARY KEY (id);


--
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: feature_flags feature_flags_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_code_unique UNIQUE (code);


--
-- Name: feature_flags feature_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (id);


--
-- Name: fee_concessions fee_concessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_concessions
    ADD CONSTRAINT fee_concessions_pkey PRIMARY KEY (id);


--
-- Name: fee_discounts fee_discounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_discounts
    ADD CONSTRAINT fee_discounts_pkey PRIMARY KEY (id);


--
-- Name: fee_invoices fee_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_invoices
    ADD CONSTRAINT fee_invoices_pkey PRIMARY KEY (id);


--
-- Name: fee_receipts fee_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_receipts
    ADD CONSTRAINT fee_receipts_pkey PRIMARY KEY (id);


--
-- Name: fee_structure_items fee_structure_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_structure_items
    ADD CONSTRAINT fee_structure_items_pkey PRIMARY KEY (id);


--
-- Name: fee_structures fee_structures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_structures
    ADD CONSTRAINT fee_structures_pkey PRIMARY KEY (id);


--
-- Name: fee_transactions fee_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_transactions
    ADD CONSTRAINT fee_transactions_pkey PRIMARY KEY (id);


--
-- Name: homework homework_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homework
    ADD CONSTRAINT homework_pkey PRIMARY KEY (id);


--
-- Name: homework_submissions homework_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homework_submissions
    ADD CONSTRAINT homework_submissions_pkey PRIMARY KEY (id);


--
-- Name: hostel_attendance hostel_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostel_attendance
    ADD CONSTRAINT hostel_attendance_pkey PRIMARY KEY (id);


--
-- Name: hostel_bed_allocations hostel_bed_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostel_bed_allocations
    ADD CONSTRAINT hostel_bed_allocations_pkey PRIMARY KEY (id);


--
-- Name: hostel_discipline hostel_discipline_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostel_discipline
    ADD CONSTRAINT hostel_discipline_pkey PRIMARY KEY (id);


--
-- Name: hostel_rooms hostel_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostel_rooms
    ADD CONSTRAINT hostel_rooms_pkey PRIMARY KEY (id);


--
-- Name: hostel_visitors hostel_visitors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostel_visitors
    ADD CONSTRAINT hostel_visitors_pkey PRIMARY KEY (id);


--
-- Name: hostels hostels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hostels
    ADD CONSTRAINT hostels_pkey PRIMARY KEY (id);


--
-- Name: id_card_templates id_card_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.id_card_templates
    ADD CONSTRAINT id_card_templates_pkey PRIMARY KEY (id);


--
-- Name: import_batches import_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT import_batches_pkey PRIMARY KEY (id);


--
-- Name: income_categories income_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.income_categories
    ADD CONSTRAINT income_categories_pkey PRIMARY KEY (id);


--
-- Name: income income_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.income
    ADD CONSTRAINT income_pkey PRIMARY KEY (id);


--
-- Name: inventory_categories inventory_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_categories
    ADD CONSTRAINT inventory_categories_pkey PRIMARY KEY (id);


--
-- Name: inventory_goods_receipt_items inventory_goods_receipt_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_goods_receipt_items
    ADD CONSTRAINT inventory_goods_receipt_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_goods_receipts inventory_goods_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_goods_receipts
    ADD CONSTRAINT inventory_goods_receipts_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_purchase_order_items inventory_purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_purchase_order_items
    ADD CONSTRAINT inventory_purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_purchase_orders inventory_purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_purchase_orders
    ADD CONSTRAINT inventory_purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: inventory_stock_adjustments inventory_stock_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_stock_adjustments
    ADD CONSTRAINT inventory_stock_adjustments_pkey PRIMARY KEY (id);


--
-- Name: inventory_suppliers inventory_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_suppliers
    ADD CONSTRAINT inventory_suppliers_pkey PRIMARY KEY (id);


--
-- Name: job_applications job_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_applications
    ADD CONSTRAINT job_applications_pkey PRIMARY KEY (id);


--
-- Name: job_postings job_postings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_postings
    ADD CONSTRAINT job_postings_pkey PRIMARY KEY (id);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: leave_types leave_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_types
    ADD CONSTRAINT leave_types_pkey PRIMARY KEY (id);


--
-- Name: lesson_plans lesson_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_plans
    ADD CONSTRAINT lesson_plans_pkey PRIMARY KEY (id);


--
-- Name: library_books library_books_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_books
    ADD CONSTRAINT library_books_pkey PRIMARY KEY (id);


--
-- Name: library_issues library_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_issues
    ADD CONSTRAINT library_issues_pkey PRIMARY KEY (id);


--
-- Name: library_members library_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_members
    ADD CONSTRAINT library_members_pkey PRIMARY KEY (id);


--
-- Name: marks marks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marks
    ADD CONSTRAINT marks_pkey PRIMARY KEY (id);


--
-- Name: notification_logs notification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_pkey PRIMARY KEY (id);


--
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: parents parents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parents
    ADD CONSTRAINT parents_pkey PRIMARY KEY (id);


--
-- Name: payroll payroll_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll
    ADD CONSTRAINT payroll_pkey PRIMARY KEY (id);


--
-- Name: payroll_salary_components payroll_salary_components_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_salary_components
    ADD CONSTRAINT payroll_salary_components_pkey PRIMARY KEY (id);


--
-- Name: performance_reviews performance_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_reviews
    ADD CONSTRAINT performance_reviews_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_slug_unique UNIQUE (slug);


--
-- Name: plan_features plan_features_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_pkey PRIMARY KEY (id);


--
-- Name: plans plans_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_code_unique UNIQUE (code);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sections sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_pkey PRIMARY KEY (id);


--
-- Name: staff_attendance staff_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT staff_attendance_pkey PRIMARY KEY (id);


--
-- Name: staff_documents staff_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_documents
    ADD CONSTRAINT staff_documents_pkey PRIMARY KEY (id);


--
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);


--
-- Name: student_academic_records student_academic_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_academic_records
    ADD CONSTRAINT student_academic_records_pkey PRIMARY KEY (id);


--
-- Name: student_documents student_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_documents
    ADD CONSTRAINT student_documents_pkey PRIMARY KEY (id);


--
-- Name: student_fee_accounts student_fee_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_fee_accounts
    ADD CONSTRAINT student_fee_accounts_pkey PRIMARY KEY (id);


--
-- Name: student_parents student_parents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_parents
    ADD CONSTRAINT student_parents_pkey PRIMARY KEY (id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: system_config system_config_config_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_config_key_unique UNIQUE (config_key);


--
-- Name: system_config system_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (id);


--
-- Name: teacher_subjects teacher_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_subjects
    ADD CONSTRAINT teacher_subjects_pkey PRIMARY KEY (id);


--
-- Name: tenant_features tenant_features_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_features
    ADD CONSTRAINT tenant_features_pkey PRIMARY KEY (id);


--
-- Name: tenant_settings tenant_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_settings
    ADD CONSTRAINT tenant_settings_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_unique UNIQUE (slug);


--
-- Name: timetable_entries timetable_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_entries
    ADD CONSTRAINT timetable_entries_pkey PRIMARY KEY (id);


--
-- Name: timetables timetables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetables
    ADD CONSTRAINT timetables_pkey PRIMARY KEY (id);


--
-- Name: transport_assignments transport_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_assignments
    ADD CONSTRAINT transport_assignments_pkey PRIMARY KEY (id);


--
-- Name: transport_fuel_logs transport_fuel_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_fuel_logs
    ADD CONSTRAINT transport_fuel_logs_pkey PRIMARY KEY (id);


--
-- Name: transport_maintenance transport_maintenance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_maintenance
    ADD CONSTRAINT transport_maintenance_pkey PRIMARY KEY (id);


--
-- Name: transport_route_stops transport_route_stops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_route_stops
    ADD CONSTRAINT transport_route_stops_pkey PRIMARY KEY (id);


--
-- Name: transport_routes transport_routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_routes
    ADD CONSTRAINT transport_routes_pkey PRIMARY KEY (id);


--
-- Name: transport_vehicles transport_vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_vehicles
    ADD CONSTRAINT transport_vehicles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: visitors visitors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitors
    ADD CONSTRAINT visitors_pkey PRIMARY KEY (id);


--
-- Name: webhook_deliveries webhook_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_pkey PRIMARY KEY (id);


--
-- Name: webhook_endpoints webhook_endpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_endpoints
    ADD CONSTRAINT webhook_endpoints_pkey PRIMARY KEY (id);


--
-- Name: academic_years_tenant_id_branch_id_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX academic_years_tenant_id_branch_id_name_key ON public.academic_years USING btree (tenant_id, branch_id, name);


--
-- Name: applications_tenant_id_branch_id_application_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX applications_tenant_id_branch_id_application_number_key ON public.applications USING btree (tenant_id, branch_id, application_number);


--
-- Name: assignment_submissions_assignment_id_student_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX assignment_submissions_assignment_id_student_id_key ON public.assignment_submissions USING btree (assignment_id, student_id);


--
-- Name: attendance_class_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX attendance_class_date_key ON public.attendance USING btree (tenant_id, branch_id, class_id, section_id, date);


--
-- Name: attendance_records_attendance_id_student_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX attendance_records_attendance_id_student_id_key ON public.attendance_records USING btree (attendance_id, student_id);


--
-- Name: attendance_timetable_entry_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX attendance_timetable_entry_date_key ON public.attendance USING btree (timetable_entry_id, date);


--
-- Name: branches_tenant_id_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX branches_tenant_id_code_key ON public.branches USING btree (tenant_id, code) WHERE (deleted_at IS NULL);


--
-- Name: branding_settings_tenant_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX branding_settings_tenant_id_key ON public.branding_settings USING btree (tenant_id);


--
-- Name: certificates_tenant_id_branch_id_certificate_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX certificates_tenant_id_branch_id_certificate_number_key ON public.certificates USING btree (tenant_id, branch_id, certificate_number);


--
-- Name: circulars_tenant_id_branch_id_circular_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX circulars_tenant_id_branch_id_circular_number_key ON public.circulars USING btree (tenant_id, branch_id, circular_number);


--
-- Name: class_subjects_tenant_id_branch_id_class_id_subject_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX class_subjects_tenant_id_branch_id_class_id_subject_id_key ON public.class_subjects USING btree (tenant_id, branch_id, class_id, subject_id);


--
-- Name: classes_tenant_id_branch_id_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX classes_tenant_id_branch_id_name_key ON public.classes USING btree (tenant_id, branch_id, name) WHERE (deleted_at IS NULL);


--
-- Name: departments_tenant_id_branch_id_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX departments_tenant_id_branch_id_name_key ON public.departments USING btree (tenant_id, branch_id, name) WHERE (deleted_at IS NULL);


--
-- Name: exam_results_exam_id_student_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX exam_results_exam_id_student_id_key ON public.exam_results USING btree (exam_id, student_id);


--
-- Name: expense_categories_tenant_id_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX expense_categories_tenant_id_name_key ON public.expense_categories USING btree (tenant_id, name);


--
-- Name: fee_invoices_tenant_id_branch_id_invoice_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX fee_invoices_tenant_id_branch_id_invoice_number_key ON public.fee_invoices USING btree (tenant_id, branch_id, invoice_number);


--
-- Name: fee_receipts_tenant_id_receipt_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX fee_receipts_tenant_id_receipt_number_key ON public.fee_receipts USING btree (tenant_id, receipt_number);


--
-- Name: fee_transactions_tenant_id_branch_id_transaction_no_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX fee_transactions_tenant_id_branch_id_transaction_no_key ON public.fee_transactions USING btree (tenant_id, branch_id, transaction_no);


--
-- Name: homework_submissions_homework_id_student_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX homework_submissions_homework_id_student_id_key ON public.homework_submissions USING btree (homework_id, student_id);


--
-- Name: idx_academic_years_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_academic_years_branch ON public.academic_years USING btree (branch_id);


--
-- Name: idx_academic_years_current; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_academic_years_current ON public.academic_years USING btree (branch_id) WHERE (is_current = true);


--
-- Name: idx_announcements_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_branch ON public.announcements USING btree (branch_id);


--
-- Name: idx_announcements_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_published ON public.announcements USING btree (published_at);


--
-- Name: idx_api_keys_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_hash ON public.api_keys USING btree (key_hash);


--
-- Name: idx_api_keys_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_tenant ON public.api_keys USING btree (tenant_id);


--
-- Name: idx_applications_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_branch ON public.applications USING btree (branch_id);


--
-- Name: idx_applications_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_class ON public.applications USING btree (class_id);


--
-- Name: idx_applications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_status ON public.applications USING btree (status);


--
-- Name: idx_appointments_requested_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_requested_by ON public.appointments USING btree (requested_by);


--
-- Name: idx_appointments_scheduled_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_scheduled_at ON public.appointments USING btree (scheduled_at);


--
-- Name: idx_appointments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_status ON public.appointments USING btree (status);


--
-- Name: idx_appointments_tenant_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_tenant_branch ON public.appointments USING btree (tenant_id, branch_id);


--
-- Name: idx_assignment_submissions_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignment_submissions_assignment ON public.assignment_submissions USING btree (assignment_id);


--
-- Name: idx_assignment_submissions_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignment_submissions_student ON public.assignment_submissions USING btree (student_id);


--
-- Name: idx_assignments_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_class ON public.assignments USING btree (class_id);


--
-- Name: idx_attendance_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_branch ON public.attendance USING btree (branch_id);


--
-- Name: idx_attendance_class_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_class_date ON public.attendance USING btree (class_id, date);


--
-- Name: idx_attendance_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_date ON public.attendance USING btree (date);


--
-- Name: idx_attendance_records_attendance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_records_attendance ON public.attendance_records USING btree (attendance_id);


--
-- Name: idx_attendance_records_branch_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_records_branch_date ON public.attendance_records USING btree (branch_id, attendance_id);


--
-- Name: idx_attendance_records_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_records_student ON public.attendance_records USING btree (student_id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_module ON public.audit_logs USING btree (module);


--
-- Name: idx_audit_logs_resource; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_resource ON public.audit_logs USING btree (resource_type, resource_id);


--
-- Name: idx_audit_logs_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_tenant ON public.audit_logs USING btree (tenant_id);


--
-- Name: idx_audit_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id);


--
-- Name: idx_branches_principal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branches_principal ON public.branches USING btree (principal_id);


--
-- Name: idx_branches_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branches_tenant ON public.branches USING btree (tenant_id);


--
-- Name: idx_class_subjects_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_class_subjects_class ON public.class_subjects USING btree (class_id);


--
-- Name: idx_classes_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_classes_branch ON public.classes USING btree (branch_id);


--
-- Name: idx_departments_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_departments_branch ON public.departments USING btree (branch_id);


--
-- Name: idx_enquiries_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enquiries_branch ON public.enquiries USING btree (branch_id);


--
-- Name: idx_enquiries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enquiries_status ON public.enquiries USING btree (status);


--
-- Name: idx_exam_results_exam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_results_exam ON public.exam_results USING btree (exam_id);


--
-- Name: idx_exam_results_rank; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_results_rank ON public.exam_results USING btree (exam_id, rank);


--
-- Name: idx_exam_results_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_results_student ON public.exam_results USING btree (student_id);


--
-- Name: idx_exam_schedules_exam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_schedules_exam ON public.exam_schedules USING btree (exam_id);


--
-- Name: idx_exam_schedules_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_schedules_subject ON public.exam_schedules USING btree (subject_id);


--
-- Name: idx_exams_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exams_branch ON public.exams USING btree (branch_id);


--
-- Name: idx_exams_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exams_class ON public.exams USING btree (class_id);


--
-- Name: idx_exams_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exams_type ON public.exams USING btree (exam_type);


--
-- Name: idx_expenses_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_branch ON public.expenses USING btree (branch_id);


--
-- Name: idx_expenses_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_category ON public.expenses USING btree (category_id);


--
-- Name: idx_expenses_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_date ON public.expenses USING btree (expense_date);


--
-- Name: idx_fee_accounts_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_accounts_due ON public.student_fee_accounts USING btree (total_due) WHERE (total_due > (0)::numeric);


--
-- Name: idx_fee_accounts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_accounts_status ON public.student_fee_accounts USING btree (status);


--
-- Name: idx_fee_accounts_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_accounts_student ON public.student_fee_accounts USING btree (student_id);


--
-- Name: idx_fee_concessions_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_concessions_student ON public.fee_concessions USING btree (student_id);


--
-- Name: idx_fee_invoices_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_invoices_due ON public.fee_invoices USING btree (due_date) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_fee_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_invoices_status ON public.fee_invoices USING btree (status);


--
-- Name: idx_fee_invoices_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_invoices_student ON public.fee_invoices USING btree (student_id);


--
-- Name: idx_fee_items_structure; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_items_structure ON public.fee_structure_items USING btree (fee_structure_id);


--
-- Name: idx_fee_receipts_transaction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_receipts_transaction ON public.fee_receipts USING btree (transaction_id);


--
-- Name: idx_fee_structures_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_structures_branch ON public.fee_structures USING btree (branch_id);


--
-- Name: idx_fee_structures_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_structures_class ON public.fee_structures USING btree (class_id);


--
-- Name: idx_fee_transactions_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_transactions_account ON public.fee_transactions USING btree (fee_account_id);


--
-- Name: idx_fee_transactions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_transactions_date ON public.fee_transactions USING btree (payment_date);


--
-- Name: idx_fee_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_transactions_status ON public.fee_transactions USING btree (status);


--
-- Name: idx_fee_transactions_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fee_transactions_student ON public.fee_transactions USING btree (student_id);


--
-- Name: idx_homework_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_homework_class ON public.homework USING btree (class_id);


--
-- Name: idx_homework_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_homework_due ON public.homework USING btree (due_date) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_homework_submissions_homework; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_homework_submissions_homework ON public.homework_submissions USING btree (homework_id);


--
-- Name: idx_homework_submissions_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_homework_submissions_student ON public.homework_submissions USING btree (student_id);


--
-- Name: idx_homework_teacher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_homework_teacher ON public.homework USING btree (teacher_id);


--
-- Name: idx_import_batches_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_batches_status ON public.import_batches USING btree (status);


--
-- Name: idx_import_batches_tenant_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_batches_tenant_entity ON public.import_batches USING btree (tenant_id, entity_type);


--
-- Name: idx_income_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_income_branch ON public.income USING btree (branch_id);


--
-- Name: idx_income_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_income_date ON public.income USING btree (income_date);


--
-- Name: idx_leave_requests_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_dates ON public.leave_requests USING btree (start_date, end_date);


--
-- Name: idx_leave_requests_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_staff ON public.leave_requests USING btree (staff_id);


--
-- Name: idx_leave_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_status ON public.leave_requests USING btree (status);


--
-- Name: idx_lesson_plans_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lesson_plans_date ON public.lesson_plans USING btree (date);


--
-- Name: idx_lesson_plans_teacher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lesson_plans_teacher ON public.lesson_plans USING btree (teacher_id);


--
-- Name: idx_marks_exam_schedule; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marks_exam_schedule ON public.marks USING btree (exam_schedule_id);


--
-- Name: idx_marks_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marks_student ON public.marks USING btree (student_id);


--
-- Name: idx_notification_logs_notification; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_logs_notification ON public.notification_logs USING btree (notification_id);


--
-- Name: idx_notification_logs_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_logs_recipient ON public.notification_logs USING btree (recipient_id);


--
-- Name: idx_notification_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_logs_status ON public.notification_logs USING btree (status);


--
-- Name: idx_notifications_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created ON public.notifications USING btree (created_at);


--
-- Name: idx_notifications_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_tenant ON public.notifications USING btree (tenant_id);


--
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- Name: idx_parents_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parents_tenant ON public.parents USING btree (tenant_id);


--
-- Name: idx_payroll_month_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payroll_month_year ON public.payroll USING btree (month, year);


--
-- Name: idx_payroll_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payroll_staff ON public.payroll USING btree (staff_id);


--
-- Name: idx_payroll_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payroll_status ON public.payroll USING btree (status);


--
-- Name: idx_performance_reviews_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_performance_reviews_staff ON public.performance_reviews USING btree (staff_id);


--
-- Name: idx_permissions_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_permissions_module ON public.permissions USING btree (module);


--
-- Name: idx_roles_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roles_tenant ON public.roles USING btree (tenant_id);


--
-- Name: idx_sections_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sections_class ON public.sections USING btree (class_id);


--
-- Name: idx_sessions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_active ON public.user_sessions USING btree (expires_at) WHERE (is_active = true);


--
-- Name: idx_sessions_refresh; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_refresh ON public.user_sessions USING btree (refresh_token);


--
-- Name: idx_sessions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_user ON public.user_sessions USING btree (user_id);


--
-- Name: idx_staff_attendance_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_attendance_date ON public.staff_attendance USING btree (date);


--
-- Name: idx_staff_attendance_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_attendance_staff ON public.staff_attendance USING btree (staff_id);


--
-- Name: idx_staff_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_branch ON public.staff USING btree (branch_id);


--
-- Name: idx_staff_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_department ON public.staff USING btree (department_id);


--
-- Name: idx_staff_docs_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_docs_staff ON public.staff_documents USING btree (staff_id);


--
-- Name: idx_staff_teaching; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_teaching ON public.staff USING btree (branch_id) WHERE (is_teaching = true);


--
-- Name: idx_student_academic_records_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_academic_records_class ON public.student_academic_records USING btree (class_id);


--
-- Name: idx_student_academic_records_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_academic_records_student ON public.student_academic_records USING btree (student_id);


--
-- Name: idx_student_docs_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_docs_student ON public.student_documents USING btree (student_id);


--
-- Name: idx_student_parents_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_parents_student ON public.student_parents USING btree (student_id);


--
-- Name: idx_student_parents_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_parents_tenant ON public.student_parents USING btree (tenant_id);


--
-- Name: idx_students_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_active ON public.students USING btree (branch_id) WHERE (is_active = true);


--
-- Name: idx_students_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_branch ON public.students USING btree (branch_id);


--
-- Name: idx_students_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_name ON public.students USING btree (first_name, last_name);


--
-- Name: idx_subjects_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subjects_branch ON public.subjects USING btree (branch_id);


--
-- Name: idx_subscriptions_end_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_end_date ON public.subscriptions USING btree (end_date) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_subscriptions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);


--
-- Name: idx_subscriptions_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_tenant ON public.subscriptions USING btree (tenant_id);


--
-- Name: idx_teacher_subjects_teacher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teacher_subjects_teacher ON public.teacher_subjects USING btree (teacher_id);


--
-- Name: idx_tenants_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenants_slug ON public.tenants USING btree (slug) WHERE (deleted_at IS NULL);


--
-- Name: idx_tenants_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenants_status ON public.tenants USING btree (status);


--
-- Name: idx_timetable_entries_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timetable_entries_day ON public.timetable_entries USING btree (timetable_id, day_of_week);


--
-- Name: idx_timetable_entries_timetable; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timetable_entries_timetable ON public.timetable_entries USING btree (timetable_id);


--
-- Name: idx_timetables_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timetables_class ON public.timetables USING btree (class_id);


--
-- Name: idx_user_roles_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_branch ON public.user_roles USING btree (branch_id);


--
-- Name: idx_user_roles_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_tenant ON public.user_roles USING btree (tenant_id);


--
-- Name: idx_user_roles_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_user ON public.user_roles USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email) WHERE (deleted_at IS NULL);


--
-- Name: idx_users_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_phone ON public.users USING btree (phone) WHERE (deleted_at IS NULL);


--
-- Name: idx_users_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_tenant ON public.users USING btree (tenant_id);


--
-- Name: idx_users_tenant_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_users_tenant_email ON public.users USING btree (tenant_id, email) WHERE ((tenant_id IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: idx_users_tenant_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_users_tenant_phone ON public.users USING btree (tenant_id, phone) WHERE ((tenant_id IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: idx_visitors_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visitors_branch ON public.visitors USING btree (branch_id);


--
-- Name: idx_visitors_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visitors_date ON public.visitors USING btree (check_in_time);


--
-- Name: idx_visitors_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visitors_status ON public.visitors USING btree (status);


--
-- Name: idx_webhook_deliveries_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_deliveries_created ON public.webhook_deliveries USING btree (created_at);


--
-- Name: idx_webhook_deliveries_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_deliveries_endpoint ON public.webhook_deliveries USING btree (webhook_endpoint_id);


--
-- Name: idx_webhook_deliveries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_deliveries_status ON public.webhook_deliveries USING btree (status);


--
-- Name: idx_webhook_deliveries_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_deliveries_tenant ON public.webhook_deliveries USING btree (tenant_id);


--
-- Name: idx_webhook_endpoints_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_endpoints_tenant ON public.webhook_endpoints USING btree (tenant_id);


--
-- Name: income_categories_tenant_id_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX income_categories_tenant_id_name_key ON public.income_categories USING btree (tenant_id, name);


--
-- Name: leave_types_tenant_id_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX leave_types_tenant_id_code_key ON public.leave_types USING btree (tenant_id, code);


--
-- Name: marks_exam_schedule_id_student_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX marks_exam_schedule_id_student_id_key ON public.marks USING btree (exam_schedule_id, student_id);


--
-- Name: notification_templates_tenant_id_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX notification_templates_tenant_id_code_key ON public.notification_templates USING btree (tenant_id, code);


--
-- Name: payroll_staff_id_month_year_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX payroll_staff_id_month_year_key ON public.payroll USING btree (staff_id, month, year);


--
-- Name: plan_features_plan_id_feature_flag_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX plan_features_plan_id_feature_flag_id_key ON public.plan_features USING btree (plan_id, feature_flag_id);


--
-- Name: role_permissions_role_id_permission_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX role_permissions_role_id_permission_id_key ON public.role_permissions USING btree (role_id, permission_id);


--
-- Name: roles_tenant_id_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX roles_tenant_id_slug_key ON public.roles USING btree (tenant_id, slug);


--
-- Name: sections_tenant_id_branch_id_class_id_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sections_tenant_id_branch_id_class_id_name_key ON public.sections USING btree (tenant_id, branch_id, class_id, name) WHERE (deleted_at IS NULL);


--
-- Name: staff_attendance_tenant_id_branch_id_staff_id_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX staff_attendance_tenant_id_branch_id_staff_id_date_key ON public.staff_attendance USING btree (tenant_id, branch_id, staff_id, date);


--
-- Name: staff_tenant_id_branch_id_employee_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX staff_tenant_id_branch_id_employee_code_key ON public.staff USING btree (tenant_id, branch_id, employee_code) WHERE (deleted_at IS NULL);


--
-- Name: student_academic_records_student_id_academic_year_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX student_academic_records_student_id_academic_year_id_key ON public.student_academic_records USING btree (student_id, academic_year_id);


--
-- Name: student_fee_accounts_student_id_academic_year_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX student_fee_accounts_student_id_academic_year_id_key ON public.student_fee_accounts USING btree (student_id, academic_year_id);


--
-- Name: student_parents_student_id_parent_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX student_parents_student_id_parent_id_key ON public.student_parents USING btree (student_id, parent_id);


--
-- Name: students_tenant_id_branch_id_admission_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX students_tenant_id_branch_id_admission_number_key ON public.students USING btree (tenant_id, branch_id, admission_number) WHERE (deleted_at IS NULL);


--
-- Name: subjects_tenant_id_branch_id_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX subjects_tenant_id_branch_id_code_key ON public.subjects USING btree (tenant_id, branch_id, code) WHERE (deleted_at IS NULL);


--
-- Name: teacher_subjects_tenant_id_branch_id_teacher_id_subject_id_clas; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX teacher_subjects_tenant_id_branch_id_teacher_id_subject_id_clas ON public.teacher_subjects USING btree (tenant_id, branch_id, teacher_id, subject_id, class_id, section_id);


--
-- Name: tenant_features_tenant_id_feature_flag_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenant_features_tenant_id_feature_flag_id_key ON public.tenant_features USING btree (tenant_id, feature_flag_id);


--
-- Name: tenant_settings_tenant_id_setting_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenant_settings_tenant_id_setting_key_key ON public.tenant_settings USING btree (tenant_id, setting_key);


--
-- Name: user_roles_user_id_role_id_branch_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_roles_user_id_role_id_branch_id_key ON public.user_roles USING btree (user_id, role_id, branch_id);


--
-- Name: academic_years academic_years_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_years
    ADD CONSTRAINT academic_years_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: academic_years academic_years_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academic_years
    ADD CONSTRAINT academic_years_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: announcements announcements_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: announcements announcements_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: api_keys api_keys_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: api_keys api_keys_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: applications applications_academic_year_id_academic_years_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_academic_year_id_academic_years_id_fk FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);


--
-- Name: applications applications_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: applications applications_class_id_classes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_class_id_classes_id_fk FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- Name: applications applications_enquiry_id_enquiries_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_enquiry_id_enquiries_id_fk FOREIGN KEY (enquiry_id) REFERENCES public.enquiries(id);


--
-- Name: applications applications_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: appointments appointments_requested_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_requested_by_users_id_fk FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: appointments appointments_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: assignment_submissions assignment_submissions_assignment_id_assignments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_assignment_id_assignments_id_fk FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;


--
-- Name: assignment_submissions assignment_submissions_student_id_students_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_student_id_students_id_fk FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: assignment_submissions assignment_submissions_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: assignments assignments_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: assignments assignments_class_id_classes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_class_id_classes_id_fk FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- Name: assignments assignments_section_id_sections_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_section_id_sections_id_fk FOREIGN KEY (section_id) REFERENCES public.sections(id);


--
-- Name: assignments assignments_subject_id_subjects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_subject_id_subjects_id_fk FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- Name: assignments assignments_teacher_id_staff_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_teacher_id_staff_id_fk FOREIGN KEY (teacher_id) REFERENCES public.staff(id);


--
-- Name: assignments assignments_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: attendance attendance_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: attendance attendance_class_id_classes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_class_id_classes_id_fk FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- Name: attendance_records attendance_records_attendance_id_attendance_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_attendance_id_attendance_id_fk FOREIGN KEY (attendance_id) REFERENCES public.attendance(id) ON DELETE CASCADE;


--
-- Name: attendance_records attendance_records_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: attendance_records attendance_records_student_id_students_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_student_id_students_id_fk FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: attendance_records attendance_records_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: attendance attendance_section_id_sections_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_section_id_sections_id_fk FOREIGN KEY (section_id) REFERENCES public.sections(id);


--
-- Name: attendance attendance_subject_id_subjects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_subject_id_subjects_id_fk FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- Name: attendance attendance_teacher_id_staff_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_teacher_id_staff_id_fk FOREIGN KEY (teacher_id) REFERENCES public.staff(id);


--
-- Name: attendance attendance_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: attendance attendance_timetable_entry_id_timetable_entries_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_timetable_entry_id_timetable_entries_id_fk FOREIGN KEY (timetable_entry_id) REFERENCES public.timetable_entries(id);


--
-- Name: branches branches_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: branding_settings branding_settings_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branding_settings
    ADD CONSTRAINT branding_settings_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: certificate_templates certificate_templates_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificate_templates
    ADD CONSTRAINT certificate_templates_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: certificate_templates certificate_templates_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificate_templates
    ADD CONSTRAINT certificate_templates_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: certificates certificates_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: certificates certificates_template_id_certificate_templates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_template_id_certificate_templates_id_fk FOREIGN KEY (template_id) REFERENCES public.certificate_templates(id);


--
-- Name: certificates certificates_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: circulars circulars_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.circulars
    ADD CONSTRAINT circulars_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: circulars circulars_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.circulars
    ADD CONSTRAINT circulars_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: class_subjects class_subjects_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_subjects
    ADD CONSTRAINT class_subjects_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: class_subjects class_subjects_class_id_classes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_subjects
    ADD CONSTRAINT class_subjects_class_id_classes_id_fk FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: class_subjects class_subjects_subject_id_subjects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_subjects
    ADD CONSTRAINT class_subjects_subject_id_subjects_id_fk FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: class_subjects class_subjects_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_subjects
    ADD CONSTRAINT class_subjects_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: classes classes_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: classes classes_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: departments departments_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: departments departments_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: enquiries enquiries_academic_year_id_academic_years_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_academic_year_id_academic_years_id_fk FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);


--
-- Name: enquiries enquiries_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: enquiries enquiries_class_id_classes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_class_id_classes_id_fk FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- Name: enquiries enquiries_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: exam_results exam_results_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_results
    ADD CONSTRAINT exam_results_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: exam_results exam_results_exam_id_exams_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_results
    ADD CONSTRAINT exam_results_exam_id_exams_id_fk FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: exam_results exam_results_student_id_students_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_results
    ADD CONSTRAINT exam_results_student_id_students_id_fk FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: exam_results exam_results_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_results
    ADD CONSTRAINT exam_results_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: exam_schedules exam_schedules_class_id_classes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_schedules
    ADD CONSTRAINT exam_schedules_class_id_classes_id_fk FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- Name: exam_schedules exam_schedules_exam_id_exams_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_schedules
    ADD CONSTRAINT exam_schedules_exam_id_exams_id_fk FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: exam_schedules exam_schedules_subject_id_subjects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_schedules
    ADD CONSTRAINT exam_schedules_subject_id_subjects_id_fk FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- Name: exam_schedules exam_schedules_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_schedules
    ADD CONSTRAINT exam_schedules_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: exams exams_academic_year_id_academic_years_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_academic_year_id_academic_years_id_fk FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);


--
-- Name: exams exams_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: exams exams_class_id_classes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_class_id_classes_id_fk FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- Name: exams exams_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: expense_categories expense_categories_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_category_id_expense_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_category_id_expense_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.expense_categories(id);


--
-- Name: expenses expenses_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: fee_concessions fee_concessions_discount_id_fee_discounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_concessions
    ADD CONSTRAINT fee_concessions_discount_id_fee_discounts_id_fk FOREIGN KEY (discount_id) REFERENCES public.fee_discounts(id);


--
-- Name: fee_concessions fee_concessions_fee_structure_item_id_fee_structure_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_concessions
    ADD CONSTRAINT fee_concessions_fee_structure_item_id_fee_structure_items_id_fk FOREIGN KEY (fee_structure_item_id) REFERENCES public.fee_structure_items(id);


--
-- Name: fee_concessions fee_concessions_student_id_students_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_concessions
    ADD CONSTRAINT fee_concessions_student_id_students_id_fk FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: fee_concessions fee_concessions_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_concessions
    ADD CONSTRAINT fee_concessions_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: fee_discounts fee_discounts_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_discounts
    ADD CONSTRAINT fee_discounts_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: fee_discounts fee_discounts_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_discounts
    ADD CONSTRAINT fee_discounts_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: fee_invoices fee_invoices_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_invoices
    ADD CONSTRAINT fee_invoices_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: fee_invoices fee_invoices_student_id_students_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_invoices
    ADD CONSTRAINT fee_invoices_student_id_students_id_fk FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: fee_invoices fee_invoices_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_invoices
    ADD CONSTRAINT fee_invoices_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: fee_receipts fee_receipts_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_receipts
    ADD CONSTRAINT fee_receipts_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: fee_receipts fee_receipts_transaction_id_fee_transactions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_receipts
    ADD CONSTRAINT fee_receipts_transaction_id_fee_transactions_id_fk FOREIGN KEY (transaction_id) REFERENCES public.fee_transactions(id) ON DELETE CASCADE;


--
-- Name: fee_structure_items fee_structure_items_fee_structure_id_fee_structures_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_structure_items
    ADD CONSTRAINT fee_structure_items_fee_structure_id_fee_structures_id_fk FOREIGN KEY (fee_structure_id) REFERENCES public.fee_structures(id) ON DELETE CASCADE;


--
-- Name: fee_structure_items fee_structure_items_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_structure_items
    ADD CONSTRAINT fee_structure_items_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: fee_structures fee_structures_academic_year_id_academic_years_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_structures
    ADD CONSTRAINT fee_structures_academic_year_id_academic_years_id_fk FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);


--
-- Name: fee_structures fee_structures_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_structures
    ADD CONSTRAINT fee_structures_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: fee_structures fee_structures_class_id_classes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_structures
    ADD CONSTRAINT fee_structures_class_id_classes_id_fk FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- Name: fee_structures fee_structures_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_structures
    ADD CONSTRAINT fee_structures_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: fee_transactions fee_transactions_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_transactions
    ADD CONSTRAINT fee_transactions_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: fee_transactions fee_transactions_fee_account_id_student_fee_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_transactions
    ADD CONSTRAINT fee_transactions_fee_account_id_student_fee_accounts_id_fk FOREIGN KEY (fee_account_id) REFERENCES public.student_fee_accounts(id);


--
-- Name: fee_transactions fee_transactions_student_id_students_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_transactions
    ADD CONSTRAINT fee_transactions_student_id_students_id_fk FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: fee_transactions fee_transactions_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fee_transactions
    ADD CONSTRAINT fee_transactions_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: homework homework_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homework
    ADD CONSTRAINT homework_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: homework homework_class_id_classes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homework
    ADD CONSTRAINT homework_class_id_classes_id_fk FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- Name: homework homework_section_id_sections_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homework
    ADD CONSTRAINT homework_section_id_sections_id_fk FOREIGN KEY (section_id) REFERENCES public.sections(id);


--
-- Name: homework homework_subject_id_subjects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homework
    ADD CONSTRAINT homework_subject_id_subjects_id_fk FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- Name: homework_submissions homework_submissions_homework_id_homework_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homework_submissions
    ADD CONSTRAINT homework_submissions_homework_id_homework_id_fk FOREIGN KEY (homework_id) REFERENCES public.homework(id) ON DELETE CASCADE;


--
-- Name: homework_submissions homework_submissions_student_id_students_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homework_submissions
    ADD CONSTRAINT homework_submissions_student_id_students_id_fk FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: homework_submissions homework_submissions_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homework_submissions
    ADD CONSTRAINT homework_submissions_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: homework homework_teacher_id_staff_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homework
    ADD CONSTRAINT homework_teacher_id_staff_id_fk FOREIGN KEY (teacher_id) REFERENCES public.staff(id);


--
-- Name: homework homework_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homework
    ADD CONSTRAINT homework_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: id_card_templates id_card_templates_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.id_card_templates
    ADD CONSTRAINT id_card_templates_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: id_card_templates id_card_templates_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.id_card_templates
    ADD CONSTRAINT id_card_templates_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: import_batches import_batches_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT import_batches_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: import_batches import_batches_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT import_batches_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: import_batches import_batches_deployed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT import_batches_deployed_by_users_id_fk FOREIGN KEY (deployed_by) REFERENCES public.users(id);


--
-- Name: import_batches import_batches_reviewed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT import_batches_reviewed_by_users_id_fk FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: import_batches import_batches_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT import_batches_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: income income_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.income
    ADD CONSTRAINT income_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: income_categories income_categories_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.income_categories
    ADD CONSTRAINT income_categories_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: income income_category_id_income_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.income
    ADD CONSTRAINT income_category_id_income_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.income_categories(id);


--
-- Name: income income_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.income
    ADD CONSTRAINT income_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: job_applications job_applications_job_posting_id_job_postings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_applications
    ADD CONSTRAINT job_applications_job_posting_id_job_postings_id_fk FOREIGN KEY (job_posting_id) REFERENCES public.job_postings(id) ON DELETE CASCADE;


--
-- Name: job_applications job_applications_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_applications
    ADD CONSTRAINT job_applications_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: job_postings job_postings_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_postings
    ADD CONSTRAINT job_postings_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: job_postings job_postings_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_postings
    ADD CONSTRAINT job_postings_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: job_postings job_postings_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_postings
    ADD CONSTRAINT job_postings_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_leave_type_id_leave_types_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_leave_type_id_leave_types_id_fk FOREIGN KEY (leave_type_id) REFERENCES public.leave_types(id);


--
-- Name: leave_requests leave_requests_staff_id_staff_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_staff_id_staff_id_fk FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: leave_types leave_types_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_types
    ADD CONSTRAINT leave_types_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: lesson_plans lesson_plans_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_plans
    ADD CONSTRAINT lesson_plans_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: lesson_plans lesson_plans_class_id_classes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_plans
    ADD CONSTRAINT lesson_plans_class_id_classes_id_fk FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- Name: lesson_plans lesson_plans_section_id_sections_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_plans
    ADD CONSTRAINT lesson_plans_section_id_sections_id_fk FOREIGN KEY (section_id) REFERENCES public.sections(id);


--
-- Name: lesson_plans lesson_plans_subject_id_subjects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_plans
    ADD CONSTRAINT lesson_plans_subject_id_subjects_id_fk FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- Name: lesson_plans lesson_plans_teacher_id_staff_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_plans
    ADD CONSTRAINT lesson_plans_teacher_id_staff_id_fk FOREIGN KEY (teacher_id) REFERENCES public.staff(id);


--
-- Name: lesson_plans lesson_plans_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_plans
    ADD CONSTRAINT lesson_plans_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: marks marks_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marks
    ADD CONSTRAINT marks_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: marks marks_exam_schedule_id_exam_schedules_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marks
    ADD CONSTRAINT marks_exam_schedule_id_exam_schedules_id_fk FOREIGN KEY (exam_schedule_id) REFERENCES public.exam_schedules(id) ON DELETE CASCADE;


--
-- Name: marks marks_student_id_students_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marks
    ADD CONSTRAINT marks_student_id_students_id_fk FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: marks marks_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marks
    ADD CONSTRAINT marks_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: notification_logs notification_logs_notification_id_notifications_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_notification_id_notifications_id_fk FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE;


--
-- Name: notification_logs notification_logs_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: notification_templates notification_templates_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: notifications notifications_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: parents parents_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parents
    ADD CONSTRAINT parents_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: payroll payroll_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll
    ADD CONSTRAINT payroll_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: payroll_salary_components payroll_salary_components_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_salary_components
    ADD CONSTRAINT payroll_salary_components_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: payroll_salary_components payroll_salary_components_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_salary_components
    ADD CONSTRAINT payroll_salary_components_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: payroll payroll_staff_id_staff_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll
    ADD CONSTRAINT payroll_staff_id_staff_id_fk FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: payroll payroll_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll
    ADD CONSTRAINT payroll_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: performance_reviews performance_reviews_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_reviews
    ADD CONSTRAINT performance_reviews_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: performance_reviews performance_reviews_staff_id_staff_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_reviews
    ADD CONSTRAINT performance_reviews_staff_id_staff_id_fk FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: performance_reviews performance_reviews_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_reviews
    ADD CONSTRAINT performance_reviews_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: plan_features plan_features_feature_flag_id_feature_flags_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_feature_flag_id_feature_flags_id_fk FOREIGN KEY (feature_flag_id) REFERENCES public.feature_flags(id) ON DELETE CASCADE;


--
-- Name: plan_features plan_features_plan_id_plans_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_plan_id_plans_id_fk FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_permissions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_permissions_id_fk FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_roles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_roles_id_fk FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: roles roles_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: sections sections_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: sections sections_class_id_classes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_class_id_classes_id_fk FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: sections sections_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: staff_attendance staff_attendance_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT staff_attendance_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: staff_attendance staff_attendance_staff_id_staff_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT staff_attendance_staff_id_staff_id_fk FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: staff_attendance staff_attendance_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT staff_attendance_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: staff staff_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: staff staff_department_id_departments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_department_id_departments_id_fk FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: staff_documents staff_documents_staff_id_staff_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_documents
    ADD CONSTRAINT staff_documents_staff_id_staff_id_fk FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: staff_documents staff_documents_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_documents
    ADD CONSTRAINT staff_documents_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: staff staff_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: staff staff_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: student_academic_records student_academic_records_academic_year_id_academic_years_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_academic_records
    ADD CONSTRAINT student_academic_records_academic_year_id_academic_years_id_fk FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);


--
-- Name: student_academic_records student_academic_records_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_academic_records
    ADD CONSTRAINT student_academic_records_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: student_academic_records student_academic_records_class_id_classes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_academic_records
    ADD CONSTRAINT student_academic_records_class_id_classes_id_fk FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- Name: student_academic_records student_academic_records_promoted_to_class_classes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_academic_records
    ADD CONSTRAINT student_academic_records_promoted_to_class_classes_id_fk FOREIGN KEY (promoted_to_class) REFERENCES public.classes(id);


--
-- Name: student_academic_records student_academic_records_section_id_sections_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_academic_records
    ADD CONSTRAINT student_academic_records_section_id_sections_id_fk FOREIGN KEY (section_id) REFERENCES public.sections(id);


--
-- Name: student_academic_records student_academic_records_student_id_students_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_academic_records
    ADD CONSTRAINT student_academic_records_student_id_students_id_fk FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_academic_records student_academic_records_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_academic_records
    ADD CONSTRAINT student_academic_records_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: student_documents student_documents_student_id_students_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_documents
    ADD CONSTRAINT student_documents_student_id_students_id_fk FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_documents student_documents_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_documents
    ADD CONSTRAINT student_documents_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: student_fee_accounts student_fee_accounts_academic_year_id_academic_years_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_fee_accounts
    ADD CONSTRAINT student_fee_accounts_academic_year_id_academic_years_id_fk FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);


--
-- Name: student_fee_accounts student_fee_accounts_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_fee_accounts
    ADD CONSTRAINT student_fee_accounts_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: student_fee_accounts student_fee_accounts_fee_structure_id_fee_structures_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_fee_accounts
    ADD CONSTRAINT student_fee_accounts_fee_structure_id_fee_structures_id_fk FOREIGN KEY (fee_structure_id) REFERENCES public.fee_structures(id);


--
-- Name: student_fee_accounts student_fee_accounts_student_id_students_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_fee_accounts
    ADD CONSTRAINT student_fee_accounts_student_id_students_id_fk FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_fee_accounts student_fee_accounts_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_fee_accounts
    ADD CONSTRAINT student_fee_accounts_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: student_parents student_parents_parent_id_parents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_parents
    ADD CONSTRAINT student_parents_parent_id_parents_id_fk FOREIGN KEY (parent_id) REFERENCES public.parents(id) ON DELETE CASCADE;


--
-- Name: student_parents student_parents_student_id_students_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_parents
    ADD CONSTRAINT student_parents_student_id_students_id_fk FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_parents student_parents_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_parents
    ADD CONSTRAINT student_parents_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: students students_application_id_applications_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_application_id_applications_id_fk FOREIGN KEY (application_id) REFERENCES public.applications(id);


--
-- Name: students students_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: students students_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: subjects subjects_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: subjects subjects_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_plan_id_plans_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_plan_id_plans_id_fk FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: subscriptions subscriptions_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: teacher_subjects teacher_subjects_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_subjects
    ADD CONSTRAINT teacher_subjects_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: teacher_subjects teacher_subjects_class_id_classes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_subjects
    ADD CONSTRAINT teacher_subjects_class_id_classes_id_fk FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: teacher_subjects teacher_subjects_section_id_sections_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_subjects
    ADD CONSTRAINT teacher_subjects_section_id_sections_id_fk FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE CASCADE;


--
-- Name: teacher_subjects teacher_subjects_subject_id_subjects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_subjects
    ADD CONSTRAINT teacher_subjects_subject_id_subjects_id_fk FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: teacher_subjects teacher_subjects_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teacher_subjects
    ADD CONSTRAINT teacher_subjects_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: tenant_features tenant_features_feature_flag_id_feature_flags_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_features
    ADD CONSTRAINT tenant_features_feature_flag_id_feature_flags_id_fk FOREIGN KEY (feature_flag_id) REFERENCES public.feature_flags(id) ON DELETE CASCADE;


--
-- Name: tenant_features tenant_features_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_features
    ADD CONSTRAINT tenant_features_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: tenant_settings tenant_settings_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_settings
    ADD CONSTRAINT tenant_settings_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: timetable_entries timetable_entries_subject_id_subjects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_entries
    ADD CONSTRAINT timetable_entries_subject_id_subjects_id_fk FOREIGN KEY (subject_id) REFERENCES public.subjects(id);


--
-- Name: timetable_entries timetable_entries_teacher_id_staff_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_entries
    ADD CONSTRAINT timetable_entries_teacher_id_staff_id_fk FOREIGN KEY (teacher_id) REFERENCES public.staff(id);


--
-- Name: timetable_entries timetable_entries_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_entries
    ADD CONSTRAINT timetable_entries_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: timetable_entries timetable_entries_timetable_id_timetables_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_entries
    ADD CONSTRAINT timetable_entries_timetable_id_timetables_id_fk FOREIGN KEY (timetable_id) REFERENCES public.timetables(id) ON DELETE CASCADE;


--
-- Name: timetables timetables_academic_year_id_academic_years_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetables
    ADD CONSTRAINT timetables_academic_year_id_academic_years_id_fk FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id);


--
-- Name: timetables timetables_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetables
    ADD CONSTRAINT timetables_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: timetables timetables_class_id_classes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetables
    ADD CONSTRAINT timetables_class_id_classes_id_fk FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- Name: timetables timetables_section_id_sections_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetables
    ADD CONSTRAINT timetables_section_id_sections_id_fk FOREIGN KEY (section_id) REFERENCES public.sections(id);


--
-- Name: timetables timetables_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetables
    ADD CONSTRAINT timetables_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_assigned_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_assigned_by_users_id_fk FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: user_roles user_roles_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_role_id_roles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_roles_id_fk FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: visitors visitors_branch_id_branches_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitors
    ADD CONSTRAINT visitors_branch_id_branches_id_fk FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: visitors visitors_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitors
    ADD CONSTRAINT visitors_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: webhook_deliveries webhook_deliveries_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: webhook_deliveries webhook_deliveries_webhook_endpoint_id_webhook_endpoints_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_webhook_endpoint_id_webhook_endpoints_id_fk FOREIGN KEY (webhook_endpoint_id) REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE;


--
-- Name: webhook_endpoints webhook_endpoints_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_endpoints
    ADD CONSTRAINT webhook_endpoints_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: webhook_endpoints webhook_endpoints_tenant_id_tenants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_endpoints
    ADD CONSTRAINT webhook_endpoints_tenant_id_tenants_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--



-- ============================================================================
-- PART 99: SEED DATA (system roles, plans, feature flags)
-- ============================================================================
-- Data only: the app's seed script (npm run seed) remains the authoritative
-- seeder for tenant-level data; these platform-level rows are required for a
-- fresh deployment to boot (role lookup for erp-superadmin, subscription
-- plans, feature flags).

INSERT INTO public.roles (tenant_id, name, slug, description, is_system, hierarchy_level) VALUES
    (NULL, 'ERP SuperAdmin', 'erp-superadmin', 'Platform-wide administrator', TRUE, 0);

-- Default subscription plans
INSERT INTO public.plans (name, code, description, price_monthly, price_yearly, max_branches, max_users, max_students, max_staff, storage_limit_mb, features, sort_order) VALUES
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
INSERT INTO public.feature_flags (code, name, description, module, default_value) VALUES
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
