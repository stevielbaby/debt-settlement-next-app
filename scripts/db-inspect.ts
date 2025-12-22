import path from 'path';
import dotenv from 'dotenv';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL not set');
}

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const publicTables = await pool.query(
      `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;`
    );
    console.log('📑 Public tables:');
    console.table(publicTables.rows);

    const appTables = await pool.query(
      `SELECT tablename FROM pg_tables WHERE schemaname='app' ORDER BY tablename;`
    );
    console.log('📦 App schema tables:');
    console.table(appTables.rows);

    const appColumns = await pool.query(
      `SELECT table_name, column_name, data_type 
       FROM information_schema.columns 
       WHERE table_schema='app' 
       ORDER BY table_name, ordinal_position;`
    );
    console.log('📄 App columns:');
    console.table(appColumns.rows);
  } catch (err) {
    console.error('Error inspecting DB:', err);
  } finally {
    await pool.end();
  }
})();
