require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function runMigration() {
  try {
    console.log('🚀 Running webmaster schema alignment migration...\n');

    // 1) organizations: add expected columns and backfill
    const orgAlterStatements = [
      `ALTER TABLE app.organizations ADD COLUMN IF NOT EXISTS name TEXT`,
      `ALTER TABLE app.organizations ADD COLUMN IF NOT EXISTS email TEXT`,
      `ALTER TABLE app.organizations ADD COLUMN IF NOT EXISTS contact_name TEXT`,
      `ALTER TABLE app.organizations ADD COLUMN IF NOT EXISTS phone TEXT`,
      `ALTER TABLE app.organizations ADD COLUMN IF NOT EXISTS address TEXT`,
    ];

    for (const stmt of orgAlterStatements) {
      try {
        await sql.unsafe(stmt + ';');
        console.log('✅ Executed:', stmt);
      } catch (err) {
        console.warn('⚠️  Org alter warning:', err.message.split('\n')[0]);
      }
    }

    try {
      await sql.unsafe(
        `UPDATE app.organizations
         SET
           name = COALESCE(name, firm_name),
           email = COALESCE(email, contact_email),
           contact_name = COALESCE(contact_name, firm_name),
           phone = COALESCE(phone, contact_phone)
         WHERE (name IS NULL OR email IS NULL OR contact_name IS NULL OR phone IS NULL);`
      );
      console.log('✅ Backfilled organizations columns');
    } catch (err) {
      console.warn('⚠️  Org backfill warning:', err.message.split('\n')[0]);
    }

    // 2) subscription_plans: add expected columns and backfill
    const planAlterStatements = [
      `ALTER TABLE app.subscription_plans ADD COLUMN IF NOT EXISTS name TEXT`,
      `ALTER TABLE app.subscription_plans ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2)`,
      `ALTER TABLE app.subscription_plans ADD COLUMN IF NOT EXISTS monthly_limit INTEGER`,
      `ALTER TABLE app.subscription_plans ADD COLUMN IF NOT EXISTS features TEXT[]`,
      `ALTER TABLE app.subscription_plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN`,
    ];

    for (const stmt of planAlterStatements) {
      try {
        await sql.unsafe(stmt + ';');
        console.log('✅ Executed:', stmt);
      } catch (err) {
        console.warn('⚠️  Plans alter warning:', err.message.split('\n')[0]);
      }
    }

    try {
      await sql.unsafe(
        `UPDATE app.subscription_plans
         SET
           name = COALESCE(name, plan_name),
           price = COALESCE(price, monthly_price_cents / 100.0),
           monthly_limit = COALESCE(monthly_limit, email_limit_monthly, api_request_limit),
           features = COALESCE(features, ARRAY[]::TEXT[]),
           is_active = COALESCE(is_active, active)
         WHERE (name IS NULL OR price IS NULL OR monthly_limit IS NULL OR features IS NULL OR is_active IS NULL);`
      );
      console.log('✅ Backfilled subscription_plans columns');
    } catch (err) {
      console.warn('⚠️  Plans backfill warning:', err.message.split('\n')[0]);
    }

    // 3) organization_subscriptions: add expected columns and backfill
    const subsAlterStatements = [
      `ALTER TABLE app.organization_subscriptions ADD COLUMN IF NOT EXISTS organization_id UUID`,
      `ALTER TABLE app.organization_subscriptions ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP`,
      `ALTER TABLE app.organization_subscriptions ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP`,
    ];

    for (const stmt of subsAlterStatements) {
      try {
        await sql.unsafe(stmt + ';');
        console.log('✅ Executed:', stmt);
      } catch (err) {
        console.warn('⚠️  Subs alter warning:', err.message.split('\n')[0]);
      }
    }

    try {
      await sql.unsafe(
        `UPDATE app.organization_subscriptions
         SET
           organization_id = COALESCE(organization_id, org_id),
           current_period_start = COALESCE(current_period_start, billing_cycle_start),
           current_period_end = COALESCE(current_period_end, billing_cycle_end)
         WHERE (organization_id IS NULL OR current_period_start IS NULL OR current_period_end IS NULL);`
      );
      console.log('✅ Backfilled organization_subscriptions columns');
    } catch (err) {
      console.warn('⚠️  Subs backfill warning:', err.message.split('\n')[0]);
    }

    console.log('\nVerifying schema...');

    // Verify organizations
    try {
      const orgs = await sql`SELECT COUNT(*) as count FROM app.organizations WHERE name IS NOT NULL`;
      console.log(`  ✓ Organizations with 'name' column populated: ${orgs[0].count}`);
    } catch (err) {
      console.warn('⚠️  Verify orgs warning:', err.message.split('\n')[0]);
    }

    // Verify subscription_plans
    try {
      const plans = await sql`SELECT COUNT(*) as count FROM app.subscription_plans WHERE name IS NOT NULL`;
      console.log(`  ✓ Subscription plans with 'name' column populated: ${plans[0].count}`);
    } catch (err) {
      console.warn('⚠️  Verify plans warning:', err.message.split('\n')[0]);
    }

    // Verify organization_subscriptions
    try {
      const subs = await sql`SELECT COUNT(*) as count FROM app.organization_subscriptions WHERE organization_id IS NOT NULL`;
      console.log(`  ✓ Organization subscriptions with 'organization_id' populated: ${subs[0].count}`);
    } catch (err) {
      console.warn('⚠️  Verify subs warning:', err.message.split('\n')[0]);
    }

    console.log('\n✅ Migration completed!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
  process.exit(0);
}

runMigration();
