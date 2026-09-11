import {
  base32Decode,
  base32Encode,
  generateTotpSecret,
  otpauthUrl,
  totpToken,
  verifyTotp,
} from './totp.util';

// RFC 6238 test vectors: ASCII secret "12345678901234567890"
// (20 bytes) base32-encodes to GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ.
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('totp.util', () => {
  describe('base32', () => {
    it('round-trips bytes', () => {
      const buf = Buffer.from('hello world');
      expect(base32Decode(base32Encode(buf)).toString()).toBe('hello world');
    });

    it('encodes the RFC 6238 secret correctly', () => {
      expect(base32Encode(Buffer.from('12345678901234567890'))).toBe(
        RFC_SECRET,
      );
    });
  });

  describe('totpToken (RFC 6238 vectors, SHA-1, 8-digit reference)', () => {
    // RFC 6238 lists 8-digit codes; our implementation emits 6 digits,
    // which are the last 6 of the 8-digit reference.
    const vectors: Array<[number, string, string]> = [
      [59, '94287082', '287082'],
      [1111111109, '07081804', '081804'],
      [1111111111, '14050471', '050471'],
      [1234567890, '89005924', '005924'],
      [2000000000, '69279037', '279037'],
      [20000000000, '65353130', '353130'],
    ];

    it.each(vectors)('T=%d → 6-digit %s', (t, _ref8, expected) => {
      expect(totpToken(RFC_SECRET, t)).toBe(expected);
    });
  });

  describe('verifyTotp', () => {
    const now = Math.floor(Date.now() / 1000);

    it('accepts the current code', () => {
      expect(
        verifyTotp(RFC_SECRET, totpToken(RFC_SECRET), { timeSeconds: now }),
      ).toBe(true);
    });

    it('accepts codes within the ±1 window', () => {
      expect(
        verifyTotp(RFC_SECRET, totpToken(RFC_SECRET, now - 30), {
          timeSeconds: now,
        }),
      ).toBe(true);
      expect(
        verifyTotp(RFC_SECRET, totpToken(RFC_SECRET, now + 30), {
          timeSeconds: now,
        }),
      ).toBe(true);
    });

    it('rejects a wrong code', () => {
      expect(verifyTotp(RFC_SECRET, '000000', { timeSeconds: now })).toBe(
        false,
      );
    });

    it('rejects malformed input', () => {
      expect(verifyTotp(RFC_SECRET, 'abcdef', { timeSeconds: now })).toBe(
        false,
      );
      expect(verifyTotp(RFC_SECRET, '12345', { timeSeconds: now })).toBe(false);
    });
  });

  describe('generateTotpSecret', () => {
    it('produces a 32-char base32 secret (160 bits)', () => {
      const secret = generateTotpSecret();
      expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    });

    it('produces unique secrets', () => {
      expect(generateTotpSecret()).not.toBe(generateTotpSecret());
    });
  });

  describe('otpauthUrl', () => {
    it('builds a valid otpauth URL', () => {
      const url = otpauthUrl('ERP Platform', 'admin@erp.com', RFC_SECRET);
      expect(url).toBe(
        `otpauth://totp/ERP%20Platform:admin%40erp.com?secret=${RFC_SECRET}&issuer=ERP%20Platform&algorithm=SHA1&digits=6&period=30`,
      );
    });
  });
});
