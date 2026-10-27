import bcrypt from "bcryptjs";
import { sql } from "@/app/lib/db";

const BCRYPT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  if (!passwordHash?.startsWith("$2")) return false;
  return bcrypt.compare(password, passwordHash);
}

export async function setUserPassword(email: string, password: string) {
  const passwordHash = await hashPassword(password);
  const rows = await sql`
    UPDATE app.users
    SET password_hash = ${passwordHash}, updated_at = NOW()
    WHERE lower(email) = lower(${email})
    RETURNING id, email, role
  `;

  const user = rows[0];
  if (!user) {
    throw new Error(`No user found for ${email}`);
  }
  return user;
}
