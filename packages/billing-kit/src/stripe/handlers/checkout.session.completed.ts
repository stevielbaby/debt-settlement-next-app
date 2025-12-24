/**
 * Webhook Handler: checkout.session.completed
 * Triggered when a Checkout Session is successfully completed
 * Creates subscription record and links to billing account
 */

import type Stripe from 'stripe';
import type { WebhookContext } from '../webhook';
import {
  findBillingAccountByStripeCustomerId,
  findPlanByPriceId,
  upsertSubscription,
} from '../../db/queries';
import { DatabaseError } from '../../errors';

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  context: WebhookContext
): Promise<void> {
  const { db, stripe, logger } = context;

  logger.info('[billing-kit] Processing checkout.session.completed', {
    sessionId: session.id,
    customerId: session.customer,
    subscriptionId: session.subscription,
  });

  // Only handle subscription mode (not payment mode)
  if (session.mode !== 'subscription') {
    logger.debug('[billing-kit] Skipping non-subscription checkout session', {
      sessionId: session.id,
      mode: session.mode,
    });
    return;
  }

  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!customerId || !subscriptionId) {
    throw new DatabaseError('Checkout session missing customer or subscription ID', {
      sessionId: session.id,
    });
  }

  // Find billing account
  const billingAccount = await findBillingAccountByStripeCustomerId(db, customerId);
  if (!billingAccount) {
    throw new DatabaseError('Billing account not found for customer', {
      customerId,
    });
  }

  // Retrieve full subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Extract price ID from subscription items
  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) {
    throw new DatabaseError('Subscription has no price', {
      subscriptionId,
    });
  }

  // Find plan by price ID
  const plan = await findPlanByPriceId(db, priceId);

  // Create or update subscription record
  await upsertSubscription(db, {
    billing_account_id: billingAccount.id,
    stripe_subscription_id: subscriptionId,
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
  });

  logger.info('[billing-kit] Checkout session processed', {
    sessionId: session.id,
    subscriptionId,
    status: subscription.status,
    planKey: plan?.key,
  });
}
