import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { listStripeProducts, listStripePrices } from './lib/stripe';
import { prisma } from './app/lib/db';

async function syncStripePlans() {
  console.log('🔄 Syncing Stripe Plans with Database...\n');

  try {
    // Get all products and prices from Stripe
    console.log('1️⃣ Fetching products from Stripe...');
    const products = await listStripeProducts();
    console.log(`Found ${products.length} products`);

    console.log('2️⃣ Fetching prices from Stripe...');
    const prices = await listStripePrices();
    console.log(`Found ${prices.length} prices`);

    // Match products to prices
    const planData = products
      .map(product => {
        const price = prices.find(p => p.product === product.id);
        if (!price) {
          console.log(`⚠️ No price found for product: ${product.name}`);
          return null;
        }

        return {
          stripeProductId: product.id,
          stripePriceId: price.id,
          name: product.name,
          description: product.description || '',
          priceCents: price.unit_amount || 0,
          interval: price.recurring?.interval || 'month',
        };
      })
      .filter(Boolean);

    console.log(`\n3️⃣ Found ${planData.length} complete plans to sync`);

    // Update database
    for (const plan of planData) {
      if (!plan) continue;

      console.log(`📝 Syncing: ${plan.name} (${plan.stripePriceId})`);

      await prisma.stripePlan.upsert({
        where: { stripePriceId: plan.stripePriceId },
        update: {
          name: plan.name,
          description: plan.description,
          priceCents: plan.priceCents,
          interval: plan.interval,
          isActive: true,
          updatedAt: new Date(),
        },
        create: {
          stripeProductId: plan.stripeProductId,
          stripePriceId: plan.stripePriceId,
          name: plan.name,
          description: plan.description,
          priceCents: plan.priceCents,
          interval: plan.interval,
          isActive: true,
        },
      });
    }

    // Deactivate plans that no longer exist in Stripe
    const activeStripePriceIds = planData.map(p => p?.stripePriceId).filter(Boolean);
    const dbPlans = await prisma.stripePlan.findMany();

    for (const dbPlan of dbPlans) {
      if (!activeStripePriceIds.includes(dbPlan.stripePriceId)) {
        console.log(`⚠️ Deactivating plan: ${dbPlan.name} (not found in Stripe)`);
        await prisma.stripePlan.update({
          where: { id: dbPlan.id },
          data: { isActive: false },
        });
      }
    }

    console.log('\n✅ Sync complete!');
    console.log('Now run: npx tsx check-stripe-setup.ts');

  } catch (error: any) {
    console.error('❌ Sync failed:', error.message);
    if (error.code === 'StripeAuthenticationError') {
      console.error('💡 Fix your STRIPE_SECRET_KEY in .env.local first');
    }
  } finally {
    await prisma.$disconnect();
  }
}

syncStripePlans();
