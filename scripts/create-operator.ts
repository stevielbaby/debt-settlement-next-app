import { sql } from '@/app/lib/db';
import bcrypt from 'bcryptjs';

async function createOperator() {
  try {
    // Create test organization
    const org = await sql`
      INSERT INTO app.organizations (firm_name, contact_email, contact_phone, status, subscription_status)
      VALUES ('Woods Legal Services', 'contact@woodslegal.com', '(555) 123-4567', 'active', 'active')
      ON CONFLICT DO NOTHING
      RETURNING id
    `;

    const orgId = org.length > 0 ? org[0].id : null;
    if (!orgId) {
      const existing = await sql`SELECT id FROM app.organizations WHERE firm_name = 'Woods Legal Services'`;
      if (existing.length > 0) {
        console.log('Organization already exists:', existing[0].id);
      } else {
        console.error('Failed to create organization');
        return;
      }
    } else {
      console.log('Created organization:', orgId);
    }

    // Create test operator user
    const email = 'operator@woodslegal.com';
    const password = 'operator123';
    const name = 'Test Operator';

    // Hash password securely
    const passwordHash = await bcrypt.hash(password, 10);

    // Ensure we have an org id to use
    const orgRow = orgId
      ? [{ id: orgId }]
      : await sql`SELECT id FROM app.organizations WHERE firm_name = 'Woods Legal Services' LIMIT 1`;
    const orgIdToUse = orgRow[0]?.id;
    if (!orgIdToUse) {
      console.error('No organization id available for operator user');
      return;
    }

    const user = await sql`
      INSERT INTO app.users (email, password_hash, name, role, org_id, status)
      VALUES (
        ${email},
        ${passwordHash},
        ${name},
        'operator',
        ${orgIdToUse},
        'active'
      )
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email, role
    `;

    if (user.length > 0) {
      console.log('Created operator user:', user[0].email, user[0].role);
    } else {
      console.log('Operator user already exists');
    }

    console.log('\n✅ Setup complete!');
    console.log('Sign in with:');
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createOperator();
