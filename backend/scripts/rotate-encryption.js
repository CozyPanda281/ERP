/**
 * One-time / operational encryption-key rotation script.
 *
 * Re-encrypts every encrypted column from the currently active key to the
 * key in ENCRYPTION_KEY (or --new-key). Rows already in plaintext get
 * encrypted. Rows decryptable with the current key are re-encrypted.
 *
 * Usage:
 *   node scripts/rotate-encryption.js                    # uses ENCRYPTION_KEY from .env as the new key
 *   node scripts/rotate-encryption.js --new-key <hex>    # explicit new key
 *   node scripts/rotate-encryption.js --from-default     # decrypt rows encrypted with the dev default key
 *
 * The current key defaults to the dev default; pass --current-key to override.
 * Never run against production with a lossy "--from-default" unless you know
 * the rows were written under the dev default key.
 */
'use strict';

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const DEV_DEFAULT = 'change-me-in-production-32bytes!';
const DEV_LEGACY = 'default-dev-key-change-in-production';

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return env;
}

function deriveKey(raw) {
  return crypto.scryptSync(raw, 'erp-salt', 32);
}

function decrypt(key, value) {
  if (!value || typeof value !== 'string') return null;
  const parts = value.split(':');
  if (parts.length !== 3) return null;
  const [ivHex, tagHex, data] = parts;
  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const out = Buffer.concat([
      decipher.update(Buffer.from(data, 'hex')),
      decipher.final(),
    ]);
    return out.toString('utf8');
  } catch {
    return null;
  }
}

function encrypt(key, text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };

  const env = loadEnv();
  const newRaw = flag('new-key') || env.ENCRYPTION_KEY;
  if (!newRaw) {
    console.error('ENCRYPTION_KEY is not set. Refusing to rotate to the dev default.');
    process.exit(1);
  }

  const currentRaw = flag('current-key') || (flag('from-default') ? DEV_DEFAULT : DEV_LEGACY);
  const currentKey = deriveKey(currentRaw);
  const newKey = deriveKey(newRaw);

  const pool = new Pool({
    host: env.DB_HOST || 'localhost',
    port: parseInt(env.DB_PORT || '5432', 10),
    user: env.DB_USER || 'postgres',
    password: env.DB_PASSWORD || 'postgres',
    database: env.DB_NAME || 'erp',
  });

  const targets = [
    { table: 'users', column: 'phone' },
    { table: 'parents', column: 'phone' },
    { table: 'parents', column: 'email' },
  ];

  let total = 0;
  for (const { table, column } of targets) {
    const result = await pool.query(
      `SELECT id, ${column} AS value FROM ${table} WHERE ${column} IS NOT NULL AND ${column} <> ''`,
    );
    let reencrypted = 0;
    let plaintext = 0;
    for (const row of result.rows) {
      let plain = decrypt(currentKey, row.value);
      let wasEncrypted = plain !== null;
      if (plain === null) {
        plain = row.value;
      }
      const newCipher = encrypt(newKey, plain);
      await pool.query(`UPDATE ${table} SET ${column} = $1 WHERE id = $2`, [
        newCipher,
        row.id,
      ]);
      if (wasEncrypted) reencrypted++;
      else plaintext++;
      total++;
    }
    console.log(
      `${table}.${column}: ${reencrypted} re-encrypted, ${plaintext} plaintext->encrypted (total ${total})`,
    );
  }

  await pool.end();
  console.log(`Done. ${total} values encrypted with the new key.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
