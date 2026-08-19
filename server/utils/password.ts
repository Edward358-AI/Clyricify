import crypto from 'crypto';

// OWASP-recommended scrypt parameters: N=2^17, r=8, p=1 (~128 MB, ~100 ms).
// Node's default maxmem (32 MB) is below what these parameters need, so it
// must be raised explicitly or scrypt throws at runtime.
const SCRYPT_N = 131072;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const SCRYPT_MAXMEM = 256 * 1024 * 1024;

function scrypt(password: string, salt: Buffer, keylen: number, options: crypto.ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, options, (err, derived) => {
      if (err) reject(err);
      else resolve(derived);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH, {
    N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM,
  });
  return `scrypt:${SCRYPT_N}:${SCRYPT_R}:${SCRYPT_P}:${salt.toString('hex')}:${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    if (stored.startsWith('scrypt:')) {
      const [, n, r, p, saltHex, hashHex] = stored.split(':');
      if (!n || !r || !p || !saltHex || !hashHex) return false;
      const expected = Buffer.from(hashHex, 'hex');
      const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length, {
        N: Number(n), r: Number(r), p: Number(p), maxmem: SCRYPT_MAXMEM,
      });
      return crypto.timingSafeEqual(actual, expected);
    }

    // Legacy PBKDF2 format ("<salt>:<hash>", 1000 iterations of sha512) —
    // kept only so pre-upgrade accounts can log in once and be rehashed.
    const [salt, hashHex] = stored.split(':');
    if (!salt || !hashHex) return false;
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.pbkdf2Sync(password, salt, 1000, expected.length, 'sha512');
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function needsRehash(stored: string): boolean {
  return !stored.startsWith('scrypt:');
}
