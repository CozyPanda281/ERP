import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const TENANT_ID = '4b51a390-259b-409f-ba70-ccfb5460af74';
const BCRYPT_COST = 12;
const NOW = new Date().toISOString();

interface DemoUser {
  email: string;
  firstName: string;
  lastName: string;
  roleSlug: string;
  roleName: string;
  password: string;
  isSuperadmin?: boolean;
}

const DEMO_USERS: DemoUser[] = [
  { email: 'admin@erp.com', firstName: 'Super', lastName: 'Admin', roleSlug: 'erp-superadmin', roleName: 'Super Admin', password: 'Admin@123', isSuperadmin: true },
  { email: 'owner3@school.com', firstName: 'Rajesh', lastName: 'Kumar', roleSlug: 'organization-owner', roleName: 'Organization Owner', password: 'Owner@123' },
  { email: 'ptest3@school.com', firstName: 'Priya', lastName: 'Mehta', roleSlug: 'principal', roleName: 'Principal', password: 'Test@123' },
  { email: 'teacher3@school.com', firstName: 'Neha', lastName: 'Sharma', roleSlug: 'teacher', roleName: 'Teacher', password: 'Test@123' },
  { email: 'student3@school.com', firstName: 'Arjun', lastName: 'Patel', roleSlug: 'student', roleName: 'Student', password: 'Test@123' },
  { email: 'parent3@school.com', firstName: 'Sunita', lastName: 'Patel', roleSlug: 'parent', roleName: 'Parent', password: 'Test@123' },
  { email: 'acc3@school.com', firstName: 'Vikram', lastName: 'Singh', roleSlug: 'accountant', roleName: 'Accountant', password: 'Test@123' },
  { email: 'hr3@school.com', firstName: 'Anjali', lastName: 'Reddy', roleSlug: 'hr', roleName: 'HR', password: 'Test@123' },
  { email: 'reception3@school.com', firstName: 'Kavitha', lastName: 'Nair', roleSlug: 'reception', roleName: 'Reception', password: 'Test@123' },
  { email: 'librarian3@school.com', firstName: 'Ravi', lastName: 'Gupta', roleSlug: 'librarian', roleName: 'Librarian', password: 'Test@123' },
  { email: 'transport3@school.com', firstName: 'Suresh', lastName: 'Yadav', roleSlug: 'transport-manager', roleName: 'Transport Manager', password: 'Test@123' },
  { email: 'hostel3@school.com', firstName: 'Deepa', lastName: 'Iyer', roleSlug: 'hostel-manager', roleName: 'Hostel Manager', password: 'Test@123' },
];

