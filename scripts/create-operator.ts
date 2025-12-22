import { sql } from '@/app/lib/db';

async function createOperator() {
  try {
    // Create test organization
    const org = await sql`
      INSERT INTO app.organizations (firm_name, contact_email, contact_phone, status, subscription_status)
      VALUES ('Test Operator Firm', 'operator@test.com', '(555) 123-4567', 'active', 'active')
      ON CONFLICT DO NOTHING
      RETURNING id
    `;

    const orgId = org.length > 0 ? org[0].id : null;
    if (!orgId) {
      const existing = await sql`SELECT id FROM app.organizations WHERE firm_name = 'Test Operator Firm'`;
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
    const user = await sql`
      INSERT INTO app.users (email, password_hash, name, role, org_id, status)
      VALUES (
        'operator@strattondefense.com',
        '$2a$10$M2kXGpDQqL5q.4YpZnY7e.6QZv5qZpOJQZvN9qZwvN8qZvN9qZvN',
        'Test Operator',
        'operator',
        ${orgId || (await sql`SELECT id FROM app.organizations WHERE firm_name = 'Test Operator Firm' LIMIT 1`)[0].id},
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
    console.log('  Email: operator@strattondefense.com');
    console.log('  Password: operator123');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createOperator();
