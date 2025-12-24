/**
 * Webhook Handler: customer.subscription.updated
 * Triggered when subscription changes (status, billing period, plan, etc.)
 */

import type Stripe from 'stripe';
import type { WebhookContext } from '../webhook';
import {
  findBillingAccountByStripeCustomerId,
  findPlanByPriceId,
  upsertSubscription,
} from '../../db/queries';
import { DatabaseError } from '../../errors';

export async function handleCustomerSubscriptionUpdated(
  subscription: Stripe.Subscription,
  context: WebhookContext
): Promise<void> {
  const { db, logger } = context;

  logger.info('[billing-kit] Processing customer.subscription.updated', {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    status: subscription.status,
  });

  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

  // Find billing account
  const billingAccount = await findBillingAccountByStripeCustomerId(db, customerId);
  if (!billingAccount) {
    throw new DatabaseError('Billing account not found for customer', {
      customerId,
    });
  }

  // Extract price ID
  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) {
    throw new DatabaseError('Subscription has no price', {
      subscriptionId: subscription.id,
    });
  }

  // Find plan
  const plan = await findPlanByPriceId(db, priceId);

  // Upsert subscription (update if exists, create if not)
  await upsertSubscription(db, {
    billing_account_id: billingAccount.id,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    current_plan_key: plan?.key || null,
    current_price_id: priceId,
    quantity: subscription.items.data[0]?.quantity || 1,
    cancel_at_period_end: subscription.cancel_at_period_end,
    trial_start: subscription.trial_start
      ? new Date(subscription.trial_start * 1000)
      : null,
    trial_end: subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : null,
    ended_at: subscription.ended_at
      ? new Date(subscription.ended_at * 1000)
      : null,
  });

  logger.info('[billing-kit] Subscription updated', {
    subscriptionId: subscription.id,
    status: subscription.status,
    planKey: plan?.key,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}
