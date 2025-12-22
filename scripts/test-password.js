require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');

const sql = neon(process.env.DATABASE_URL);

async function testPassword() {
  try {
    const testPasswords = {
      'admin@woodslegal.com': ['admin123', 'webmaster123', 'Admin@123'],
      'operator@woodslegal.com': ['operator123', 'Operator@123']
    };
    
    console.log('🔐 Testing passwords...\n');
    
    for (const [email, passwords] of Object.entries(testPasswords)) {
      const users = await sql`
        SELECT id, email, password_hash, role
        FROM app.users 
        WHERE email = ${email}
      `;
      
      if (users.length === 0) {
        console.log(`❌ User ${email} not found\n`);
        continue;
      }
      
      const user = users[0];
      console.log(`Testing ${email} (${user.role}):`);
      
      for (const password of passwords) {
        const matches = await bcrypt.compare(password, user.password_hash);
        console.log(`  ${password}: ${matches ? '✅ CORRECT' : '❌ wrong'}`);
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testPassword();
