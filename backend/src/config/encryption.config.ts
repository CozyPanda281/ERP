import { registerAs } from '@nestjs/config';

const DEV_DEFAULT = 'change-me-in-production-32bytes!';
const DEV_LEGACY = 'default-dev-key-change-in-production';

export default registerAs('encryption', () => {
  const key = process.env.ENCRYPTION_KEY || DEV_DEFAULT;
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && (!key || key === DEV_DEFAULT || key === DEV_LEGACY)) {
    throw new Error(
      'ENCRYPTION_KEY must be set to a strong, random value in production (generate with: openssl rand -hex 48)',
    );
  }
  return { key };
});
