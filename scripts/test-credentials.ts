import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL || '');

async function testAuth() {
  try {
    console.log('Testing operator credentials...\n');
    
    // Get the user from database
    const result = await sql`
      SELECT id, email, password_hash, name, role, org_id, status
      FROM app.users
      WHERE email = 'operator@strattondefense.com'
      AND status = 'active'
      LIMIT 1
    `;
    
    const user = result[0];
    
    if (!user) {
      console.log('❌ User not found in database');
      return;
    }
    
    console.log('✅ User found:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Password Hash: ${user.password_hash}`);
    
    // Test password match
    const testPassword = 'operator123';
    const isValid = await bcrypt.compare(testPassword, user.password_hash);
    
    console.log(`\n✅ Password "${testPassword}" verification: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    
    if (!isValid) {
      console.log('\n⚠️  Password verification failed');
      console.log('Expected password: operator123');
      const correctHash = await bcrypt.hash('operator123', 10);
      console.log(`Correct hash would be: ${correctHash}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAuth();
