// app/lib/password-utils.ts
import crypto from 'crypto';

/**
 * Hash a password using SHA-256 (simple approach)
 * For production, consider using bcrypt instead
 */
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  const passwordHash = hashPassword(password);
  const a = Buffer.from(passwordHash);
  const b = Buffer.from(hash);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}