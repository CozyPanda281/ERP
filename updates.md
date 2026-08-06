# ERP Updates

> This file logs all finalized decisions, changes, and progress on the Educational ERP SaaS Platform.

---

## [2026-07-29] Initial Project Setup & Architecture Planning

**Status:** `finalized`

**Description:**
Defined the complete project foundation — tech stack, development workflow, and core architecture principles based on the master specification document.

### Tech Stack Finalized

| Layer | Choice |
|---|---|
| Backend | NestJS + TypeScript |
| Database | PostgreSQL (RLS for tenant isolation) |
| ORM | Drizzle ORM |
| Validation | Zod |
| Auth | JWT (RS256) + Passport.js + Redis sessions |
| Queue | BullMQ + Redis |
| Cache | Redis |
| Storage | Cloudflare R2 / AWS S3 |
| API | REST + OpenAPI/Swagger |
| Testing | Jest + Supertest + Testcontainers |
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Frontend | PWA (mobile-first web app, no native iOS/Android apps) |

### PWA Decision

PWA chosen over native mobile apps. Acceptable limitations: no iOS push on older devices, no NFC/biometrics, no SMS auto-read. Core use cases (attendance, fees, homework, results, messaging) are fully supported. Mobile-first responsive implementation from day one.

### Development Workflow Finalized

1. **Phase 1 — Foundation:** DB schema, NestJS core, multi-tenant middleware pipeline, JWT auth, RBAC, feature flags, subscription engine, audit logging
2. **Phase 2 — Platform Admin:** SuperAdmin module, tenant management, subscription management
3. **Phase 3 — Tenant Onboarding:** Institution setup, academic structure, user provisioning
4. **Phase 4 — Core Modules:** Admissions, Students, Staff, Attendance, Fees, Exams, Timetable, Homework
5. **Phase 5 — Secondary Modules:** Communication, Library, Transport, Hostel, HR, Inventory
6. **Phase 6 — Dashboards & Portals:** All role-specific dashboards and portals
7. **Phase 7 — Public API & Webhooks**

### Location

`C:\Users\adii2\Desktop\ERP` — Project root

---

## [2026-07-29] Start — Phase 1a: Database Schema Design

**Status:** `in-progress`

**Description:**
Beginning the full database schema design covering all tables, relationships, indexes, RLS policies, and data types for the entire ERP platform.

### Scope

- Multi-tenant foundation (institutions, branches)
- User & auth system (roles, permissions, sessions)
- Subscription & feature flags
- Academic structure (departments, classes, sections, subjects)
- Admissions & student records
- Staff management
- Attendance
- Fee management
- Examinations & results
- Timetable
- Homework & assignments
- Communication (notifications, SMS, email)
- Library
- Transport
- Hostel
- HR & payroll
- Inventory & assets
- Audit logging
- All JSONB metadata fields for flexibility

### Database Schema Overview

- **Tables created:** 80+
- **Enums:** 16 (tenant_status, attendance_status, payment_method, exam_type, etc.)
- **Indexes:** 100+ covering foreign keys, unique constraints, and frequent queries
- **RLS:** Enabled on all tenant-scoped tables with dynamic policy generation
- **Audit:** Partitioned audit_logs table by month with auto-creation trigger
- **Feature flags:** 17 system feature flags mapped to 3 subscription plans
- **Seed data:** 3 plans (Basic/Pro/Enterprise), SuperAdmin role, all feature flags

### Modules Covered

Tenant/Subscription, Branches, Users/Roles/Permissions, Academic Structure, Admissions, Students, Parents, Staff, Attendance (student + staff), Leave Management, Fee Management (structures, discounts, concessions, transactions, receipts, invoices), Payroll, Expenses/Income, Examinations, Marks, Results, Timetable, Homework, Assignments, Lesson Plans, Library, Transport (vehicles, drivers, routes, fuel, maintenance), Hostel (rooms, beds, complaints, visitors), Communication (notifications, templates, logs, announcements, circulars), Inventory, Assets, HR/Recruitment, Performance Reviews, Visitor Management, ID Cards/Certificates, Settings/Branding

### Location

`database/001_schema.sql` — Complete schema file (2293 lines)

---

## [2026-07-29] Phase 1b: NestJS Project Structure

**Status:** `completed`

**Description:**
Initialized NestJS project with modular architecture, configuration, database layer, and shared common modules.

### Project Structure

