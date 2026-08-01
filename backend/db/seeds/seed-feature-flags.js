/**
 * Seed: feature flags + plan feature mappings.
 *
 * Idempotent — safe to run multiple times. Inserts the 17 system feature
 * flags (matching database/001_schema.sql), creates the Basic/Pro/Enterprise
 * plans, and maps which flags each plan enables. The legacy "Standard Plan"
 * (already subscribed by live tenants) gets every flag enabled so existing
 * tenants are unaffected.
 *
 * Run: node db/seeds/seed-feature-flags.js
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '..', '.env');
const env = fs.readFileSync(envPath, 'utf8');
const get = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1];

const pool = new Pool({
  host: get('DB_HOST') || 'localhost',
  port: parseInt(get('DB_PORT') || '5432', 10),
  user: get('DB_USER') || 'postgres',
  password: get('DB_PASSWORD') || '',
  database: get('DB_NAME') || 'erp',
});

const FEATURE_FLAGS = [
  ['multi_branch', 'Multi-Branch Support', 'Allow multiple branches per institution', 'core', false],
  ['reception', 'Reception Module', 'Reception dashboard and visitor management', 'admin', false],
  ['hostel', 'Hostel Management', 'Hostel room, bed and student allocation', 'hostel', false],
  ['transport', 'Transport Management', 'Vehicle, route and student transport', 'transport', false],
  ['library', 'Library Management', 'Book catalogue, issue and return system', 'library', false],
  ['cctv', 'CCTV Integration', 'CCTV camera monitoring integration', 'security', false],
  ['ai_assistant', 'AI Assistant', 'AI-powered assistant for analytics', 'ai', false],
  ['custom_branding', 'Custom Branding', 'Custom institution branding and theme', 'branding', false],
  ['custom_login', 'Custom Login Page', 'Customized login page per institution', 'branding', false],
  ['white_label', 'White Label', 'Remove ERP branding entirely', 'branding', false],
  ['api_access', 'API Access', 'REST API access for third-party integration', 'api', false],
  ['payroll', 'Payroll Management', 'Staff salary and payroll processing', 'hr', true],
  ['assignments', 'Assignments Module', 'Digital assignment submission system', 'academic', true],
  ['lesson_plans', 'Lesson Plans', 'Digital lesson planning for teachers', 'academic', true],
  ['online_exams', 'Online Examinations', 'Conduct online exams on the platform', 'academic', false],
  ['lms', 'LMS Module', 'Learning management system', 'academic', false],
  ['video_conferencing', 'Video Conferencing', 'Integrated video conferencing for classes', 'communication', false],
];

// Which flags each plan enables. Keys must match FEATURE_FLAGS codes.
const PLAN_FLAGS = {
  basic: ['payroll', 'assignments', 'lesson_plans'],
  pro: ['payroll', 'assignments', 'lesson_plans', 'reception', 'custom_branding', 'custom_login'],
  enterprise: FEATURE_FLAGS.map((f) => f[0]),
  // Legacy plan already subscribed by live tenants — keep everything on.
  standard: FEATURE_FLAGS.map((f) => f[0]),
};

const PLANS = [
  {
    code: 'basic',
    name: 'Basic',
    description: 'For small schools and coaching centres',
    priceMonthly: 0,
    priceYearly: 0,
    maxBranches: 1,
    maxUsers: 20,
    maxStudents: 200,
    maxStaff: 20,
    storageLimitMb: 200,
    sortOrder: 1,
  },
  {
    code: 'pro',
    name: 'Pro',
    description: 'For medium-sized institutions',
    priceMonthly: 499,
    priceYearly: 4999,
    maxBranches: 1,
    maxUsers: 100,
    maxStudents: 1000,
    maxStaff: 50,
    storageLimitMb: 1024,
    sortOrder: 2,
  },
  {
    code: 'enterprise',
    name: 'Enterprise',
    description: 'For universities and school groups',
    priceMonthly: 1999,
    priceYearly: 19999,
    maxBranches: 999,
    maxUsers: 9999,
    maxStudents: 50000,
    maxStaff: 5000,
    storageLimitMb: 10240,
    sortOrder: 3,
  },
];

async function seed() {
  try {
    // 1. Feature flags
    let inserted = 0;
    for (const [code, name, description, module, defaultValue] of FEATURE_FLAGS) {
      const r = await pool.query(
        `INSERT INTO feature_flags (code, name, description, module, default_value, is_system)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         ON CONFLICT (code) DO NOTHING RETURNING id`,
        [code, name, description, module, defaultValue],
      );
      if (r.rowCount > 0) inserted++;
    }
    console.log(`feature_flags: ${inserted} inserted, ${FEATURE_FLAGS.length - inserted} already present`);

    // 2. Plans (idempotent on code)
    for (const p of PLANS) {
      await pool.query(
        `INSERT INTO plans (name, code, description, price_monthly, price_yearly, max_branches, max_users, max_students, max_staff, storage_limit_mb, features, is_active, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '{}', TRUE, $11)
         ON CONFLICT (code) DO NOTHING`,
        [p.name, p.code, p.description, p.priceMonthly, p.priceYearly, p.maxBranches, p.maxUsers, p.maxStudents, p.maxStaff, p.storageLimitMb, p.sortOrder],
      );
    }
    console.log('plans: Basic / Pro / Enterprise ensured');

    // 3. Plan feature mappings
    const plans = await pool.query('SELECT id, code FROM plans');
    const flags = await pool.query('SELECT id, code FROM feature_flags');
    const flagIds = new Map(flags.rows.map((r) => [r.code, r.id]));
    const planIds = new Map(plans.rows.map((r) => [r.code, r.id]));

    let mapped = 0;
    for (const [planCode, enabledCodes] of Object.entries(PLAN_FLAGS)) {
      const planId = planIds.get(planCode);
      if (!planId) {
        console.warn(`  skip: plan '${planCode}' not found`);
        continue;
      }
      for (const code of FEATURE_FLAGS.map((f) => f[0])) {
        const isEnabled = enabledCodes.includes(code);
        const r = await pool.query(
          `INSERT INTO plan_features (plan_id, feature_flag_id, is_enabled)
           VALUES ($1, $2, $3)
           ON CONFLICT (plan_id, feature_flag_id) DO UPDATE SET is_enabled = $3
           RETURNING id`,
          [planId, flagIds.get(code), isEnabled],
        );
        if (r.rowCount > 0) mapped++;
      }
    }
    console.log(`plan_features: ${mapped} mappings ensured`);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();
