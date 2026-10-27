import { sql } from '@/app/lib/db';
import { hashPassword } from '@/app/lib/password-utils';

async function testConnection() {
  try {
    console.log('Testing Neon database connection...\n');
    
    // Test basic connection
    const test = await sql`SELECT 1 as connected`;
    console.log('✓ Database connection successful\n');

    // Check if operator user exists
    const users = await sql`
      SELECT id, email, name, role, org_id, status
      FROM app.users
      WHERE email = 'operator@strattondefense.com'
    `;

    if (users.length === 0) {
      console.log('⚠ Operator user NOT found in database');
      console.log('Creating operator user...\n');

      // Create org first
      const org = await sql`
        INSERT INTO app.organizations (firm_name, contact_email, contact_phone, status, subscription_status)
        VALUES ('Test Operator Firm', 'operator@test.com', '(555) 123-4567', 'active', 'active')
        ON CONFLICT DO NOTHING
        RETURNING id
      `;

      let orgId = org.length > 0 ? org[0].id : null;

      if (!orgId) {
        const existing = await sql`
          SELECT id FROM app.organizations WHERE firm_name = 'Test Operator Firm' LIMIT 1
        `;
        orgId = existing[0]?.id;
      }

      const passwordHash = await hashPassword('operator123');
      const user = await sql`
        INSERT INTO app.users (email, password_hash, name, role, org_id, status, created_at, updated_at)
        VALUES (
          'operator@strattondefense.com',
          ${passwordHash},
          'Test Operator',
          'operator',
          ${orgId},
          'active',
          NOW(),
          NOW()
        )
        RETURNING id, email, name, role, org_id
      `;

      console.log('✓ Operator user created:');
      console.log(`  Email: ${user[0].email}`);
      console.log(`  Role: ${user[0].role}`);
      console.log(`  Organization: ${user[0].org_id}`);
    } else {
      console.log('✓ Operator user found in database:');
      console.log(`  Email: ${users[0].email}`);
      console.log(`  Name: ${users[0].name}`);
      console.log(`  Role: ${users[0].role}`);
      console.log(`  Organization ID: ${users[0].org_id}`);
      console.log(`  Status: ${users[0].status}`);
    }

    console.log('\n✅ Database connection & authentication ready!');
    console.log('\nCredentials:');
    console.log('  Email: operator@strattondefense.com');
    console.log('  Password: operator123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testConnection();