```
backend/
├── src/
│   ├── main.ts                          # Entry point with Swagger, CORS, Helmet, validation
│   ├── app.module.ts                    # Root module (Config, Throttler, Database)
│   ├── common/
│   │   ├── interfaces/                  # TenantContext, ApiResponse interfaces
│   │   ├── constants/                   # Roles, modules, plan constants
│   │   ├── filters/                     # Global exception filter
│   │   ├── guards/                      # (to be populated)
│   │   ├── interceptors/               # (to be populated)
│   │   ├── decorators/                 # (to be populated)
│   │   ├── middleware/                  # (to be populated)
│   │   └── pipes/                       # (to be populated)
│   ├── config/                          # App, database, JWT, Redis configs
│   ├── database/                        # Drizzle ORM provider + schema
│   └── modules/                         # Feature modules (auth, tenants, users, etc.)
├── .env                                 # Environment variables
├── drizzle.config.ts                    # Drizzle Kit configuration
├── nest-cli.json
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

### Dependencies Installed

- NestJS core, Config, JWT, Passport, Throttler, Swagger
- Drizzle ORM + pg (PostgreSQL)
- Zod, class-validator, class-transformer (validation)
- Redis, BullMQ (queue/cache)
- Helmet, cookie-parser (security)
- bcryptjs (password hashing)

### Build Status

`npx nest build` — **passes cleanly**

### Location

`backend/` — NestJS application root

---

## [2026-07-29] Phases 1c–1e: Multi-tenant Pipeline, JWT Auth & RBAC Engine

**Status:** `completed`

**Description:**
Built the zero-trust security spine that every API request flows through.

### Pipeline (order of execution)

```
Request → TenantMiddleware → JwtAuthGuard → TenantGuard → RolesGuard → PermissionsGuard → TenantContextInterceptor → Handler
```

| Component | Location | Responsibility |
|---|---|---|
| **TenantMiddleware** | `common/middleware/tenant.middleware.ts` | Extracts tenant from `X-Tenant-Id` header, validates existence & active status |
| **JwtStrategy** | `modules/auth/strategies/jwt.strategy.ts` | Validates Bearer token, verifies user still exists & active |
| **TenantGuard** | `common/guards/tenant.guard.ts` | Verifies tenant context + subscription is active/not expired |
| **RolesGuard** | `common/guards/roles.guard.ts` | Checks user has required roles (set via `@Roles()` decorator) |
| **PermissionsGuard** | `common/guards/permissions.guard.ts` | Checks user has required permissions (set via `@Permissions()` decorator) |
| **TenantContextInterceptor** | `common/interceptors/tenant-context.interceptor.ts` | Sets PostgreSQL session vars (`app.current_tenant_id`, etc.) for RLS |
| **AllExceptionsFilter** | `common/filters/all-exceptions.filter.ts` | Global error handler with structured JSON responses |

### Decorators Created

- `@Public()` — marks route as public (bypasses auth)
- `@Roles(...)` — sets required roles on route
- `@Permissions(...)` — sets required permissions on route
- `@CurrentUser()` — extracts authenticated user from request

### Auth Module

- **Login** — email/password → JWT access + refresh tokens
- **Refresh** — refresh token rotation
- **Logout** — session invalidation
- **JWT payload** — includes sub, email, tenantId, roles, permissions, sessionId, isSuperAdmin

### Tenant Onboarding (Phase 2 prep)

`modules/tenants/tenants.service.ts` — creates tenant, assigns plan subscription, seeds default roles (owner, principal, teacher, parent, student, etc.), creates owner account

### Build Status

`npx nest build` — **passes cleanly**

### Files Created/Modified (14 files)

| File | Purpose |
|---|---|
| `common/middleware/tenant.middleware.ts` | Tenant resolution middleware |
| `common/guards/tenant.guard.ts` | Subscription & tenant validation guard |
| `common/guards/roles.guard.ts` | Role-based access guard |
| `common/guards/permissions.guard.ts` | Permission-based access guard |
| `common/decorators/current-user.decorator.ts` | Current user param decorator |
| `common/decorators/roles.decorator.ts` | Roles metadata decorator |
| `common/decorators/permissions.decorator.ts` | Permissions metadata decorator |
| `common/decorators/public.decorator.ts` | Public route decorator |
| `common/interceptors/tenant-context.interceptor.ts` | PG session var injector |
| `common/filters/all-exceptions.filter.ts` | Global exception filter |
| `modules/auth/auth.module.ts` | Auth module |
| `modules/auth/auth.service.ts` | Login, refresh, logout logic |
| `modules/auth/auth.controller.ts` | Auth REST endpoints |
| `modules/auth/strategies/jwt.strategy.ts` | JWT validation strategy |
| `modules/auth/dto/login.dto.ts` | Login DTO with validation |
| `modules/auth/dto/refresh.dto.ts` | Refresh token DTO |
| `modules/tenants/tenants.service.ts` | Tenant creation with role seeding |
| `modules/tenants/tenants.controller.ts` | Tenant REST endpoint |
| `modules/users/users.service.ts` | User creation & listing |
| `app.module.ts` | Global guard & interceptor registration |

---

## [2026-07-29] Phase 1f: Feature Flag Engine

**Status:** `completed`

**Description:**
Built the feature flag system that controls module availability based on subscription plans, with per-tenant overrides and in-memory caching.

### Architecture

```
@RequiresFeature('multi_branch') decorator
  → FeatureFlagGuard reads metadata
    → FeatureFlagsService.isFeatureEnabled(tenantId, featureCode)
      → Check in-memory cache (5 min TTL)
        → DB query: tenant_override → plan_feature → feature_flag default
          → Cache result → return boolean
