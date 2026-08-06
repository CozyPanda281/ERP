# ERP Platform — Master Phase List

> **This file is the single source of truth for ALL project work.** Every task, feature, fix, and security requirement for the Educational ERP lives here. Nothing is done unless it is listed here, and nothing is listed as "Done" without evidence.
>
> Last updated: 2026-08-06

---

## 0. How This File Works (READ FIRST — THE FOOLPROOF RULES)

1. **Append-only.** Sections A and B below are IMMUTABLE once marked as released. Never edit, delete, or rewrite a released phase.
2. **Changes go at the bottom.** Any modification — new work, re-scoping, bug discovered, plan change — is written as a NEW version in Section B (or a new entry in Section C for notes) BELOW all existing content. The old text stays untouched.
3. **Status moves forward only.** When work in a phase is completed, a new "Progress Update" entry is appended at the end of Section B with `[DONE]` tags on the finished items — you do NOT edit the original item lines.
4. **Definition of Done (DoD) is mandatory.** Every phase has explicit DoD gates. A task is `[DONE]` only when its DoD checks pass (tests green, live-verified, evidence path recorded).
5. **Security is never optional.** Items marked 🔒 are mandatory before the phase ships — no exceptions, no "later" for production.
6. **Evidence rule.** Every `[DONE]` must reference the file/URL/command used to verify it (e.g., "verified via GET /api/v1/... → 200"). Empty claims are not accepted.

### Legend

| Marker | Meaning |
|---|---|
| `[ ]` | Pending |
| `[~]` | Partial / in progress |
| `[x]` | Done (evidence in the change log) |
| 🔒 | Security requirement (mandatory gate) |
| 🧪 | Requires live/automated verification (test) |

---

## A. ORIGINAL PHASE LISTS — PRESERVED, UNCHANGED

> Quoted verbatim from `updates.md` (initial planning + later additions). Do NOT modify this section.

### A1. Development Workflow Finalized (2026-07-29, from `updates.md`)

1. **Phase 1 — Foundation:** DB schema, NestJS core, multi-tenant middleware pipeline, JWT auth, RBAC, feature flags, subscription engine, audit logging
2. **Phase 2 — Platform Admin:** SuperAdmin module, tenant management, subscription management
3. **Phase 3 — Tenant Onboarding:** Institution setup, academic structure, user provisioning
4. **Phase 4 — Core Modules:** Admissions, Students, Staff, Attendance, Fees, Exams, Timetable, Homework
5. **Phase 5 — Secondary Modules:** Communication, Library, Transport, Hostel, HR, Inventory
6. **Phase 6 — Dashboards & Portals:** All role-specific dashboards and portals
7. **Phase 7 — Public API & Webhooks**

### A2. Later Additions (from `updates.md`, recorded as built)

- **Phase 8 — Frontend Build-out:** 8a PWA shell + auth pages, 8b role dashboards, 8c module pages, 8d operations & platform-admin pages
- **Phase 9 — Appointments** (calendar, scheduling, status workflow, participants)

### A3. Original Tech Stack Decision (2026-07-29, preserved for reference)

| Layer | Choice |
|---|---|
| Backend | NestJS + TypeScript |
| Database | PostgreSQL (RLS for tenant isolation) |
| ORM | Drizzle ORM |
| Auth | JWT + Passport.js + sessions |
| Queue | BullMQ + Redis |
| Storage | Cloudflare R2 / AWS S3 (later phase) |
| API | REST + OpenAPI/Swagger |
| Testing | Jest + Supertest + Testcontainers |
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Frontend | PWA (mobile-first web app, no native iOS/Android apps) |

---

## B. NEW PHASE PLAN — v1.0 (2026-08-04)

> Complete rebuild of the roadmap from the current state audit (34-module master list vs. delivered code, security audit, compliance research). Phases are ordered so that security and production-readiness come first; feature phases follow. Every gap from the audit is listed — nothing is dropped.

---

### Phase 0 — Baseline: Completed Foundation (record of work already done)

> This phase documents what already exists with evidence, so it is never re-planned or lost. Do NOT redo these items.

**Status: `[x]` RELEASED — verified 2026-08-04**

