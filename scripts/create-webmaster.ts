/**
 * Create a test webmaster user for development
 * Run with: npx ts-node scripts/create-webmaster.ts
 */

import bcrypt from "bcryptjs";
import { sql } from "@/app/lib/db";

async function createWebmasterUser() {
  try {
    console.log("Creating webmaster user...");

    const email = "admin@woodslegal.com";
    const password = "webmaster123";
    const name = "Webmaster Admin";

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Check if user already exists
    const existing = await sql`
      SELECT id FROM app.users WHERE email = ${email} LIMIT 1
    `;

    if (existing.length > 0) {
      console.log(`✓ Webmaster user already exists with ID: ${existing[0].id}`);
      console.log(`  Email: ${email}`);
      console.log(`  Password: ${password}`);
      return;
    }

    // Create webmaster user (no organization)
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