```

### Resolution Priority

1. **Tenant override** (`tenant_features.override_plan = true`) — highest
2. **Plan feature** (`plan_features.is_enabled`) — standard
3. **Flag default** (`feature_flags.default_value`) — fallback

### Files Created

| File | Purpose |
|---|---|
| `modules/feature-flags/feature-flags.module.ts` | Global module registration |
| `modules/feature-flags/feature-flags.service.ts` | Core logic with caching |
| `modules/feature-flags/feature-flags.controller.ts` | SuperAdmin management endpoints |
| `common/decorators/requires-feature.decorator.ts` | `@RequiresFeature()` decorator |
| `common/guards/feature-flag.guard.ts` | Guard that checks required feature |

### Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/feature-flags/tenant/:tenantId` | List enabled features for tenant |
| GET | `/feature-flags/plan/:planId` | Feature config for a plan |
| POST | `/feature-flags/tenant/:tenantId/:featureCode` | Set tenant-level override |
| PUT | `/feature-flags/plan/:planId/:featureCode` | Update plan feature mapping |

---

## [2026-07-29] Phase 1g: Subscription Engine

**Status:** `completed`

**Description:**
Built the complete subscription lifecycle management with plan CRUD, subscription assignment, renewal, suspension, cancellation, plan change, and plan limit enforcement.

### Capabilities

| Feature | Description |
|---|---|
| **Plan Management** | Create, update, list, deactivate subscription plans with configurable limits |
| **Subscription Assignment** | Assign plan to tenant with optional trial period, monthly/yearly billing |
| **Lifecycle** | Activate → Renew → Change Plan → Suspend → Cancel |
| **Plan Limit Checks** | `canCreateBranch`, `canAddUser`, `canAddStudent`, `canAddStaff` with `assert*` methods that throw on violation |
| **Admin Reports** | List all subscriptions, get expiring subscriptions, subscription stats |
| **Self-Correction** | On assign/change plan, tenant limits auto-update from plan config |

### Endpoints

| Method | Path | Role |
|---|---|---|
| GET | `/subscriptions/plans` | Public |
| GET | `/subscriptions/plans/:id` | SuperAdmin |
| POST | `/subscriptions/plans` | SuperAdmin |
| PUT | `/subscriptions/plans/:id` | SuperAdmin |
| DELETE | `/subscriptions/plans/:id` | SuperAdmin |
| GET | `/subscriptions/tenant/:tenantId` | SuperAdmin, Owner |
| POST | `/subscriptions/assign` | SuperAdmin |
| POST | `/subscriptions/renew/:tenantId` | SuperAdmin |
| POST | `/subscriptions/change-plan/:tenantId` | SuperAdmin |
| POST | `/subscriptions/suspend/:tenantId` | SuperAdmin |
| POST | `/subscriptions/cancel/:tenantId` | SuperAdmin |
| GET | `/subscriptions/limits/:tenantId` | SuperAdmin, Owner, Principal |
| GET | `/subscriptions/admin/all` | SuperAdmin |
| GET | `/subscriptions/admin/expiring` | SuperAdmin |
| GET | `/subscriptions/admin/stats` | SuperAdmin |

### Files Created

`modules/subscriptions/subscriptions.service.ts`, `subscriptions.controller.ts`, `subscriptions.module.ts`, `dto/create-plan.dto.ts`, `dto/assign-subscription.dto.ts`, `dto/change-plan.dto.ts`

---

## [2026-07-29] Phase 1h: Base CRUD + Error Handling

**Status:** `completed`

**Description:**
Built reusable abstractions to eliminate boilerplate across all 16+ modules: base CRUD service, pagination helpers, consistent API response formatting, and standard DTOs.

### Files Created

| File | Purpose |
|---|---|
| `common/base/crud.service.ts` | Abstract base class with `findMany`, `findById`, `softDelete`, `exists`, `count`, `buildTenantWhere` — all tenant-isolation aware |
| `common/helpers/pagination.helper.ts` | `parsePagination`, `buildPaginationMeta`, `paginatedResult`, `calculateOffset` |
| `common/helpers/response.helper.ts` | `ApiResponse.ok()`, `.created()`, `.paginated()`, `.error()`, `.validationError()` |
| `common/dto/pagination-query.dto.ts` | Reusable `PaginationQueryDto` with validation (page, limit, sortBy, sortOrder, search) |
| `common/dto/id-param.dto.ts` | Reusable `IdParamDto` with UUID validation |

### Usage Pattern

Every new module service extends `CrudService` and gets tenant-isolated CRUD for free:

```ts
export class StudentsService extends CrudService {
  protected tableName = 'students';
  protected tenantColumn = 'tenant_id';
  protected logger = new Logger(StudentsService.name);
}
```

---

## [2026-07-29] Phase 1i: Audit Logging System

**Status:** `completed`

