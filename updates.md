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
