import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'erp',
  });

  try {
    let password = process.env.SEED_ADMIN_PASSWORD;
    let generated = false;
    if (!password) {
      password = crypto.randomBytes(12).toString('base64url');
      generated = true;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    const now = new Date().toISOString();

    // Check if SuperAdmin already exists
    const existing = await pool.query(
      `SELECT id FROM users WHERE email = $1 AND is_superadmin = TRUE`,
      [process.env.SEED_ADMIN_EMAIL || 'admin@erp.com'],
    );

    if (existing.rows.length > 0) {
      console.log('SuperAdmin user already exists, skipping creation.');
      return;
    }

    // Create SuperAdmin user
    await pool.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, is_superadmin, is_active, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, TRUE, TRUE, 'active', $6, $6)`,
      [
        userId,
        process.env.SEED_ADMIN_EMAIL || 'admin@erp.com',
        passwordHash,
        'Super',
        'Admin',
        now,
      ],
    );

    // Assign super_admin role. Superadmin authorization does NOT depend on
    // this row (RolesGuard short-circuits on users.is_superadmin), but the
    // assignment is still written for role-driven UI/display code.
    const roleResult = await pool.query(
      `SELECT id FROM roles WHERE slug = 'erp-superadmin' LIMIT 1`,
    );
    if (roleResult.rows.length > 0) {
      await pool.query(
        `INSERT INTO user_roles (user_id, role_id, created_at)
         VALUES ($1, $2, $3)`,
        [userId, roleResult.rows[0].id, now],
      );
      console.log('SuperAdmin role assigned.');
    } else {
      console.warn(
        "WARNING: role 'erp-superadmin' does not exist in the roles table — " +
          'user_roles assignment skipped. Superadmin still works via ' +
          'users.is_superadmin, but role-driven UI checks will show no role. ' +
          'Insert a platform-level role (tenant_id NULL) to restore it.',
      );
    }

    const email = process.env.SEED_ADMIN_EMAIL || 'admin@erp.com';
    if (generated) {
      console.log(`SuperAdmin created: ${email}`);
      console.log(`Generated password (save it now): ${password}`);
    } else {
      console.log(
        `SuperAdmin created: ${email} (password from SEED_ADMIN_PASSWORD)`,
      );
    }
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