**Description:**
Built a centralized, buffered audit logging system that captures all critical actions with structured metadata, tenant context, and automatic decorator-based logging.

### Architecture

```
@AuditLog({ action: 'create_student', module: 'admissions', resourceIdParam: 'id' })
  → AuditLogInterceptor (reads decorator metadata)
    → AuditService.log() (buffered, flushes every 5s or 50 entries)
      → Bulk INSERT into audit_logs (partitioned table)
```

### Key Features

| Feature | Detail |
|---|---|
| **Buffered logging** | Batches up to 50 entries or flushes every 5s — no per-request DB write |
| **Decorator-driven** | `@AuditLog()` on controller methods auto-logs success/failure |
| **Programmatic API** | `AuditService.log()` and `AuditService.logAction()` for manual logging |
| **Resource tracking** | Auto-resolves `resourceId` from route params |
| **Outcome tracking** | Logs success on response, failure on error |
| **Full-text search** | Endpoints for filtering by tenant, user, action, module, resource, date range |
| **Dashboard stats** | Module-wise counts, daily activity trends |

### Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/audit` | Full search with filters |
| GET | `/audit/tenant/:tenantId` | Tenant-specific logs |
| GET | `/audit/user/:userId` | User-specific logs |
| GET | `/audit/resource/:type/:id` | Resource-specific logs |
| GET | `/audit/stats/modules` | Module-wise stats |
| GET | `/audit/stats/daily` | Daily activity trends |

### Files Created

`modules/audit/audit.service.ts`, `audit.controller.ts`, `audit.module.ts`, `common/decorators/audit-log.decorator.ts`, `common/interceptors/audit-log.interceptor.ts`

---

## [2026-07-29] Phase 1j: Testing

**Status:** `completed`

**Description:**
Wrote comprehensive unit tests for all Phase 1 components with mocked database dependencies.

### Test Results

```
Test Suites: 7 passed, 7 total
Tests:       39 passed, 39 total
```

### Test Coverage

| Module | Tests | Key Scenarios |
|---|---|---|
| **AuthService** | 8 | Valid login, wrong password, inactive user, user not found, token refresh, logout |
| **FeatureFlagsService** | 6 | Enabled/disabled features, caching, tenant override, unknown feature |
| **SubscriptionsService** | 7 | Plan creation, duplicate code, branch limits (under/at/no subscription), trial assignment, cancellation |
| **RolesGuard** | 5 | No roles required, matching role, SuperAdmin bypass, denied, unauthenticated |
| **PermissionsGuard** | 5 | No permissions required, matching permission, SuperAdmin bypass, denied, unauthenticated |
| **AuditService** | 5 | Buffer, auto-flush at threshold, paginated find, filtered find, logAction |
| **AppController** | 1 | Root endpoint |

### Test Infrastructure

- `common/test/mocks.ts` — Reusable `MockDatabaseProvider`, `mockJwtService`, `mockConfigService`, `mockReflector`
- Jest configured with ESM transform support for `uuid`, `drizzle-orm`, `pg`

---

## [2026-08-02] Phases 2–5: Platform Admin through Secondary Modules (consolidated)

**Status:** `completed`

**Description:**
Backend modules built after Phase 1 (logged below in condensed form — each was built, unit-tested, and live-verified against the demo tenant).

| Phase | Modules | Highlights |
|---|---|---|
| **2 — Platform Admin** | tenants, subscriptions, users, roles, feature-flags, system-config, audit | Tenant lifecycle (suspend/activate), plan enforcement via subscription limits, superadmin-only routes |
| **3 — Tenant Onboarding** | branches, academic (departments/classes/sections/subjects), staff, students | School structure setup, student/staff records with branch scoping |
| **4 — Core Modules** | admissions (enquiries/applications), attendance, fees, exams, timetable, homework, import | Fee accounts + invoices + payments + receipts + collection reports, attendance with class/date unique constraints, CSV bulk import with validation batches |
| **5 — Secondary Modules** | communication (notices/announcements/circulars), library, transport, hostel, hr, payroll, leave, inventory, expenses, lesson-plans, notifications, id-cards, visitors, uploads | Full CRUD per module, role-guarded, branch-aware, audit-logged |

**Verification:** 30 Jest suites / 237 tests green; every module exercised against `4b51a390-259b-409f-ba70-ccfb5460af74`.

---

## [2026-08-02] Phase 6a: Frontend Foundation + Password Reset

**Status:** `completed`

**Description:**
React SPA foundation and the password-reset flow that replaced the dev-only "reset all passwords" endpoint.

### Frontend Stack (final)

Vite 8 + React 19 + TypeScript + Tailwind 4 (via `@tailwindcss/vite`) + TanStack Query + react-router-dom 7 + axios + lucide-react + `vite-plugin-pwa` (offline-ready PWA manifest, SW via generateSW).

### Key Pieces

