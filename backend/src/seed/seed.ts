import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'erp',
  });

  try {
    const passwordHash = await bcrypt.hash('Admin@123', 10);
    const userId = uuidv4();
    const now = new Date().toISOString();

    // Check if SuperAdmin already exists
    const existing = await pool.query(
      `SELECT id FROM users WHERE email = $1 AND is_superadmin = TRUE`,
      ['admin@erp.com'],
    );

    if (existing.rows.length > 0) {
      console.log('SuperAdmin user already exists, skipping creation.');
      return;
    }

    // Create SuperAdmin user
    await pool.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, is_superadmin, is_active, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, TRUE, TRUE, 'active', $6, $6)`,
      [userId, 'admin@erp.com', passwordHash, 'Super', 'Admin', now],
    );

    // Assign super_admin role
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
    }

    console.log('SuperAdmin user created: admin@erp.com / Admin@123');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