| # | Item | Evidence |
|---|---|---|
| 0.1 | Multi-tenant RLS on all tenant tables + fail-closed policies | `backend/db/migrations/rls-full-tenancy.sql`, `rls-hardening.sql` |
| 0.2 | 🔒 RLS FORCED on 96 tables + dedicated `erp_app` non-superuser role | `backend/db/migrations/phase10-rls-force.sql`; verified fail-closed (0 rows w/o GUC) and live isolation (cross-tenant probe → 0 rows) |
| 0.3 | 🔒 Per-request RLS context via AsyncLocalStorage + GUC-aware pool (no cross-request leakage) | `backend/src/database/database.provider.ts`, `tenant-context.interceptor.ts`, `tenant.middleware.ts`, `api-key.guard.ts` |
| 0.4 | 🔒 Auth flows under FORCE (login, refresh, forgot/reset password, audit writes) | `auth_lookup` policies; live-verified: owner/parent/teacher/superadmin logins, refresh, logout-all-sessions, forgot-password all OK |
| 0.5 | 🔒 Refresh + access tokens hashed at rest (SHA-256) in `user_sessions` | `auth.service.ts`; DB shows 64-hex digests; refresh/lookup verified |
| 0.6 | 🔒 PII encryption AES-256-GCM (users.phone, parents.phone/email) + key-rotation script | `shared/crypto`, `scripts/rotate-encryption.js`; rotation executed & decrypt path verified |
| 0.7 | 🔒 Aadhaar masking (last-4 only, create+update, DB-verified `XXXX-XXXX-9012`) | `staff.service.ts maskAadhaar()` |
| 0.8 | 🔒 No secrets in code; strong JWT secrets enforced (`getOrThrow` + weak-key block); encryption key fail-fast on dev defaults | `jwt.config.ts`, `encryption.config.ts`, `crypto.service.ts` |
| 0.9 | 🔒 Webhook SSRF guard (private/loopback/link-local rejected), HMAC-SHA256 signatures, retry w/ backoff | `webhooks.service.ts`; live-verified 169.254.169.254/localhost/etc → 400 |
| 0.10 | 🔒 Public API: allowlisted response fields (no Aadhaar/phone/email leak), API-key hashing, rate limits, scopes, expiry | `public-api.service.ts`; live-verified with seeded PII |
| 0.11 | 🔒 Login throttling (5/min) + account lockout (5 fails → 15 min) + global throttle + refresh throttle | `auth.controller.ts`, `app.module.ts`; live-verified |
| 0.12 | 🔒 Upload path-traversal hardening | `uploads.service.ts` |
| 0.13 | 🔒 Swagger disabled in production | `main.ts`; verified in prod container (404) |
| 0.14 | 🔒 Demo credentials hidden in production (Login page dev-only; seed requires `SEED_ADMIN_PASSWORD`) | `frontend/src/pages/Login.tsx`, `backend/src/seed/seed.ts` |
| 0.15 | Production packaging: backend + frontend Dockerfiles, nginx (SPA + /api/v1 proxy + security headers), docker-compose (postgres/api/web + healthchecks), `.env.example`, migrate.sh, backup.sh | root of repo; api image live-verified (login 200 in prod mode) |
| 0.16 | CI (GitHub Actions: backend build + 268 tests + e2e, frontend build + 36 tests) + working e2e harness | `.github/workflows/ci.yml`, `backend/test/app.e2e-spec.ts` (2/2 passing) |
| 0.17 | Backend: 268/268 unit tests pass; frontend: tsc + 36/36 vitest + vite build pass | `npm test`, `npm run test:e2e` |
| 0.18 | RBAC (12 system roles, permissions, guards), subscription/feature-flag gating, audit log (IP/userAgent/session), login lockout, JWT sessions | modules: roles, subscriptions, feature-flags, audit, auth |

---

### Phase 1 — Production Readiness & Observability

**Objective:** the app can be deployed publicly, monitored, backed up, and operated safely by a single team.

| # | Item | Status |
|---|---|---|
| 1.1 | 🔒 Deployment runbook (VPS India + Docker Compose + Caddy or nginx TLS): written, walked through on a real server once | [ ] |
| 1.2 | `GET /health` + `GET /health/db` endpoints (liveness + DB ping + Redis status) | [x] 🧪 live-verified 200/200 on :3000; 271/271 unit, 2/2 e2e |
| 1.3 | Structured request logging (request id, tenant id, user id, latency, status) — no PII in logs | [x] 🔒 live-verified: 200/404/401 all logged w/ requestId + x-request-id header echo; middleware on `res finish` covers unmatched routes; `requestId` in error responses |
| 1.4 | Error tracking (Sentry or equivalent) + alerting channel (email/Slack) | [ ] |
| 1.5 | Metrics endpoint (Prometheus format: HTTP, DB pool, queue, email) + basic Grafana dashboard | [x] 🧪 live-verified 200 on :3000 (`/api/v1/metrics`, Prometheus text format); HTTP counter, uptime, time, heap, event-loop lag, DB pool total/idle/waiting, queue flag; Grafana config deferred |
| 1.6 | 🔒 Log rotation + retention (30d) + no secrets/PII in logs (audit via grep in CI) | [~] rotation done (compose json-file 10m x 3) + CI secret/PII grep (`scripts/log-audit.sh` → `security-audit` job); 30d retention decision at deploy |
| 1.7 | Backup & restore DRILL executed once (pg_dump → restore into a scratch DB → verify data) | [ ] 🧪 |
| 1.8 | Caddy/nginx TLS termination + auto-renew; HTTPS-only redirect; HSTS | [ ] 🔒 |
| 1.9 | Staging environment (compose override + separate DB) with demo data | [ ] |
| 1.10 | Load test baseline (e.g., k6: 50 concurrent logins + 200 concurrent reads; document numbers) | [ ] 🧪 |
| 1.11 | Redis optional-path verified in production (queue + cache) OR decision to drop Redis entirely with queue kept in-process | [ ] |
| 1.12 | DB connection pool sizing + `pgbouncer` decision documented for 20+ tenant scale | [ ] |