| Piece | Detail |
|---|---|
| `src/lib/api.ts` | Axios instance → `/api/v1` (dev proxy to :3000), JWT auto-refresh on 401, envelope unwrapping, auth persisted in localStorage |
| `src/lib/auth.tsx` | Login/logout context, `persistLogin()` extracts `sessionId` from JWT payload |
| `src/lib/nav.ts` | `ROLE_LABELS`, per-role nav, `homeFor()` redirect map |
| `src/components/Shell.tsx` | Sidebar + topbar layout, mobile hamburger, role badge |
| Routes | `/login`, `/forgot-password`, `/reset-password`, role dashboards, `ComingSoon` placeholders for module pages, `RequireAuth`/`RequireRole` guards |

### Password Reset (backend)

- `POST /auth/forgot-password`, `POST /auth/reset-password` — public, throttled 5/min
- Reset token = JWT (uses `JWT_REFRESH_SECRET`, 15m expiry, `type: 'password-reset'`)
- On reset: bcrypt-12 rehash, clears lockout, invalidates all sessions
- `devResetLink` returned in the response when SMTP is not configured (dev convenience)

---

## [2026-08-02] Phase 6b: Role Dashboards & Portals

**Status:** `completed`

**Description:**
Backend dashboard endpoints + frontend portal pages for all 12 roles.

### Backend (`GET /api/v1/dashboard/*`)

| Endpoint | Roles | Content |
|---|---|---|
| `/overview` | owner, principal | Counts (students/staff/classes/…), fees collected (month/total/due), 6-month fee series, attendance today + weekly |
| `/teacher` | teacher | My classes, today's periods, open homework, submissions pending grading, today's attendance rate, upcoming exams |
| `/student` | student | Enrollment, 30-day attendance, fee account + recent payments, results, homework (resolved by email match) |
| `/parent` | parent | Linked children (via `student_parents`), per-child 30-day attendance + fee totals |
| `/accountant` | accountant | Collections (today/month/total), pending/overdue invoices, due accounts, expenses/income/net this month, recent payments |
| `/hr` | hr | Staff totals (active/teaching/inactive/joined this month), pending leave requests, open job postings |
| `/reception` | reception | Visitors today + checked-in now, enquiries, applications, active notices, recent visitors |
| `/librarian` | librarian | Books total/available, members, active/overdue/due-today issues, recent issues |
| `/transport` | transport-manager | Vehicles, active routes/assignments, fuel cost this month, maintenance due, recent fuel logs |
| `/hostel` | hostel-manager | Hostels, rooms + occupancy rate, active allocations, today's attendance |

All endpoints are role-guarded, branch-aware, and return `{ linked: false, message }` when no identity record is linked (teacher/student/parent).

### Frontend

- `OverviewDashboard` (owner/principal), `SuperAdminDashboard`, `TeacherDashboard`, `StudentDashboard`, `ParentDashboard`
- `PortalDashboard` — one config-driven page covering accountant, HR, reception, librarian, transport, hostel
- Routes: `/owner`, `/principal`, `/admin`, `/teacher`, `/student`, `/parent`, `/accountant`, `/hr`, `/reception`, `/librarian`, `/transport`, `/hostel`
- Demo credentials on the login page for all 12 roles (all passwords `Test@123` except owner `Owner@123` / superadmin `Admin@123`)

### Demo Data (DB, not committed)

teacher3 → Neha Sharma (EMP-001); student3 → STD-00001 (Class 9); parent3 → linked parent; acc3/hr3/reception3/librarian3/transport3/hostel3 → passwords standardized to `Test@123`.

---

## [2026-08-02] Phase 6 Housekeeping

**Status:** `completed`

**Description:**
Security/architecture items outstanding from earlier phases.

### 1. RLS rolled out to every tenant table

- `backend/db/migrations/rls-full-tenancy.sql` — enables RLS + `tenant_isolation` policy on all 95 `tenant_id NOT NULL` tables (dynamic loop over `pg_class`), plus nullable-tenant policies for `users`, `roles`, `notification_templates`, `audit_logs` (user_sessions pattern)
- Applied to the DB; verified 95/95 tables RLS-enabled. `force=false` (app connects as superuser; forcing requires per-request GUC wiring first — documented in the migration)
- Known gap documented: 6 entity tables without `tenant_id` (hostel_rooms, transport_route_stops, inventory_*_items, accounting_journal_entry_items) — future schema-normalization migration

### 2. Job queue wired (BullMQ)

- `QueueModule` (@Global) + `QueueService` — TCP-probes Redis at boot; if reachable, creates the `email-jobs` queue + worker (concurrency 5, 3 attempts, exponential backoff)
- `EmailService.send()` prefers the queue and falls back to inline sending when Redis is down — dev works without Redis, prod gets durability/retries
- Both `bullmq` and `redis` packages were already in dependencies

### 3. Fee module quirk fixed

- All branch-scoped read queries (`findStructuresByBranch`, `findDiscountsByBranch`, `findAccountByStudent`, `findAccountsByBranch`, `findInvoicesBy*`, `findPaymentsBy*`) now take `(tenantId, branchId | null)`:
  - Always filter by tenant (defense in depth)
  - Skip the branch filter when `branchId` is null — branch-less owner accounts now see tenant-wide data instead of nothing