async function seed() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.SEED_DB_USER || 'postgres',
    password: process.env.SEED_DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'erp',
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Create demo tenant
    const existingTenant = await client.query(
      `SELECT id FROM tenants WHERE id = $1`,
      [TENANT_ID]
    );

    if (existingTenant.rows.length === 0) {
      await client.query(
        `INSERT INTO tenants (id, name, slug, email, phone, address, city, state, country, status, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, $11, $11)`,
        [TENANT_ID, 'Demo School', 'demo-school', 'admin@demo.com', '9876543210', '123 Education Lane', 'Mumbai', 'Maharashtra', 'India', 'active', NOW]
      );
      console.log('✓ Demo tenant created');
    } else {
      console.log('✓ Demo tenant already exists');
    }

    // 2. Create platform-level superadmin role if missing
    const superadminRole = await client.query(
      `SELECT id FROM roles WHERE slug = 'erp-superadmin' AND tenant_id IS NULL LIMIT 1`
    );
    let superadminRoleId: string;

    if (superadminRole.rows.length === 0) {
      const roleResult = await client.query(
        `INSERT INTO roles (id, tenant_id, name, slug, description, is_system, created_at, updated_at)
         VALUES (gen_random_uuid(), NULL, 'Super Admin', 'erp-superadmin', 'Platform super administrator', TRUE, $1, $1)
         RETURNING id`,
        [NOW]
      );
      superadminRoleId = roleResult.rows[0].id;
      console.log('✓ Platform superadmin role created');
    } else {
      superadminRoleId = superadminRole.rows[0].id;
      console.log('✓ Platform superadmin role already exists');
    }

    // 3. Create tenant-level roles
    const tenantRoleSlugs = [
      { slug: 'organization-owner', name: 'Organization Owner' },
      { slug: 'principal', name: 'Principal' },
      { slug: 'teacher', name: 'Teacher' },
      { slug: 'student', name: 'Student' },
      { slug: 'parent', name: 'Parent' },
      { slug: 'accountant', name: 'Accountant' },
      { slug: 'hr', name: 'HR' },
      { slug: 'reception', name: 'Reception' },
      { slug: 'librarian', name: 'Librarian' },
      { slug: 'transport-manager', name: 'Transport Manager' },
      { slug: 'hostel-manager', name: 'Hostel Manager' },
    ];

    const roleMap: Record<string, string> = {};

    for (const role of tenantRoleSlugs) {
      const existing = await client.query(
        `SELECT id FROM roles WHERE slug = $1 AND tenant_id = $2`,
        [role.slug, TENANT_ID]
      );

      if (existing.rows.length === 0) {
        const result = await client.query(
          `INSERT INTO roles (id, tenant_id, name, slug, description, is_system, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3::varchar, $3::text, TRUE, $4, $4)
           RETURNING id`,
          [TENANT_ID, role.name, role.slug, NOW]
        );
        roleMap[role.slug] = result.rows[0].id;
      } else {
        roleMap[role.slug] = existing.rows[0].id;
      }
    }
    console.log('✓ Tenant roles ready');

    // 4. Create demo users
    for (const demoUser of DEMO_USERS) {
      const tenantFilter = demoUser.isSuperadmin
        ? `AND tenant_id IS NULL`
        : `AND tenant_id = '${TENANT_ID}'`;

      const existingUser = await client.query(
        `SELECT id FROM users WHERE email = $1 ${tenantFilter}`,
        [demoUser.email]
      );

      if (existingUser.rows.length > 0) {
        const passwordHash = await bcrypt.hash(demoUser.password, BCRYPT_COST);
        await client.query(
          `UPDATE users SET password_hash = $1, is_active = TRUE, status = 'active' WHERE email = $2 ${tenantFilter}`,
          [passwordHash, demoUser.email]
        );
        console.log(`  ↳ ${demoUser.email}: password updated`);
        continue;
      }

      const passwordHash = await bcrypt.hash(demoUser.password, BCRYPT_COST);
      const userId = (await client.query(`SELECT gen_random_uuid() as id`)).rows[0].id;

      if (demoUser.isSuperadmin) {
        await client.query(
          `INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, is_superadmin, is_active, status, created_at, updated_at)
           VALUES ($1, NULL, $2, $3, $4, $5, TRUE, TRUE, 'active', $6, $6)`,
          [userId, demoUser.email, passwordHash, demoUser.firstName, demoUser.lastName, NOW]
        );
      } else {
        await client.query(
          `INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, is_superadmin, is_active, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, FALSE, TRUE, 'active', $7, $7)`,
          [userId, TENANT_ID, demoUser.email, passwordHash, demoUser.firstName, demoUser.lastName, NOW]
        );
      }

      const roleId = demoUser.isSuperadmin ? superadminRoleId : roleMap[demoUser.roleSlug];
      if (roleId) {
        if (demoUser.isSuperadmin) {
          await client.query(
            `INSERT INTO user_roles (id, user_id, role_id, tenant_id, created_at)
             VALUES (gen_random_uuid(), $1, $2, NULL, $3)`,
            [userId, roleId, NOW]
          );
        } else {
          await client.query(
            `INSERT INTO user_roles (id, user_id, role_id, tenant_id, created_at)
             VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
            [userId, roleId, TENANT_ID, NOW]
          );
        }
      }

      console.log(`  ✓ ${demoUser.email} (${demoUser.roleName}) created`);
    }

    // 5. Ensure an active subscription exists (TenantGuard returns 403 otherwise)
    const existingSub = await client.query(
      `SELECT id FROM subscriptions WHERE tenant_id = $1`,
      [TENANT_ID]
    );

    if (existingSub.rows.length === 0) {
      const plan = await client.query(
        `SELECT id FROM plans WHERE code = 'pro' LIMIT 1`
      );
      const planId = plan.rows[0]?.id;

      if (planId) {
        await client.query(
          `INSERT INTO subscriptions (id, tenant_id, plan_id, start_date, end_date, billing_cycle, status, auto_renew, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 'yearly', 'active', TRUE, $3, $3)`,
          [TENANT_ID, planId, NOW]
        );
        console.log('✓ Active subscription created for demo tenant');
      } else {
        console.warn('WARNING: no plan found — subscription not created (403 on tenant routes)');
      }
    } else {
      console.log('✓ Demo tenant already has a subscription');
    }

    await client.query('COMMIT');
    console.log('\n✅ Seed complete! Demo credentials:');
    console.log('   Owner:     owner3@school.com / Owner@123 + tenant 4b51a390-259b-409f-ba70-ccfb5460af74');
    console.log('   Principal: ptest3@school.com / Test@123   + same tenant');
    console.log('   Teacher:   teacher3@school.com / Test@123  + same tenant');
    console.log('   Student:   student3@school.com / Test@123  + same tenant');
    console.log('   Admin:     admin@erp.com / Admin@123      (no tenant)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
