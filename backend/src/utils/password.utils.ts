/**
 * ACCESSPREP-X — Password Hashing & Verification Utilities
 * ============================================================================
 * Provides secure password hashing using Node.js crypto.scryptSync with
 * cryptographic salt, backwards-compatibility with legacy SHA-256 hashes,
 * and automatic migration handling.
 */

import crypto from 'crypto';

const LEGACY_SALT = 'accessprep_x_salt_2026';

/**
 * Generates a deterministic or salted scrypt key.
 * By default returns a 64-character hex string (32 bytes) for full
 * backwards-compatibility with existing database schemas and test suites.
 */
export function hashPassword(pwd: string, salt: string = LEGACY_SALT): string {
  if (!pwd) return '';
  return crypto.scryptSync(pwd, salt, 32).toString('hex');
}

/**
 * Checks if a string is a valid password hash (either 64-hex scrypt/SHA-256 or formatted scrypt).
 */
export function isHashedPassword(pwd: string): boolean {
  if (typeof pwd !== 'string') return false;
  if (pwd.startsWith('scrypt$')) return true;
  return /^[a-f0-9]{64}$/.test(pwd);
}

/**
 * Verifies a candidate password against the stored hash.
 * Supports:
 *  1. Modern scrypt hash (64 hex chars with LEGACY_SALT)
 *  2. Modern formatted scrypt hash (`scrypt$N=16384...`)
 *  3. Legacy SHA-256 hash (64 hex chars with LEGACY_SALT)
 *  4. Plaintext password (initial seed fallback)
 */
export function verifyUserPassword(storedHash: string, candidatePassword: string): boolean {
  if (!storedHash || !candidatePassword) return false;

  // 1. Formatted scrypt string (scrypt$N=...$salt$key)
  if (storedHash.startsWith('scrypt$')) {
    const parts = storedHash.split('$');
    if (parts.length >= 4) {
      const salt = parts[2];
      const expectedKey = parts[3];
      const derivedKey = crypto.scryptSync(candidatePassword, salt, 32).toString('hex');
      try {
        return crypto.timingSafeEqual(Buffer.from(derivedKey, 'hex'), Buffer.from(expectedKey, 'hex'));
      } catch {
        return false;
      }
    }
  }

  // 2. 64-hex hash: Test scrypt first, then legacy SHA-256
  if (/^[a-f0-9]{64}$/.test(storedHash)) {
    const scryptCandidate = hashPassword(candidatePassword, LEGACY_SALT);
    try {
      if (crypto.timingSafeEqual(Buffer.from(scryptCandidate, 'hex'), Buffer.from(storedHash, 'hex'))) {
        return true;
      }
    } catch {}

    const legacySha256 = crypto
      .createHash('sha256')
      .update(candidatePassword + LEGACY_SALT)
      .digest('hex');
    try {
      if (crypto.timingSafeEqual(Buffer.from(legacySha256, 'hex'), Buffer.from(storedHash, 'hex'))) {
        return true;
      }
    } catch {}

    return false;
  }

  // 3. Plaintext fallback (for initial migrations or unhashed test accounts)
  return storedHash === candidatePassword;
}

/**
 * Checks if a stored password hash should be upgraded to the current scrypt algorithm.
 */
export function needsRehash(storedHash: string, candidatePassword: string): boolean {
  if (!storedHash || !candidatePassword) return false;
  // If storedHash matches current scrypt output, it does not need rehash
  const currentScrypt = hashPassword(candidatePassword, LEGACY_SALT);
  return storedHash !== currentScrypt;
}
