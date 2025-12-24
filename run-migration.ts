import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure WebSocket for Node.js environment
neonConfig.webSocketConstructor = ws;

// Load environment variables FIRST
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set in .env.local');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runBillingMigration() {
  try {
    console.log('🔄 Running billing-kit database migration...');

    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'packages/billing-kit/src/db/migrations/001-init.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the SQL file
    await pool.query(migrationSQL);

    console.log('✅ Billing migration completed successfully!');

    // Verify tables were created
    console.log('🔍 Verifying billing tables...');
    const { rows } = await pool.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('billing_accounts', 'plans', 'subscriptions', 'invoices', 'stripe_events')
      ORDER BY tablename
    `);

    const tables = rows.map(row => row.tablename);
    console.log('📋 Created billing tables:', tables.join(', '));

    if (tables.length === 5) {
      console.log('🎉 All billing tables created successfully!');
    } else {
      console.log('⚠️  Some tables may be missing:', tables);
    }

    await pool.end();
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

runBillingMigration();
