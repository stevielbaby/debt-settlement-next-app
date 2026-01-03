import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import {
  listStripeProducts,
  listStripePrices,
  getActiveSubscription
} from './lib/stripe';
import {
  getStripeCustomerId,
  getAllPlanStripeIds
} from './lib/stripe-db';
import { prisma } from './app/lib/db';

async function checkStripeSetup() {
  console.log('🔍 Checking Stripe Setup for Debt Settlement App\n');

  try {
    // 1. Check database firm
    console.log('1️⃣ Checking Firm in Database...');
    const firm = await prisma.firm.findUnique({
      where: { id: 'firm-singleton' },
      select: {
        id: true,
        name: true,
        stripeCustomerId: true,
        publicEmail: true,
        publicPhone: true
      }
    });

    if (!firm) {
      console.log('❌ Firm not found in database');
      return;
    }

    console.log('✅ Firm found:', firm.name);
    console.log('   Email:', firm.publicEmail || 'Not set');
    console.log('   Phone:', firm.publicPhone || 'Not set');
    console.log('   Stripe Customer ID:', firm.stripeCustomerId || '❌ NOT SET');

    // 2. Check Stripe customer
    if (firm.stripeCustomerId) {
      console.log('\n2️⃣ Checking Stripe Customer...');
      try {
        // Get active subscription for this customer
        const subscription = await getActiveSubscription(firm.stripeCustomerId);
        if (subscription) {
          console.log('✅ Active subscription found!');
          console.log('   Subscription ID:', subscription.id);
          console.log('   Status:', subscription.status);
          console.log('   Current period end:', new Date(subscription.current_period_end * 1000));

          if (subscription.items.data[0]) {
            console.log('   Price ID:', subscription.items.data[0].price.id);
            console.log('   Amount:', subscription.items.data[0].price.unit_amount, 'cents');
          }
        } else {
          console.log('⚠️ No active subscription found for this customer');
        }
      } catch (error) {
        console.log('❌ Error checking Stripe customer:', error.message);
      }
    } else {
      console.log('\n2️⃣ No Stripe Customer ID - Customer not created in Stripe yet');
    }

    // 3. Check real Stripe products
    console.log('\n3️⃣ Checking Real Stripe Products...');
    console.log('   STRIPE_SECRET_KEY available:', !!process.env.STRIPE_SECRET_KEY);
    console.log('   Key length:', process.env.STRIPE_SECRET_KEY?.length);
    console.log('   Key starts with:', process.env.STRIPE_SECRET_KEY?.substring(0, 20));
    try {
      const products = await listStripeProducts();
      console.log(`✅ Found ${products.length} products in Stripe`);
      if (products.length > 0) {
        products.forEach((product, i) => {
          console.log(`   ${i + 1}. ${product.name} (${product.id})`);
        });
      }
    } catch (error) {
      console.log('❌ Error fetching Stripe products:', error.message);
    }

    // 4. Check real Stripe prices
    console.log('\n4️⃣ Checking Real Stripe Prices...');
    try {
      const prices = await listStripePrices();
      console.log(`✅ Found ${prices.length} prices in Stripe`);
      if (prices.length > 0) {
        prices.forEach((price, i) => {
          console.log(`   ${i + 1}. $${(price.unit_amount || 0) / 100} (${price.id}) - ${price.recurring?.interval || 'one-time'}`);
        });
      }
    } catch (error) {
      console.log('❌ Error fetching Stripe prices:', error.message);
    }

    // 5. Check database plans (might be fake)
    console.log('\n5️⃣ Checking Database Plans...');
    try {
      const dbPlans = await getAllPlanStripeIds();
      console.log(`📊 Found ${dbPlans.length} plans in database`);
      if (dbPlans.length > 0) {
        dbPlans.forEach((plan, i) => {
          const isReal = plan.stripe_price_id && plan.stripe_price_id.startsWith('price_');
          console.log(`   ${i + 1}. ${plan.name} - $${(plan.price || 0) / 100}/month`);
          console.log(`      Price ID: ${plan.stripe_price_id || 'null'} ${isReal ? '✅' : '❌ (FAKE)'}`);
        });
      }
    } catch (error) {
      console.log('❌ Error fetching database plans:', error.message);
    }

    // 6. Check subscriptions in database
    console.log('\n6️⃣ Checking Database Subscriptions...');
    try {
      const subscriptions = await prisma.firmSubscription.findMany({
        where: { firmId: 'firm-singleton' },
        include: { plan: true }
      });
      console.log(`📋 Found ${subscriptions.length} subscriptions in database`);
      if (subscriptions.length > 0) {
        subscriptions.forEach((sub, i) => {
          console.log(`   ${i + 1}. Status: ${sub.status}`);
          console.log(`      Stripe Sub ID: ${sub.stripeSubscriptionId || 'null'}`);
          console.log(`      Plan: ${sub.plan?.name || 'Unknown'}`);
        });
      }
    } catch (error) {
      console.log('❌ Error fetching database subscriptions:', error.message);
    }

    console.log('\n🎯 SUMMARY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const hasStripeCustomer = !!firm.stripeCustomerId;
    const hasRealProducts = await listStripeProducts().then(p => p.length > 0).catch(() => false);
    const hasDbPlans = await getAllPlanStripeIds().then(p => p.length > 0).catch(() => false);

    console.log(`Stripe Customer Created: ${hasStripeCustomer ? '✅ YES' : '❌ NO'}`);
    console.log(`Real Stripe Products: ${hasRealProducts ? '✅ YES' : '❌ NO'}`);
    console.log(`Database Plans (may be fake): ${hasDbPlans ? '⚠️ YES (check if real)' : '❌ NO'}`);

    if (!hasStripeCustomer) {
      console.log('\n💡 NEXT STEPS:');
      console.log('1. Create a Stripe customer for your organization');
      console.log('2. Save the customer ID to the firm record');
      console.log('3. Create a subscription for the customer');
    } else if (!hasRealProducts) {
      console.log('\n💡 NEXT STEPS:');
      console.log('1. Create products and prices in your Stripe dashboard');
      console.log('2. Update database plans with real Stripe IDs');
    } else {
      console.log('\n✅ Setup looks good! Check the operator payments page now.');
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStripeSetup();