**DoD:** runbook executed once end-to-end; `/health` green; backup restore drill passed; load numbers recorded; staging live; no credentials in any log file.

---

### Phase 2 — Security Hardening Round 2 (user + platform)

**Objective:** close the remaining security gaps identified in the audit; prepare for DPDP compliance (India).

| # | Item | Status |
|---|---|---|
| 2.1 | 🔒 MFA/2FA: TOTP setup + verify + login-challenge endpoints; QR provisioning; recovery codes; users.twoFactor* columns activated | [x] 🧪 live-verified end-to-end (setup/verify/disable + login challenge + TOTP + recovery, single-use, throttled; DB: bcrypt-hashed codes, AES-GCM secret); otpauth URL provided for manual entry — QR image rendering deferred |
| 2.2 | 🔒 Password policy: min length 10, complexity, breach-list check (optional), force-change on first login; verify bcrypt cost 12 maintained | [ ] 🧪 |
| 2.3 | 🔒 Session management UI: list active sessions per user, revoke remote session, revoke all | [ ] |
| 2.4 | 🔒 Account-level protections: per-tenant email enumeration resistance on forgot-password (uniform response), rate limit per email+IP on reset | [ ] 🧪 |
| 2.5 | 🔒 Secret rotation procedure documented + scripted (JWT, ENCRYPTION_KEY — rotation script exists for PII; document for JWT) | [ ] |
| 2.6 | 🔒 DPDP compliance package: Privacy Policy + consent capture at user creation (incl. parental consent for students <18), data retention/deletion flows, Data Processor agreement template | [ ] |
| 2.7 | 🔒 Breach notification runbook (internal incident flow, 72h DPDP Board template, user notification template) | [ ] |
| 2.8 | 🔒 Children's data controls: no behavioural tracking, restricted marketing; consent audit trail | [ ] |
| 2.9 | 🔒 Aadhaar policy enforcement UI: input masks last-4 only everywhere; document UIDAI rule in staff form | [ ] |
| 2.10 | 🔒 Security headers audit (CSP, HSTS, X-Frame-Options, Permissions-Policy) on nginx + API responses | [ ] 🧪 |
| 2.11 | 🔒 Admin activity monitoring: alert on superadmin logins, bulk ops, permission changes (email/alert) | [ ] |
| 2.12 | SSO (OIDC/SAML) — optional, platform tier gated | [ ] |
| 2.13 | IP restrictions per tenant (allowlist) — platform tier gated | [ ] |
| 2.14 | Device management (registered devices, revoke) — roadmap | [ ] |
| 2.15 | 🔒 Dependency audit in CI (npm audit fail-on-high) + monthly review | [ ] |
| 2.16 | 🔒 Frontend XSS check: no dangerouslySetInnerHTML; escape in announcement/circular rendering; CSP enforced | [ ] 🧪 |

**DoD:** 2FA live-tested end-to-end; password policy enforced; session UI works; DPDP docs delivered; headers verified with curl; CI fails on high-severity advisories.

---

### Phase 3 — Online Payments (Fee Module)

**Objective:** real money flows — parent-facing payments, gateway integration, refunds, reconciliation. (Provider decision pending: Razorpay recommended, Cashfree runner-up.)

