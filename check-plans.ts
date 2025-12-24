import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';
import path from 'path';

// Configure WebSocket for Node.js environment
neonConfig.webSocketConstructor = ws;

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkPlans() {
  try {
    console.log('🔍 Checking actual plans in database...\n');

    // Check app.subscription_plans (operator system)
    const operatorPlans = await pool.query(`
      SELECT id, name, price, stripe_product_id, stripe_price_id
      FROM app.subscription_plans
      WHERE is_active = true
      ORDER BY price ASC
    `);

    console.log('📋 Operator Plans:');
    if (operatorPlans.rows.length === 0) {
      console.log('   ❌ No plans found in app.subscription_plans');
    } else {
      operatorPlans.rows.forEach(plan => {
        console.log(`   ✅ ${plan.name}: $${plan.price}/month`);
        console.log(`      - Product ID: ${plan.stripe_product_id}`);
        console.log(`      - Price ID: ${plan.stripe_price_id}`);
        console.log('');
      });
    }

    // Check billing-kit plans
    const billingPlans = await pool.query(`
      SELECT key, name, stripe_product_id, stripe_price_id, unit_amount
      FROM plans
      WHERE is_active = true
      ORDER BY unit_amount ASC
    `);

    console.log('📋 Billing-Kit Plans:');
    if (billingPlans.rows.length === 0) {
      console.log('   ❌ No plans found in billing-kit plans table');
    } else {
      billingPlans.rows.forEach(plan => {
        console.log(`   ✅ ${plan.name} (${plan.key}): $${plan.unit_amount / 100}`);
        console.log(`      - Product ID: ${plan.stripe_product_id}`);
        console.log(`      - Price ID: ${plan.stripe_price_id}`);
        console.log('');
      });
    }

    // Check environment variables for plan references
    console.log('🔧 Environment Plan References:');
    const envVars = [
      'STRIPE_PRICE_ID_STARTER_MONTHLY',
      'STRIPE_PRICE_ID_PRO_MONTHLY',
      'STRIPE_PRICE_ID_STARTER_YEARLY',
      'STRIPE_PRICE_ID_PRO_YEARLY'
    ];

    envVars.forEach(envVar => {
      const value = process.env[envVar];
      console.log(`   ${envVar}: ${value ? value : '❌ Not set'}`);
    });

    await pool.end();
  } catch (error: any) {
    console.error('❌ Error checking plans:', error.message);
    await pool.end();
  }
}

checkPlans();
