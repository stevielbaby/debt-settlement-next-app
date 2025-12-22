require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function inspectSchema() {
  try {
    console.log('🔍 Inspecting database schema...\n');

    // Check organizations table
    console.log('📋 Organizations table:');
    const orgColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'app' AND table_name = 'organizations'
      ORDER BY ordinal_position
    `;
    orgColumns.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));

    // Check subscription_plans table
    console.log('\n📋 Subscription Plans table:');
    const planColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'app' AND table_name = 'subscription_plans'
      ORDER BY ordinal_position
    `;
    if (planColumns.length > 0) {
      planColumns.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));
    } else {
      console.log('  ❌ Table does not exist');
    }

    // Check organization_subscriptions table
    console.log('\n📋 Organization Subscriptions table:');
    const subColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'app' AND table_name = 'organization_subscriptions'
      ORDER BY ordinal_position
    `;
    if (subColumns.length > 0) {
      subColumns.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));
    } else {
      console.log('  ❌ Table does not exist');
    }

    // List all app schema tables
    console.log('\n📋 All tables in app schema:');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'app'
      ORDER BY table_name
    `;
    tables.forEach(t => console.log(`  - ${t.table_name}`));

  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

inspectSchema();
