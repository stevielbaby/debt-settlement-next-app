// scripts/create-user.ts (or add to an admin API route)
import { sql } from '@/app/lib/db';
import { hashPassword } from '@/app/lib/password-utils';

async function createUser(
  username: string,
  email: string,
  password: string,
  role: 'webmaster' | 'operator',
  fullName?: string,
  createdBy?: number
) {
  const passwordHash = hashPassword(password);
  
  const result = await sql`
    INSERT INTO users (username, email, password_hash, role, full_name, created_by)
    VALUES (${username}, ${email}, ${passwordHash}, ${role}, ${fullName || null}, ${createdBy || null})
    RETURNING id, username, email, role, created_at
  `;
  
  return result[0];
}

// Example usage:
// createUser('operator1', 'op1@example.com', 'secure-password', 'operator', 'John Doe', 1);