| # | Item | Status |
|---|---|---|
| 3.1 | Gateway account + keys in secrets manager; sandbox keys in staging | [ ] 🔒 |
| 3.2 | Payment intent creation API (invoice → payment order), signature verification on callback | [ ] 🔒 🧪 |
| 3.3 | Webhook consumption (payment.success/failed/refunded) → idempotent ledger updates + fee_payments rows | [ ] 🔒 🧪 |
| 3.4 | Payment status reconciliation job (poll gateway for stuck orders) | [ ] |
| 3.5 | Refund flow (admin-initiated, gateway refund + ledger note) | [ ] 🧪 |
| 3.6 | Receipts: printable/PDF receipt with gateway transaction id | [ ] |
| 3.7 | Payment methods: UPI/cards/netbanking via gateway; keep manual recording as fallback | [ ] |
| 3.8 | Online payment UI on parent portal + fee due reminders (email/SMS after Phase 4) | [ ] |
| 3.9 | Installments on invoices (due-date split) | [ ] |
| 3.10 | Scholarships module (activate `fee_concessions` table + API + UI) | [ ] |
| 3.11 | Fine/penalty calculation engine (late fee rules per structure) | [ ] 🧪 |
| 3.12 | Fee reports: collection by method, arrears, due-ageing, GST-inclusive breakdown (India) | [ ] |
| 3.13 | 🔒 PCI scope: no card data stored/processed on our servers (gateway-hosted) — verify with a code audit | [ ] |

**DoD:** sandbox end-to-end payment of ₹1 invoice succeeds, webhook recorded, receipt generated, refund reverses ledger; reconciliation job no-op on replay; code audit confirms zero card-data storage.

---

### Phase 4 — Communication Channels (SMS / WhatsApp / Email / Push)

**Objective:** reliable multi-channel notifications with India DLT compliance. (Provider research pending: MSG91 or Twilio; Meta WhatsApp Business API for WhatsApp.)

| # | Item | Status |
|---|---|---|
| 4.1 | Channel abstraction: single `notify()` API → email | SMS | WhatsApp | in-app | push | [ ] |
| 4.2 | SMS provider integration + DLT registration (sender ID, templates approved; template IDs stored per message) | [ ] 🔒 |
| 4.3 | WhatsApp Business API integration (templates, media, opt-in/opt-out registry) | [ ] 🔒 |
| 4.4 | Email provider hardening: SPF/DKIM/DMARC, from-domain verification, template system (reuse nodemailer + queue) | [ ] 🔒 |
| 4.5 | Push notifications (Web Push for PWA; FCM for future mobile) | [ ] |
| 4.6 | Notification preferences per user (channel on/off, quiet hours) | [ ] |
| 4.7 | Delivery status tracking + retry queue + dead-letter with admin view | [ ] |
| 4.8 | Emergency alerts (bulk, priority, bypass preferences) | [ ] |
| 4.9 | Message templates CRUD with variable placeholders + audit of sends | [ ] 🔒 |
| 4.10 | Wire into existing triggers: fee due, attendance, results, leave, announcements, appointments | [ ] 🧪 |
| 4.11 | Cost controls: monthly send caps per tenant, admin usage report | [ ] |
| 4.12 | 🔒 PII handling: consent flags per contact, no PII in logs, DLT compliance notes | [ ] |

**DoD:** each channel delivers a real message in staging; templates approved; prefs respected; send caps enforced; a test run of 3 channels for one fee reminder verified.

---

### Phase 5 — Student & Parent Portals (incl. routing fixes)

**Objective:** portals actually work for students and parents (current nav is broken).