- `ORGANIZATION_OWNER` added to all read-only fee endpoints

### 4. Frontend tests (Vitest)

- `vitest` added; `npm test` → 36 tests across `api.test.ts` (unwrap/errorMessage/persistLogin), `nav.test.ts` (homeFor/navFor/ROLE_LABELS), `SimpleBars.test.tsx` (rendering/scaling)

**Backend:** 30 suites / 237 tests green · **Frontend:** 36 tests green · build clean both sides

---

## [2026-08-02] Phase 7 � Public API & Webhooks

**Status:** `completed`

**Description:**
Tenant-scoped API keys, a read-only public API, and signed webhook delivery with retries + delivery log.

### 1. Schema + migration (`db/migrations/phase7-api-keys-webhooks.sql`)

- `api_keys` � tenant-scoped; stores `key_prefix` + `key_hash` (SHA-256) only, never the secret; scopes, per-minute rate limit, expires_at, last_used_at, soft delete
- `webhook_endpoints` � tenant-scoped; URL, signing secret, subscribed events (`*` or comma list), soft delete
- `webhook_deliveries` � per-attempt log: status, attempts/max, response_status/body, error, sent_at, next_retry_at
- RLS `tenant_isolation` policies applied to all three tables; migration idempotent (verified by double-apply)

### 2. API keys (`/api/v1/api-keys`, owner + principal)

- POST creates `erp_live_<base64url>` (secret returned once), GET lists (masked), PATCH updates, POST :id/revoke, DELETE soft-deletes
- `ApiKeyGuard` (`common/guards/api-key.guard.ts`) � reads `Authorization: Bearer <key>` or `X-Api-Key`; hash lookup; rejects revoked/expired; per-key in-memory fixed-window rate limiter (429); stamps `last_used_at`
- Scopes validated: `read` / `read,write`

### 3. Public API (`/api/v1/public/*`, API-key auth)

- `GET /students` (filters: classId, academicYearId, status, q, limit, offset), `GET /students/:id`
- `GET /fee/accounts`, `GET /fee/invoices`, `GET /fee/payments` (studentId/status/date range filters)
- `GET /attendance` (requires studentId or classId + from/to), `GET /results` (studentId or examId)
- All read-only, tenant-scoped, `{ success, data }` envelope, paginated (max 100)
- Verified live: 401 for missing/bad key AND for JWT tokens (keys only); valid key returns tenant data

### 4. Webhooks (`/api/v1/webhooks`, owner + principal)

- CRUD for endpoints (URL must be http(s), secret >= 16 chars, unknown events rejected)
- `POST :id/test` ? `test.ping`; `GET /events` ? event catalog
- `GET /deliveries` (limit/status/endpointId filters), `POST /deliveries/:id/retry` � resets attempt budget and re-delivers
- Delivery: HMAC-SHA256 over `timestamp.payload` sent as `X-ERP-Signature` (+ X-ERP-Event/Timestamp/Delivery-Id headers); up to 3 attempts with exponential backoff (2s, 4s, �); every attempt logged
- Verified live end-to-end: capture listener received signed POST (signature recomputed and matched); `fee.payment.recorded` fired automatically after a real payment; failed delivery retried 3x then manually retried to success

### 5. Event emission hooks

- `fee.payment.recorded`, `fee.invoice.generated` (fee.service), `student.created` (students.service), `attendance.marked` (attendance.service) � fire-and-forget after DB commit; `WebhooksModule` imported by fee/students/attendance modules (no circular deps)

### 6. Frontend

- `/integrations` page (owner + principal, nav "API & Webhooks"): API key create (secret shown once with reveal/copy) / revoke / delete; webhook create (event chips) / test ping / delete; deliveries table with retry for failures
- Types added to `lib/types.ts`; route + nav wired in App.tsx/nav.ts

### 7. Housekeeping

- `TenantContextInterceptor` now also sets `app.tenant_id` (alias policies read) alongside `app.current_tenant_id` � policies work if the app ever connects as a non-owner role
- Public API results endpoint uses `e.start_date` (exams has no exam_date column)

**Backend:** 33 suites / 268 tests green (+31 new: api-keys 10, webhooks 12, guard 8, +1 baseline) A? **Frontend:** 36 tests green A? builds clean both sides A? live-verified end-to-end

---

## [2026-08-03] Phase 8d - Operations & Platform Admin Pages

**Status:** `completed`

**Description:**
Replaced every remaining ComingSoon placeholder with a working page: expenses, leave, payroll, library, transport, hostel, visitors, accounting, tenants, subscriptions, audit, and the role portal fallback. Fixed backend role gaps discovered while wiring each page.

### 1. HR modules (Expenses, Leave, Payroll)

