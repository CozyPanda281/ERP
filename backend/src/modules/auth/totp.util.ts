import * as crypto from 'crypto';

// Dependency-free TOTP (RFC 6238 / RFC 4226) on node:crypto.
// No external library needed — everything here ships with Node itself.

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of cleaned) {
    const idx = B32.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret(bytes = 20): string {
  return base32Encode(crypto.randomBytes(bytes));
}

export function totpToken(
  secretBase32: string,
  timeSeconds: number = Math.floor(Date.now() / 1000),
  digits = 6,
  period = 30,
): string {
  const counter = Math.floor(timeSeconds / period);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const key = base32Decode(secretBase32);
  const hmac = crypto.createHmac('sha1', key).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return (code % Math.pow(10, digits)).toString().padStart(digits, '0');
}

export function verifyTotp(
  secretBase32: string,
  providedCode: string,
  options: { window?: number; timeSeconds?: number } = {},
): boolean {
  const clean = providedCode.replace(/\s+/g, '');
  if (!/^[0-9]{6}$/.test(clean)) return false;
  const window = options.window ?? 1;
  const timeSeconds = options.timeSeconds ?? Math.floor(Date.now() / 1000);
  for (let w = -window; w <= window; w++) {
    if (totpToken(secretBase32, timeSeconds + w * 30) === clean) return true;
  }
  return false;
}

export function otpauthUrl(
  issuer: string,
  account: string,
  secretBase32: string,
): string {
  const enc = encodeURIComponent;
  return (
    `otpauth://totp/${enc(issuer)}:${enc(account)}` +
    `?secret=${secretBase32}&issuer=${enc(issuer)}` +
    `&algorithm=SHA1&digits=6&period=30`
  );
}