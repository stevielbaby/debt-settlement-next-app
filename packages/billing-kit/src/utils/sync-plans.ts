/**
 * Sync Plans Utility
 * Optional utility to sync Stripe products/prices to plans table
 * Host app runs this manually when needed (not in core webhook flow)
 */

import Stripe from 'stripe';
import type { DBAdapter } from '../adapters/db-adapter';
import type { Logger } from '../types';
import { createPlan } from '../db/queries';
import { createStripeClient } from '../stripe/client';
import { loadConfig } from '../config';

/**
 * Sync active Stripe products and prices to plans table
 */
export async function syncPlansFromStripe(params: {
  db: DBAdapter;
  stripe?: Stripe;
  logger?: Logger;
}): Promise<{ synced: number; errors: number }> {
  const { db, logger } = params;

  // Create Stripe client if not provided
  const config = loadConfig(logger);
  const stripe = params.stripe || createStripeClient(config);

  logger?.info('[billing-kit] Starting plan sync from Stripe');

  let synced = 0;
  let errors = 0;

  try {
    // Fetch all active products with prices
    const products = await stripe.products.list({
      active: true,
      limit: 100,
    });

    for (const product of products.data) {
      // Fetch prices for this product
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
        limit: 100,
      });

      for (const price of prices.data) {
        // Only handle recurring prices (subscriptions)
        if (price.type !== 'recurring' || !price.recurring) {
          continue;
        }

        // Generate plan key (can be customized)
        const planKey = generatePlanKey(product, price);

        try {
          await createPlan(db, {
            key: planKey,
            name: product.name,
            description: product.description || null,
            stripe_product_id: product.id,
            stripe_price_id: price.id,
            interval: price.recurring.interval as 'month' | 'year',
            unit_amount: price.unit_amount || 0,
            is_active: true,
          });

          logger?.info('[billing-kit] Synced plan', {
            planKey,
            productId: product.id,
            priceId: price.id,
          });

          synced++;
        } catch (error: any) {
          logger?.error('[billing-kit] Failed to sync plan', {
            planKey,
            productId: product.id,
            priceId: price.id,
            error: error.message,
          });
          errors++;
        }
      }
    }

    logger?.info('[billing-kit] Plan sync completed', {
      synced,
      errors,
    });

    return { synced, errors };
  } catch (error: any) {
    logger?.error('[billing-kit] Plan sync failed', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Generate plan key from product and price
 * Can be customized based on naming conventions
 */
function generatePlanKey(product: Stripe.Product, price: Stripe.Price): string {
  // Example: "pro_monthly" or "starter_yearly"
  const productSlug = product.name.toLowerCase().replace(/\s+/g, '_');
  const interval = price.recurring?.interval || 'month';

  return `${productSlug}_${interval}ly`;
}

/**
 * CLI script wrapper (can be run with tsx)
 */
export async function syncPlansFromStripeCLI(): Promise<void> {
  // This would be called from a script like:
  // tsx packages/billing-kit/src/utils/sync-plans.ts

  console.log('Syncing plans from Stripe...');

  // Host app would provide DB adapter
  // This is a placeholder - actual implementation depends on host app setup
  throw new Error(
    'syncPlansFromStripeCLI must be implemented by host app with DB adapter'
  );
}

// Run if called directly
if (require.main === module) {
  syncPlansFromStripeCLI()
    .then(() => {
      console.log('Sync completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Sync failed:', error);
      process.exit(1);
    });
}
