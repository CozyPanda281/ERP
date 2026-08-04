import { registerAs } from '@nestjs/config';

const KNOWN_WEAK_SECRETS = [
  'super-secret-change-in-production',
  'refresh-secret-change-in-production',
  'fallback-secret',
  'erp-jwt-secret-change-in-production',
  'erp-refresh-secret-change-in-production',
  'secret',
  'changeme',
];

function assertStrongSecret(name: string, value: string | undefined): string {
  if (!value || value.length < 32 || KNOWN_WEAK_SECRETS.includes(value)) {
    throw new Error(
      `${name} must be set to a strong, random value of at least 32 characters (generate with: openssl rand -hex 32)`,
    );
  }
  return value;
}

export default registerAs('jwt', () => ({
  secret: assertStrongSecret('JWT_SECRET', process.env.JWT_SECRET),
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshSecret: assertStrongSecret(
    'JWT_REFRESH_SECRET',
    process.env.JWT_REFRESH_SECRET,
  ),
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  issuer: process.env.JWT_ISSUER || 'erp-platform',
}));
