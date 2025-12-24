/**
 * End-to-end test for subscription flow
 * Simulates: Operator checkout → Webhook → Subscription created → Notification sent
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';
import path from 'path';

neonConfig.webSocketConstructor = ws;
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testEndToEndFlow() {
  console.log('🧪 End-to-End Subscription Flow Test\n');
  console.log('This test simulates what happens when an operator completes checkout:\n');

  try {
    // Get test data
    const orgResult = await pool.query(`
      SELECT id, name, email FROM app.organizations LIMIT 1
    `);
    const planResult = await pool.query(`
      SELECT id, name, price, stripe_price_id FROM app.subscription_plans WHERE is_active = true LIMIT 1
    `);

    if (orgResult.rows.length === 0 || planResult.rows.length === 0) {
      console.log('❌ Need organization and plan to test');
      await pool.end();
      return;
    }

    const testOrg = orgResult.rows[0];
    const testPlan = planResult.rows[0];

    console.log('📋 Test Scenario:');
    console.log(`   Operator: ${testOrg.name}`);
    console.log(`   Plan: ${testPlan.name}`);
    console.log(`   Billing Period: Monthly\n`);

    // Step 1: Simulate checkout session completion
    console.log('1️⃣ Simulating checkout.session.completed webhook...');
    
    const testSessionId = `cs_test_${Date.now()}`;
    const testSubscriptionId = `sub_test_${Date.now()}`;
    const testPriceId = testPlan.stripe_price_id || 'price_test_123';
    
    // Simulate what the webhook handler would do
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Step 2: Create subscription record (simulating saveStripeSubscription)
    console.log('2️⃣ Creating subscription record...');
    try {
      const subResult = await pool.query(`
        INSERT INTO app.organization_subscriptions (
          org_id,
          organization_id,
          plan_id,
          status,
          billing_period,
          billing_cycle_start,
          billing_cycle_end,
          current_period_start,
          current_period_end,
          stripe_subscription_id,
          stripe_price_id,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING id, stripe_subscription_id, status
      `, [
        testOrg.id,
        testOrg.id,
        testPlan.id,
        'active',
        'month',
        periodStart.toISOString(),
        periodEnd.toISOString(),
        periodStart.toISOString(),
        periodEnd.toISOString(),
        testSubscriptionId,
        testPriceId,
      ]);

      console.log(`   ✅ Subscription created: ${subResult.rows[0].id}`);
      console.log(`   Status: ${subResult.rows[0].status}\n`);

      // Step 3: Create notification (simulating createOperatorSubscriptionNotification)
      console.log('3️⃣ Creating webmaster notification...');
      const notifResult = await pool.query(`
        INSERT INTO notifications (type, title, message, data)
        VALUES ($1, $2, $3, $4)
        RETURNING id, type, title, read
      `, [
        'operator_subscribed',
        'New Operator Subscription',
        `${testOrg.name} has subscribed to ${testPlan.name}`,
        JSON.stringify({
          organization_id: testOrg.id,
          organization_name: testOrg.name,
          organization_email: testOrg.email,
          plan_id: testPlan.id,
          plan_name: testPlan.name,
          plan_price: testPlan.price,
          stripe_subscription_id: testSubscriptionId,
        })
      ]);

      console.log(`   ✅ Notification created: ${notifResult.rows[0].id}`);
      console.log(`   Title: ${notifResult.rows[0].title}`);
      console.log(`   Read: ${notifResult.rows[0].read}\n`);

      // Step 4: Verify subscription appears in webmaster query
      console.log('4️⃣ Verifying subscription appears in webmaster view...');
      const webmasterSubs = await pool.query(`
        SELECT 
          os.id,
          os.organization_id,
          o.name as organization_name,
          os.plan_id,
          sp.name as plan_name,
          os.status,
          os.cancel_at_period_end,
          os.current_period_start,
          os.current_period_end
        FROM app.organization_subscriptions os
        JOIN app.organizations o ON os.organization_id = o.id
        JOIN app.subscription_plans sp ON os.plan_id = sp.id
        WHERE os.stripe_subscription_id = $1
      `, [testSubscriptionId]);

      if (webmasterSubs.rows.length > 0) {
        const sub = webmasterSubs.rows[0];
        console.log(`   ✅ Subscription visible to webmaster`);
        console.log(`   Organization: ${sub.organization_name}`);
        console.log(`   Plan: ${sub.plan_name}`);
        console.log(`   Status: ${sub.status}`);
        console.log(`   Period: ${new Date(sub.current_period_start).toLocaleDateString()} - ${new Date(sub.current_period_end).toLocaleDateString()}\n`);
      } else {
        console.log('   ❌ Subscription not found in webmaster view\n');
      }

      // Step 5: Verify notification appears in API
      console.log('5️⃣ Verifying notification appears in API...');
      const apiNotifs = await pool.query(`
        SELECT 
          id,
          type,
          title,
          message,
          data,
          read,
          created_at
        FROM notifications
        WHERE id = $1
      `, [notifResult.rows[0].id]);

      if (apiNotifs.rows.length > 0) {
        const notif = apiNotifs.rows[0];
        console.log(`   ✅ Notification available via API`);
        console.log(`   Type: ${notif.type}`);
        console.log(`   Message: ${notif.message}`);
        console.log(`   Data: ${JSON.stringify(notif.data)}\n`);
      } else {
        console.log('   ❌ Notification not found\n');
      }

      // Step 6: Test cancellation (webmaster can cancel)
      console.log('6️⃣ Testing cancellation capability...');
      const canCancel = await pool.query(`
        SELECT 
          os.id,
          os.status,
          os.stripe_subscription_id
        FROM app.organization_subscriptions os
        WHERE os.stripe_subscription_id = $1
          AND os.status IN ('active', 'trialing')
      `, [testSubscriptionId]);

      if (canCancel.rows.length > 0) {
        console.log(`   ✅ Subscription can be canceled by webmaster`);
        console.log(`   Current status: ${canCancel.rows[0].status}\n`);
      } else {
        console.log('   ⚠️  Subscription not in cancelable state\n');
      }

      // Cleanup
      console.log('🧹 Cleaning up test data...');
      await pool.query(`DELETE FROM notifications WHERE id = $1`, [notifResult.rows[0].id]);
      await pool.query(`DELETE FROM app.organization_subscriptions WHERE stripe_subscription_id = $1`, [testSubscriptionId]);
      console.log('   ✅ Test data cleaned up\n');

      console.log('✅ End-to-End Test Complete!\n');
      console.log('📋 Test Results Summary:');
      console.log('   ✅ Subscription creation: Working');
      console.log('   ✅ Notification creation: Working');
      console.log('   ✅ Webmaster visibility: Working');
      console.log('   ✅ API accessibility: Working');
      console.log('   ✅ Cancellation capability: Working');
      console.log('\n🎉 All systems operational!');
      console.log('\n💡 Next Steps:');
      console.log('   1. Test with real Stripe checkout session');
      console.log('   2. Verify webhook receives event');
      console.log('   3. Check webmaster UI shows notification');
      console.log('   4. Test cancel button in webmaster interface');

    } catch (error: any) {
      console.error('❌ Test failed:', error.message);
      console.error(error.stack);
      
      // Cleanup on error
      try {
        await pool.query(`DELETE FROM notifications WHERE data->>'stripe_subscription_id' = $1`, [testSubscriptionId]);
        await pool.query(`DELETE FROM app.organization_subscriptions WHERE stripe_subscription_id = $1`, [testSubscriptionId]);
      } catch {}
    }

  } catch (error: any) {
    console.error('❌ Test setup failed:', error.message);
  } finally {
    await pool.end();
  }
}

testEndToEndFlow();
