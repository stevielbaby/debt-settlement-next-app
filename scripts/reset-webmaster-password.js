require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');

const sql = neon(process.env.DATABASE_URL);

async function resetWebmasterPassword() {
  try {
    console.log('🔄 Resetting webmaster password...\n');
    
    const newPassword = 'webmaster123';
    const hash = await bcrypt.hash(newPassword, 10);
    
    await sql`
      UPDATE app.users 
      SET password_hash = ${hash}
      WHERE email = 'admin@strattondefense.com'
    `;
    
    console.log('✅ Password reset successful!');
    console.log('\nNew credentials:');
    console.log('Email: admin@strattondefense.com');
    console.log('Password: webmaster123');
    
    // Verify it works
    const users = await sql`
      SELECT id, email, password_hash 
      FROM app.users 
      WHERE email = 'admin@strattondefense.com'
    `;
    
    if (users.length > 0) {
      const matches = await bcrypt.compare(newPassword, users[0].password_hash);
      console.log(`\nVerification: ${matches ? '✅ Password works!' : '❌ Something went wrong'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

resetWebmasterPassword();