- `/expenses` page (owner/accountant/principal): categories + expenses CRUD with amount/branch/payment method
- `/leave` page (owner/principal/hr): leave types + requests with approve/reject
- `/payroll` page (owner/accountant/principal/hr): salary components + payroll records with draft-to-paid status flow
- Backend: added `ROLES.HR` to 7 leave endpoints and 6 payroll endpoints (list + create + status)

### 2. Operations modules (Library, Transport, Hostel, Visitors)

- `/library` (owner/principal/librarian): books, members (student/staff), issue/return
- `/transport` (owner/principal/transport-manager): vehicles, routes, student assignments
- `/hostel` (owner/principal/hostel-manager): hostels, rooms, bed allocations (room list cascades by hostel; allocations live in `hostel_bed_allocations`)
- `/visitors` (owner/principal/reception): check-in form + check-out
- Backend: added `ROLES.LIBRARIAN` (10), `ROLES.TRANSPORT_MANAGER` (13), `ROLES.HOSTEL_MANAGER` (13), `ROLES.RECEPTION` (4) to their module endpoints
- Fixed hostel controller 500: `@Get('allocations')` now declared before `@Get(':id')` (route-order bug swallowed the route)

### 3. Accounting

- `/accounting` (owner/accountant/principal): chart of accounts, double-entry journal entries (dynamic line items), trial balance, income statement, balance sheet
- No backend changes needed - controller roles were already correct (owner/accountant create; owner/accountant/principal lists + reports)

### 4. Platform admin (superadmin only)

- `/tenants`: stats cards (total/active/trial), tenant table with detail modal, create-tenant wizard (name/slug/plan + owner account). Fixed create payload to include required `planId` + owner fields; stats keys map to API (total/active/trial)
- `/subscriptions`: plan CRUD + all-tenant subscription table
- `/audit`: searchable log table (action/module/outcome filters, pagination) + top-module activity cards
- Superadmin access verified live as `admin@erp.com`

### 5. Portal fallback

- `/portal` now renders the user's role portal dashboard (falls back to reception view for unknown roles); deleted `ComingSoon.tsx` - no placeholders remain

**Backend:** 33 suites / 268 tests green **Frontend:** 36 tests green, tsc + oxlint + vite build clean **live-verified:** all endpoints round-tripped (create/read/update/delete) and cleaned up from dev DB; module-manager role access confirmed per module

---

## [2026-08-04] Phase 1 - Observability & Operations (items 1.2, 1.3, 1.5, 1.6 partial)

**Status:** `completed` (1.2, 1.3, 1.5) / `partial` (1.6)

**Description:**
Health endpoints, structured request logging, Prometheus metrics, and log hygiene - the first observability slice for public deployment.

### 1. Health endpoints (1.2) - `backend/src/modules/health/`

- `GET /api/v1/health` - liveness: `status / service / version / uptime / timestamp`
- `GET /api/v1/health/db` - SELECT 1 with 2s timeout; `database.latencyMs`, `redis.configured/enabled`; 503 `ServiceUnavailableException` when DB is down
- Both public (no tenant header, no auth); live-verified 200/200 on :3000
- Also fixed docker-compose bugs: api `command` ran `node dist/src/main.js` (crash - dist is `dist/main.js`), healthcheck hit `/api/v1/docs` (404 in prod); now `node dist/main.js` + `/api/v1/health`

### 2. Structured request logging (1.3) - `backend/src/common/middleware/`

- `RequestIdMiddleware` - honors sanitized `x-request-id` (regex `[A-Za-z0-9._:-]{1,64}`), echoes it as a response header, else generates a UUID
- `RequestLoggingMiddleware` - hooked on `res finish` (covers unmatched 404 routes and reads the final status, which a tap/interceptor cannot): one JSON line per request `{type, requestId, method, path, status, latencyMs, tenantId, userId, ip}`; never logs bodies, headers, or PII
- `requestId` added to `AllExceptionsFilter` error responses and 500 log lines
- First attempt used an interceptor - discarded after live-verifying the gaps (404s never reach interceptors; status captured before the exception filter runs)
- Live-verified: health 200, nonexistent 404, bad login 401 all logged with requestId

### 3. Metrics endpoint (1.5) - `backend/src/modules/metrics/`

- `GET /api/v1/metrics` (public, `text/plain; version=0.0.4`): `erp_api_uptime_seconds`, `erp_api_time_seconds`, Node heap/rss/external/arraybuffers bytes, event-loop lag samples (setImmediate delta), DB pool total/idle/waiting (new `DatabaseProvider.getPoolStats()`), `erp_queue_enabled`, `erp_http_requests_total{method,status}` incremented per request by the logging middleware
- Live-verified 200; Grafana dashboard config deferred (item 1.5 note)

### 4. Log rotation + audit (1.6 partial)

