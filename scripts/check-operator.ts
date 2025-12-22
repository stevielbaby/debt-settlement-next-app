import { sql } from '@/app/lib/db';

async function checkOperator() {
  try {
    console.log('Checking for operator user...');
    const result = await sql`
      SELECT id, email, password_hash, name, role, org_id, status 
      FROM app.users 
      WHERE email = 'operator@strattondefense.com'
      LIMIT 1
    `;

    if (result.length === 0) {
      console.log('❌ Operator user NOT found in database');
      console.log('Need to run the setup endpoint first');
      console.log('Try: curl -X POST http://localhost:3000/api/setup/create-operator');
      return;
    }

    const user = result[0];
    console.log('✅ Operator user found:');
    console.log('  Email:', user.email);
    console.log('  Role:', user.role);
    console.log('  Status:', user.status);
    console.log('  Org ID:', user.org_id);
    console.log('  Name:', user.name);
    console.log('  Password Hash:', user.password_hash);

    // Test bcrypt
    const bcrypt = require('bcryptjs');
    const isValid = await bcrypt.compare('operator123', user.password_hash);
    console.log('  Password Match:', isValid ? '✅ VALID' : '❌ INVALID');

  } catch (error) {
    console.error('Error:', error);
  }
}

checkOperator();
