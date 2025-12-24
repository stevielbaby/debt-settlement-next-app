/**
 * Webhook Handler: customer.subscription.deleted
 * Triggered when subscription is canceled or expires
 */

import type Stripe from 'stripe';
import type { WebhookContext } from '../webhook';
import {
  findSubscriptionByStripeId,
  updateSubscription,
} from '../../db/queries';
import { DatabaseError } from '../../errors';

export async function handleCustomerSubscriptionDeleted(
  subscription: Stripe.Subscription,
  context: WebhookContext
): Promise<void> {
  const { db, logger } = context;

  logger.info('[billing-kit] Processing customer.subscription.deleted', {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    status: subscription.status,
  });

  // Find existing subscription record
  const existingSub = await findSubscriptionByStripeId(db, subscription.id);
  if (!existingSub) {
    logger.warn('[billing-kit] Subscription not found in database', {
      subscriptionId: subscription.id,
    });
    // Not an error - subscription may have been deleted before webhook arrived
    return;
  }

  // Update subscription status to canceled and set ended_at
  await updateSubscription(db, subscription.id, {
    status: 'canceled',
    ended_at: new Date(),
  });

  logger.info('[billing-kit] Subscription deleted', {
    subscriptionId: subscription.id,
  });
}
