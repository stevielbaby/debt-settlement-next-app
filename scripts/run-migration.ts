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

// Log a sanitized connection descriptor
try {
  const url = new URL(process.env.DATABASE_URL);
  const protocol = url.protocol.replace(':', '');
  const host = url.hostname + (url.port ? `:${url.port}` : '');
  const dbName = url.pathname.replace(/^\//, '');
  console.log(`📡 DB connection: ${protocol}://${host}/${dbName}`);
} catch {
  console.log('📡 DB connection: DATABASE_URL present (unable to parse URL).');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDatabase() {
  try {
    console.log('🚀 Initializing database schema...');
    
    const sqlFile = fs.readFileSync(
      path.join(process.cwd(), 'scripts', 'init-db.sql'),
      'utf-8'
    );

    // Execute the SQL file
    await pool.query(sqlFile);

    console.log('✅ Database schema initialized successfully!');
    console.log('\n📋 Default credentials:');
    console.log('   Email: admin@strattondefense.com');
    console.log('   Password: admin123');
    console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!\n');

    // List public tables after migration
    const { rows } = await pool.query(
      `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;`
    );
    console.log('📑 Public tables:');
    console.table(rows);
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    await pool.end();
    process.exit(1);
  }
}

initDatabase();
