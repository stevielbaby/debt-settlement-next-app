require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function updateEmails() {
  try {
    console.log('🔄 Updating email domains from strattondefense.com to woodslegal.com...\n');
    
    // Update admin email
    await sql`
      UPDATE app.users 
      SET email = 'admin@woodslegal.com'
      WHERE email = 'admin@strattondefense.com'
    `;
    console.log('✅ Updated webmaster email to: admin@woodslegal.com');
    
    // Update operator email
    await sql`
      UPDATE app.users 
      SET email = 'operator@woodslegal.com'
      WHERE email = 'operator@strattondefense.com'
    `;
    console.log('✅ Updated operator email to: operator@woodslegal.com');
    
    // Verify the changes
    const users = await sql`
      SELECT id, email, role, status 
      FROM app.users 
      ORDER BY created_at;
    `;
    
    console.log('\n📋 Current users:');
    users.forEach(user => {
      console.log(`  ${user.role}: ${user.email} (${user.status})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateEmails();