- `docker-compose.yml`: json-file log driver with `max-size 10m`, `max-file 3` on db/api/web services
- `scripts/log-audit.sh`: static secret scan (private keys, AWS keys, Slack/GitHub tokens, `sk-` secrets) + optional log-file PII scan (Aadhaar/email/phone regex); exit 1 on findings
- CI: new `security-audit` job in `.github/workflows/ci.yml` runs the script
- Remaining for 1.6: 30-day retention policy decision at deployment time (compose rotation covers size; retention by days needs the chosen VPS setup)

**Backend:** 276/276 unit after metrics (271 after 1.2, 274 after 1.3) · 2/2 e2e · builds clean

---

## [2026-08-06] Phase 2.1 - MFA / 2FA (TOTP + recovery codes)

**Status:** `completed`

**Description:**
Time-based one-time passwords (RFC 6238, zero new dependencies - pure `node:crypto`), login-challenge flow, recovery codes, and full UI. Also fixed a pre-existing RLS regression discovered while wiring it: the frontend never sent `X-Tenant-Id`, so every authenticated request from the SPA failed the subscription guard under RLS FORCE.

### 1. Backend - `backend/src/modules/auth/`

- `totp.util.ts`: base32 encode/decode, `generateTotpSecret()` (20 random bytes), `totpToken()` (SHA-1 HMAC, 8-byte big-endian counter, dynamic truncation), `verifyTotp()` (window +-1), `otpauthUrl()`; spec runs the official RFC 6238 test vectors
- `dto/two-factor.dto.ts`: `TwoFactorCodeDto` (6-digit or `XXXX-XXXX-XXXX` recovery format), `TwoFactorLoginDto`
- `auth.service.ts`: `startTwoFactorSetup` (secret generated + AES-256-GCM encrypted via global `CryptoService`; 409 if already enabled), `enableTwoFactor` (verifies TOTP, generates 10 bcrypt-hashed recovery codes, sets `twoFactorEnabled`), `disableTwoFactor` (verifies current code, clears flag + secret, deletes recovery codes), `issueTwoFactorChallenge` (JWT `{sub, type: 'mfa'}`, 5 min), `completeTwoFactorLogin` (verifies challenge token, then TOTP or a fresh recovery code; recovery codes are single-use with `used_at` stamping)
- `auth.controller.ts`: login returns `{requiresTwoFactor, mfaToken, user}` when 2FA is on; new `POST /auth/2fa/login` (public, throttled 5/60s), `POST /auth/2fa/setup`, `POST /auth/2fa/verify`, `POST /auth/2fa/disable`
- `jwt.strategy.ts`: rejects any token whose `type` claim is not `access` (mfa/refresh/reset tokens cannot be used as bearer)
- `tenant-context.interceptor.ts`: `app.allow_auth_lookup` GUC now also set for `/auth/2fa/login`
- Login + 2FA-login responses now include `tenantId` and `twoFactorEnabled` on the user object (needed by the frontend for the header fix and Settings state)

### 2. Migration - `backend/db/migrations/phase11-2fa.sql`

- `two_factor_recovery_codes` (id, tenant_id FK, user_id FK, code_hash, used_at, created_at) + 3 indexes
- RLS `tenant_isolation` + pre-auth `auth_lookup` policies, **FORCE RLS**, GRANTs to `erp_app`; idempotent
- `users.two_factor_enabled` / `two_factor_secret` columns existed schema-only from day one - now activated; secret is stored AES-256-GCM encrypted
- Applied to dev DB (table exists, `relforcerowsecurity = t`)

### 3. Frontend

- **Critical fix** `lib/api.ts`: request interceptor now sends `X-Tenant-Id` from stored auth for every request - under RLS FORCE the subscription guard returned "No active subscription found" for ALL authenticated SPA calls without it (reproduced live; header workaround unblocked the whole matrix)
- `Login.tsx`: two-step sign-in - credentials first; when the API answers with a challenge, a 6-digit code screen appears (accepts TOTP or recovery code, "back" to credentials)
- `Settings.tsx`: two-factor card - setup (shows base32 secret + otpauth URL for manual entry, verify with current code), one-time recovery-code display with copy buttons, and disable (verify current code)
- `lib/auth.tsx`: `login()` returns the challenge object when 2FA is required, new `completeTwoFactorLogin()`, `patchUser()` keeps stored auth in sync
- `lib/types.ts`: `TwoFactorChallenge`, `AuthUser.twoFactorEnabled`

### 4. Live verification (full matrix on dev, owner3@school.com)

- setup -> secret + otpauth URL; verify -> 10 recovery codes; login -> `requiresTwoFactor: true` + mfaToken
- 2fa/login with TOTP -> tokens; 2fa/login with recovery code -> tokens; wrong code -> 401; reused recovery code -> 401 (single-use)
- DB checks: 10 bcrypt hashes stored, exactly 1 marked used after consumption, secret encrypted (not the raw base32), secret cleared + codes purged after disable
- Challenge throttling verified (5/min, 429) - the earlier "expired" failures were throttle responses, not bugs

**Backend:** 37 suites / 291/291 unit, 2/2 e2e · **Frontend:** tsc + vite build clean · committed with Phase 1 observability wrap
