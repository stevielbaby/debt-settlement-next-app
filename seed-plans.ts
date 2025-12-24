import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';
import path from 'path';

// Configure WebSocket for Node.js environment
neonConfig.webSocketConstructor = ws;

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seedPlans() {
  try {
    console.log('🌱 Seeding test plans...');

    // Check if plans already exist
    const existingPlans = await pool.query(`
      SELECT key, name FROM plans ORDER BY key
    `);

    if (existingPlans.rows.length > 0) {
      console.log('📋 Existing plans:');
      existingPlans.rows.forEach(plan => {
        console.log(`  - ${plan.key}: ${plan.name}`);
      });
      console.log('✅ Plans already seeded!');
      await pool.end();
      return;
    }

    // Insert test plans (using the existing operator plan data as reference)
    await pool.query(`
      INSERT INTO plans (key, name, stripe_product_id, stripe_price_id, interval, unit_amount, is_active)
      VALUES
        ('starter_monthly', 'Starter Plan', 'prod_test_starter', 'price_1ShG2vAUkFju08p48WvG1YuE', 'month', 999, true),
        ('pro_monthly', 'Pro Plan', 'prod_test_pro', 'price_1ShOFBAUkFju08p4q9DGg8f3', 'month', 2999, true)
      ON CONFLICT (key) DO UPDATE SET
        name = EXCLUDED.name,
        stripe_price_id = EXCLUDED.stripe_price_id,
        unit_amount = EXCLUDED.unit_amount,
        is_active = EXCLUDED.is_active
    `);

    console.log('✅ Test plans seeded successfully!');

    // Verify plans were created
    const { rows } = await pool.query(`
      SELECT key, name, unit_amount FROM plans ORDER BY unit_amount
    `);

    console.log('📋 Created plans:');
    rows.forEach(plan => {
      console.log(`  - ${plan.key}: ${plan.name} ($${plan.unit_amount / 100}/month)`);
    });

    await pool.end();
  } catch (error: any) {
    console.error('❌ Error seeding plans:', error.message);
    await pool.end();
  }
}

seedPlans();