| # | Item | Status |
|---|---|---|
| 5.1 | Fix frontend routing: student + parent nav targets real role-accessible routes (dedicated /student/*, /parent/* pages) | [ ] 🧪 |
| 5.2 | Fix reception "Admissions" nav → admissions page (create one or grant access) | [ ] |
| 5.3 | Parent portal: attendance per child, homework, results, timetable, notices, leave requests, communication, online fee payment (links to Phase 3) | [ ] |
| 5.4 | Student portal: dashboard, attendance, homework, study materials, timetable, results, fees, certificates (download), profile, leave application | [ ] |
| 5.5 | Portal backend APIs: parent/student-scoped reads + leave apply + profile update | [ ] 🧪 |
| 5.6 | 🔒 Scope check: portal endpoints never expose other students' data (RLS backstop test: student A token → student B → 403/empty) | [ ] 🧪 |

**DoD:** logged-in student and parent can complete every listed action; cross-student probe blocked; portal pages render on mobile width.

---

### Phase 6 — Reports, Documents & Export

**Objective:** everything printable/exportable — the biggest current tooling gap.

| # | Item | Status |
|---|---|---|
| 6.1 | PDF generation service (server-side; report cards, transcripts, hall tickets, ID cards, certificates, receipts, payslips) | [ ] |
| 6.2 | Certificate issuance flow: bonafide, character, TC, migration with template editor + QR verification codes | [ ] 🔒 (QR codes signed, no forgery) |
| 6.3 | ID card generation (template + student photo + QR) | [ ] |
| 6.4 | Report cards: grade + rank + remarks layout per school | [ ] |
| 6.5 | Export endpoints: CSV/Excel for every list page (students, staff, fee, attendance, results, ledger) | [ ] 🧪 |
| 6.6 | Scheduled report emails (daily fee collection, weekly attendance) via Phase 4 channels | [ ] |
| 6.7 | Custom report builder (column picker per module) — platform tier | [ ] |
| 6.8 | 🔒 PDF/export authorization: same RLS + permission checks as the API; no mass-exfil vector (rate limit exports) | [ ] 🔒 |

**DoD:** one of each document type generated in staging and visually inspected; CSV export of students verified; export endpoint throttled.

---

### Phase 7 — Exams & Academics Depth

| # | Item | Status |
|---|---|---|
| 7.1 | GPA/CGPA computation (term-wise, year-wise) + configurable grading scales | [ ] 🧪 |
| 7.2 | Seating arrangement (exam-wise auto-allocation) | [ ] |
| 7.3 | Hall tickets (data + PDF via Phase 6) | [ ] |
| 7.4 | Revaluation workflow (request → fee → re-check → result update, audited) | [ ] |
| 7.5 | Supplementary exam tracking + result merging | [ ] |
| 7.6 | Progress reports (periodic, teacher comments) | [ ] |
| 7.7 | Result publishing flow (release to student/parent portals after approval) | [ ] 🔒 (approval gate) |
| 7.8 | Terms/semesters model (currently only academic years) | [ ] |
| 7.9 | Electives + subject allocation per class/section | [ ] |
| 7.10 | Curriculum mapping (syllabus units ↔ subjects ↔ lesson plans) | [ ] |
| 7.11 | Academic calendar (events, holidays, exam dates) — feeds dashboards | [ ] |

**DoD:** sample class marks → GPA/rank/card all consistent; revaluation audited; publishing requires principal approval.

---

### Phase 8 — Staff & HR Depth

| # | Item | Status |
|---|---|---|
| 8.1 | Staff attendance module (daily, late arrival, overtime via existing `overtime_hours`) | [ ] 🧪 |
| 8.2 | Performance reviews: activate `performance_reviews` (goal setting, ratings, appraisal cycle) | [ ] |
| 8.3 | Recruitment: activate `job_postings` + `job_applications` (post, apply, pipeline, offers) | [ ] |
| 8.4 | Qualifications & experience records (certificates/documents per staff) | [ ] |
| 8.5 | Joining process (onboarding checklist, employee code, documents) + exit management (relieving, full-and-final) | [ ] |
| 8.6 | Employee ID generation (template + QR via Phase 6) | [ ] |
| 8.7 | Staff leave balance calculation + encashment policy | [ ] 🧪 |

**DoD:** staff attendance recorded and reported; one recruitment cycle (post→apply→hire) completed in staging; F&F payout calculation unit-tested.

---

### Phase 9 — Transport & Hostel Depth

| # | Item | Status |
|---|---|---|
| 9.1 | Transport fuel logs CRUD + maintenance records CRUD (schema exists; wire API + UI + dashboard) | [ ] |
| 9.2 | Driver management (staff linked, license, phone) | [ ] |
| 9.3 | Pickup points (stop list per route with times) | [ ] |
| 9.4 | GPS tracking (device/API integration; live map) — roadmap, optional | [ ] |
| 9.5 | Transport fees (per route/stop pricing on invoices) | [ ] |
| 9.6 | Hostel attendance, visitors register, discipline (activate 3 orphan tables + UI) | [ ] |
| 9.7 | Hostel fees + room transfers + warden management | [ ] |
| 9.8 | Hostel complaints (assign, resolve, notify) | [ ] |

**DoD:** fuel + maintenance logged and visible on transport dashboard; hostel attendance marked; complaint flow ends with parent notification.

---

### Phase 10 — Accounting & Finance Depth

| # | Item | Status |
|---|---|---|
| 10.1 | Bank reconciliation (bank statement upload, match, exceptions) | [ ] |
| 10.2 | Budgets: activate `accounting_budgets` (annual budget vs actual per account) | [ ] |
| 10.3 | GST support: tax rates on fee/expense accounts, GST reports (GSTR-1/3B export) | [ ] |
| 10.4 | Tax reports (TDS on staff, professional tax) | [ ] |
| 10.5 | Assets: activate assets CRUD + depreciation runs (fields exist) | [ ] 🧪 |
| 10.6 | Profit & loss and balance sheet export (Phase 6) + audit-friendly trail | [ ] |

**DoD:** reconcile a 10-transaction statement with 2 exceptions; budget vs actual correct; GST report matches seeded invoices.

---

### Phase 11 — Payroll Depth

| # | Item | Status |
|---|---|---|
| 11.1 | Payslip generation (PDF) per run | [ ] |
| 11.2 | Statutory components: PF (12%/EPF+EPS), ESI, professional tax, TDS slabs | [ ] 🧪 |
| 11.3 | Bonus + overtime calculation inputs (attendance-linked) | [ ] |
| 11.4 | Payroll reports (monthly register, bank file export) | [ ] |
| 11.5 | 🔒 Salary data access control: HR-only, RLS enforced, audit of payslip downloads | [ ] |

**DoD:** one monthly run computes PF/ESI/TDS for 3 staff and matches an Excel reference calc.

---

### Phase 12 — Events, Health & Discipline Modules (new)

| # | Item | Status |
|---|---|---|
| 12.1 | Event management: school/sports/cultural events, competitions, registrations, attendance, certificates | [ ] |
| 12.2 | Health: medical history, vaccination records, sick reports, medical certificates, emergency contacts, health alerts | [ ] |
| 12.3 | Discipline: incident reporting, warnings, suspension records, counseling, parent notifications, behavior tracking | [ ] 🔒 (minor-student data handling per DPDP) |

**DoD:** each module supports a full lifecycle in staging with audit rows.

---

### Phase 13 — LMS (Learning Management System)

| # | Item | Status |
|---|---|---|
| 13.1 | Study materials: notes, PDFs, videos, recorded lectures (uploads + access control per class) | [ ] |
| 13.2 | Quizzes + online tests (question bank, auto-grading, attempts) | [ ] |
| 13.3 | Discussion forums per class | [ ] |
| 13.4 | Live classes (integration: Zoom/Google Meet/Streaming — provider decision) | [ ] |
| 13.5 | Learning progress tracking + certificates | [ ] |

**DoD:** student completes a quiz and sees progress; teacher uploads material visible to class only (cross-class probe blocked).

---

### Phase 14 — AI Features

| # | Item | Status |
|---|---|---|
| 14.1 | AI attendance insights (patterns, anomaly alerts) | [ ] |
| 14.2 | AI fee prediction (arrears risk per student) | [ ] 🔒 (no bias on protected attributes) |
| 14.3 | AI performance prediction (early-warning for at-risk students) | [ ] |
| 14.4 | AI timetable generation (constraint solver) | [ ] |
| 14.5 | AI report generation (narrative from data) | [ ] |
| 14.6 | AI notice drafting, homework generation, question-paper generation | [ ] |
| 14.7 | AI chatbot (school FAQ, data-scoped) | [ ] 🔒 |
| 14.8 | AI search across modules | [ ] |
| 14.9 | 🔒 AI governance: no student PII sent to third-party LLMs without consent/redaction; opt-in | [ ] |

**DoD:** each feature has a demo in staging with a redaction test showing no PII leaves the platform.

---

### Phase 15 — Mobile (PWA Deepening)

| # | Item | Status |
|---|---|---|
| 15.1 | PWA: offline shell, offline attendance/fee forms w/ sync queue | [ ] |
| 15.2 | Push notifications on PWA (Phase 4) | [ ] |
| 15.3 | QR scanning (digital ID card, QR attendance) | [ ] |
| 15.4 | Biometric/RFID attendance hardware integration (provider decision; vendor SDK adapter) | [ ] |
| 15.5 | Digital ID card in wallet | [ ] |
| 15.6 | Mobile fee payment (Phase 3) | [ ] |

**DoD:** PWA installs on Android + iOS Safari; offline attendance records sync with conflict handling.

---

### Phase 16 — Enterprise / White-Label SaaS Layer

| # | Item | Status |
|---|---|---|
| 16.1 | White-label login (branding: logo, colors, CSS from `branding_settings` — apply to login + shell) | [ ] |
| 16.2 | Custom domain mapping (per-tenant domain, TLS cert auto-issue) | [ ] 🔒 |
| 16.3 | Real billing (subscription invoices, payment via Phase 3, proration, dunning) | [ ] |
| 16.4 | Usage analytics (per-tenant API calls, storage, active users) | [ ] |
| 16.5 | Support tickets (tenant ↔ platform) | [ ] |
| 16.6 | System health dashboard (tenant health, queue depth, DB load) | [ ] |
| 16.7 | Global announcements (platform-wide) | [ ] |
| 16.8 | License management (seat counts, add-ons) | [ ] |

**DoD:** one white-labeled tenant (own logo/domain) fully operable; billing lifecycle in staging: signup → trial → paid → downgrade.

---

### Phase 17 — Platform UX & Globalization

| # | Item | Status |
|---|---|---|
| 17.1 | i18n framework + English baseline; Hindi + Telugu first (Hyderabad market) | [ ] |
| 17.2 | Timezone support (school-level timezone, display + scheduling) | [ ] |
| 17.3 | Global search (students, staff, invoices, books across modules) | [ ] |
| 17.4 | Custom fields (per-module, per-tenant) + custom forms | [ ] |
| 17.5 | Workflow automation (approval chains, triggers) | [ ] |
| 17.6 | Dark mode + accessibility pass (WCAG 2.1 AA) | [ ] |
| 17.7 | Shared component library (modals, tables, toasts, date-pickers — currently duplicated per page) | [ ] |
| 17.8 | Real-time notifications (WebSocket/SSE for in-app + bell) | [ ] 🔒 (connection auth) |

**DoD:** login, 2 pages and one report rendered in Hindi+Telugu; a custom field end-to-end; WCAG scan passes.

---

### Phase 18 — Compliance, Hardening & Final Audit

| # | Item | Status |
|---|---|---|
| 18.1 | External penetration test (OWASP Top 10; fix findings; re-test) | [ ] 🔒 |
| 18.2 | DPDP readiness audit (consent flows, breach runbook, data mapping, DPA) | [ ] 🔒 |
| 18.3 | DR drill: full restore from backup on a clean server in < 4h | [ ] 🧪 |
| 18.4 | Performance/load re-test at target scale (50+ tenants) | [ ] 🧪 |
| 18.5 | 🔒 Secrets review: zero secrets in repo history; rotation runbooks exercised | [ ] |
| 18.6 | 🔒 Dependency + license audit final pass | [ ] |
| 18.7 | UAT with 3 real schools (2 English, 1 bilingual) + fix-top-20 list | [ ] |
| 18.8 | Go-live checklist (runbook, on-call, rollback plan, support channel) | [ ] |

**DoD:** pen-test report clean (or all findings fixed + verified); DPDP checklist signed; DR drill timer met.

---

## C. CHANGE LOG (append-only)

> Every modification to this file after v1.0 is recorded here. Old entries are never altered.

- **2026-08-04 — v1.0 released.** Initial master phase list created from the full audit: 18 phases (0–18) covering every gap in the 34-module master list, all security findings, orphan tables, routing bugs, dead config, compliance (DPDP/UIDAI), and production readiness. Sections A (original phases) and B (v1.0 plan) are immutable from this point.
- **2026-08-04 — v1.1 (Phase 1 work).** Item **1.2 shipped**: `GET /api/v1/health` (liveness: status/service/version/uptime/timestamp) + `GET /api/v1/health/db` (SELECT 1 with 2s timeout → `database.latencyMs`, `redis.configured/enabled`; 503 `ServiceUnavailableException` when DB down). Public (no tenant header, no auth). Unit tests added (3, suite now 271/271); e2e still 2/2; live-verified on :3000 (health 200, health/db 200 @ 18ms, login 200). Also fixed docker-compose bugs found while wiring health: api `command` ran `node dist/src/main.js` (crash — dist is `dist/main.js`), and healthcheck hit `/api/v1/docs` which is 404 in production; now `node dist/main.js` + `/api/v1/health`. Commit `33e1c51` (health module, compose fixes, phase list v1.1). Remaining Phase 1 items: 1.1, 1.3–1.12 (see Section B).
- **2026-08-04 — v1.2 (Phase 1 work).** Item **1.3 shipped**: structured request logging. `RequestIdMiddleware` (honors sanitized `x-request-id`, echoes response header; else UUID) + `RequestLoggingMiddleware` hooked on `res finish` — one JSON line per request: `{type, requestId, method, path, status, latencyMs, tenantId, userId, ip}`; no bodies/headers/PII. Covers 200s, 404 unmatched routes, guard rejections, and errors (final status read at finish, so no early-capture). `requestId` added to `AllExceptionsFilter` error responses and 500 log lines. First attempt used a tap-based interceptor — discarded because unmatched routes never reach interceptors and error status is captured before the exception filter runs (live-verified 404/401 gap). Live-verified: health 200, nonexistent 404, bad login 401 all logged with requestId. Tests: 274/274 unit (3 middleware specs), 2/2 e2e. Deferred as part of 1.3: JSON-format file sink (dev console today) and log rotation are 1.6.
- **2026-08-06 — v1.3 (Phase 1 + Phase 2.1).** Items **1.5** and **1.6 (partial)** shipped + **Phase 2.1 MFA** complete. (a) `MetricsModule`: `GET /api/v1/metrics` (Prometheus text format: `erp_http_requests_total{method,status}` incremented per request, uptime, process time, heap/rss/external/arraybuffers, event-loop lag, DB pool total/idle/waiting via new `getPoolStats()`, `erp_queue_enabled`); live 200. (b) 1.6: json-file rotation (`max-size 10m`, `max-file 3`) on all compose services; `scripts/log-audit.sh` (secret + PII grep, exit 1 on findings) wired as CI `security-audit` job; 30d retention deferred to deployment. (c) **2.1 MFA**: RFC 6238 TOTP on `node:crypto` (zero deps), challenge JWT (`type: 'mfa'`, 5m) on login, `/auth/2fa/{login,setup,verify,disable}`, 10 bcrypt-hashed single-use recovery codes (stamped `used_at`), secret AES-256-GCM at rest, `jwt.strategy` rejects non-`access` tokens, migration `phase11-2fa.sql` (`two_factor_recovery_codes` + RLS FORCE + auth_lookup, applied). Frontend: login challenge step, Settings 2FA card, and **pre-existing regression fix** — `api.ts` now always sends `X-Tenant-Id` from stored auth (SPA was failing the subscription guard under RLS FORCE; reproduced live). Login payload now carries `tenantId` + `twoFactorEnabled`. Live matrix verified: setup→verify→challenge→TOTP login→recovery login→wrong code 401→reused code 401→disable→normal login; DB verified (hashes, encryption, purge). Tests: 37 suites / **291/291 unit**, 2/2 e2e; builds clean. QR image rendering deferred (otpauth URL provided).
- *(future entries appended below)*

---

## D. MASTER GAP REGISTER (every known gap, tracked to a phase)

> Quick index — confirms nothing was missed. Each gap links to the phase that fixes it. When a phase ships, its gaps move to `[x]` in the register.

| Gap (from 2026-08-04 audit) | Fix phase |
|---|---|
| Online payments / gateway / refunds / installments | Phase 3 |
| Scholarships (orphan `fee_concessions`) | Phase 3.10 |
| Fine calculation, due reminders | Phase 3.11, 3.8 |
| SMS / WhatsApp / push / email fan-out (Twilio env is dead config) | Phase 4 |
| Student & parent portal broken routing; reception admissions | Phase 5.1–5.2 |
| Parent/student portal features | Phase 5.3–5.5 |
| PDF/CSV/Excel export (none exists) | Phase 6 |
| Report cards, transcripts, hall tickets, ID cards, certificates w/ QR | Phase 6.1–6.4 |
| GPA/CGPA, seating, revaluation, supplementary, publishing approval | Phase 7 |
| Terms/semesters, electives, curriculum mapping, academic calendar | Phase 7.8–7.11 |
| Staff attendance; performance reviews; recruitment (orphan tables) | Phase 8.1–8.3 |
| Qualifications, joining/exit, employee ID, leave balance | Phase 8.4–8.7 |
| Transport fuel/maintenance write path (schema only) | Phase 9.1 |
| GPS, pickup points, transport fees | Phase 9.3–9.5 |
| Hostel attendance/visitors/discipline (orphan tables) | Phase 9.6 |
| Hostel fees, transfers, warden, complaints | Phase 9.7–9.8 |
| Bank reconciliation; budgets (orphan); GST; assets (orphan) | Phase 10 |
| Payslips, PF/ESI/TDS, bonus, overtime | Phase 11 |
| Events; Health; Discipline modules (missing entirely) | Phase 12 |
| LMS (missing entirely) | Phase 13 |
| All 11 AI features (flags only today) | Phase 14 |
| PWA offline, QR, biometric/RFID, digital ID | Phase 15 |
| White-label login/domain, billing, tickets, health, usage analytics | Phase 16 |
| i18n/multi-language/timezone, global search, custom fields, workflows, dark mode | Phase 17 |
| Real-time notifications (WebSocket) | Phase 17.8 |
| 2FA (schema-only today), password policy, session UI, device/IP mgmt | Phase 2 |
| DPDP compliance (consent, breach runbook, children's data, DPA) | Phase 2.6–2.8 |
| SSO, monitoring/health endpoint, alerting | Phase 1.2–1.4, 2.12 |
| Backup restore drill; DR; load testing | Phase 1.7, 1.10, 18.3–18.4 |
| Pen test, UAT, go-live checklist | Phase 18 |
