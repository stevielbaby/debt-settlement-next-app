require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...\n');
    
    const users = await sql`
      SELECT id, email, role, status, created_at, password_hash
      FROM app.users 
      ORDER BY created_at;
    `;
    
    console.log(`Found ${users.length} users:\n`);
    
    users.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`Status: ${user.status}`);
      console.log(`Password hash starts with: ${user.password_hash.substring(0, 20)}...`);
      console.log(`Created: ${user.created_at}`);
      console.log('---\n');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUsers();
