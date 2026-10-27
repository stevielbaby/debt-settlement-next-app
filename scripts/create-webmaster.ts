/**
 * Create a test webmaster user for development
 * Run with: npx tsx scripts/create-webmaster.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { sql } from "@/app/lib/db";
import { hashPassword, setUserPassword } from "@/app/lib/password-utils";

async function createWebmasterUser() {
  try {
    console.log("Creating webmaster user...");

    const email = "admin@woodslegal.com";
    const password = "webmaster123";
    const name = "Webmaster Admin";

    // Hash password
    const passwordHash = await hashPassword(password);

    const existing = await sql`
      SELECT id FROM app.users WHERE lower(email) = lower(${email}) LIMIT 1
    `;

    if (existing.length > 0) {
      await setUserPassword(email, password);
      console.log(`✓ Webmaster password reset for ${email}`);
      return;
    }

    const result = await sql`
      INSERT INTO app.users (email, password_hash, name, role, status, created_at, updated_at)
      VALUES (
        ${email},
        ${passwordHash},
        ${name},
        'webmaster',
        'active',
        NOW(),
        NOW()
      )
      RETURNING id, email, role, created_at
    `;

    const user = result[0];
    console.log("✓ Webmaster user created successfully!");
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Created: ${user.created_at}`);
    console.log(`\nLogin Credentials:`);
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
  } catch (error) {
    console.error("Error creating webmaster user:", error);
    process.exit(1);
  }
}

createWebmasterUser();
