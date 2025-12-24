import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';
import path from 'path';

// Configure WebSocket for Node.js environment
neonConfig.webSocketConstructor = ws;

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkTables() {
  try {
    const { rows } = await pool.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('billing_accounts', 'plans', 'subscriptions', 'invoices', 'stripe_events')
      ORDER BY tablename
    `);

    console.log('Current billing tables:', rows.map(r => r.tablename));

    if (rows.length === 5) {
      console.log('✅ All billing tables exist!');
    } else {
      console.log('❌ Missing tables. Need to run migration.');
    }

    await pool.end();
  } catch (error: any) {
    console.error('Error checking tables:', error.message);
    await pool.end();
  }
}

checkTables();
