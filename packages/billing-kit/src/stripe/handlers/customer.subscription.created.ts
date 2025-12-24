/**
 * Webhook Handler: customer.subscription.created
 * Triggered when a subscription is created (usually follows checkout.session.completed)
 */

import type Stripe from 'stripe';
import type { WebhookContext } from '../webhook';
import {
  findBillingAccountByStripeCustomerId,
  findPlanByPriceId,
  upsertSubscription,
} from '../../db/queries';
import { DatabaseError } from '../../errors';

/**
 * Create a notification for webmasters when operator subscribes
 */
async function createOperatorSubscriptionNotification(
  db: any,
  billingAccount: any,
  subscription: Stripe.Subscription,
  plan: any,
  logger: any
): Promise<void> {
  try {
    // Only create notification if this is an operator subscribing (not existing subscription updates)
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      // Get organization_id from user
      const userResult = await db.query(
        `SELECT organization_id, org_id FROM app.users WHERE id = $1 LIMIT 1`,
        [billingAccount.user_id]
      );
      const organizationId = userResult.rows[0]?.organization_id || userResult.rows[0]?.org_id || null;

      // Get organization name
      let organizationName = billingAccount.email;
      if (organizationId) {
        const orgResult = await db.query(
          `SELECT name FROM app.organizations WHERE id = $1 LIMIT 1`,
          [organizationId]
        );
        organizationName = orgResult.rows[0]?.name || billingAccount.email;
      }

      await db.query(`
        INSERT INTO notifications (type, title, message, data)
        VALUES ($1, $2, $3, $4)
      `, [
        'operator_subscribed',
        'New Operator Subscription',
        `${organizationName} has subscribed to ${plan?.name || 'a plan'}`,
        {
          operator_id: billingAccount.user_id,
          organization_id: organizationId,
          subscription_id: subscription.id,
          plan_name: plan?.name,
          plan_price: plan?.unit_amount,
          customer_email: billingAccount.email,
          organization_name: organizationName,
        }
      ]);

      logger.info('[billing-kit] Created subscription notification', {
        userId: billingAccount.user_id,
        organizationId,
        subscriptionId: subscription.id,
      });
    }
  } catch (error: any) {
    // Don't fail the subscription creation if notification fails
    logger.warn('[billing-kit] Failed to create subscription notification', {
      error: error?.message || 'Unknown error',
      userId: billingAccount.user_id,
    });
  }
}

export async function handleCustomerSubscriptionCreated(
  subscription: Stripe.Subscription,
  context: WebhookContext
): Promise<void> {
  const { db, logger } = context;

  logger.info('[billing-kit] Processing customer.subscription.created', {
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

  // Upsert subscription
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
  });

  // Create notification for webmasters
  await createOperatorSubscriptionNotification(db, billingAccount, subscription, plan, logger);

  // CRITICAL: Also create record in app.organization_subscriptions for webmaster visibility
  await createAppOrganizationSubscription(db, billingAccount, subscription, plan, priceId, logger);

  logger.info('[billing-kit] Subscription created', {
    subscriptionId: subscription.id,
    status: subscription.status,
    planKey: plan?.key,
  });
}

/**
 * Create subscription record in app.organization_subscriptions for webmaster management
 */
async function createAppOrganizationSubscription(
  db: any,
  billingAccount: any,
  subscription: Stripe.Subscription,
  plan: any,
  priceId: string,
  logger: any
): Promise<void> {
  try {
    // Find organization_id from user_id
    const userResult = await db.query(
      `SELECT organization_id, org_id FROM app.users WHERE id = $1 LIMIT 1`,
      [billingAccount.user_id]
    );

    if (userResult.rows.length === 0) {
      logger.warn('[billing-kit] User not found in app.users, skipping app.organization_subscriptions creation', {
        userId: billingAccount.user_id,
      });
      return;
    }

    const organizationId = userResult.rows[0].organization_id || userResult.rows[0].org_id;
    if (!organizationId) {
      logger.warn('[billing-kit] User has no organization_id, skipping app.organization_subscriptions creation', {
        userId: billingAccount.user_id,
      });
      return;
    }

    // Find plan_id from price_id in app.subscription_plans
    const planResult = await db.query(
      `SELECT id FROM app.subscription_plans 
       WHERE stripe_price_id = $1 OR yearly_stripe_price_id = $1 
       LIMIT 1`,
      [priceId]
    );

    if (planResult.rows.length === 0) {
      logger.warn('[billing-kit] Plan not found in app.subscription_plans, skipping app.organization_subscriptions creation', {
        priceId,
      });
      return;
    }

    const planId = planResult.rows[0].id;

    // Determine billing period from price_id
    const yearlyPlanResult = await db.query(
      `SELECT id FROM app.subscription_plans WHERE yearly_stripe_price_id = $1 LIMIT 1`,
      [priceId]
    );
    const billingPeriod = yearlyPlanResult.rows.length > 0 ? 'year' : 'month';

    // Create or update subscription in app.organization_subscriptions
    const subscriptionData = subscription as any;
    const periodStart = new Date(subscriptionData.current_period_start * 1000);
    const periodEnd = new Date(subscriptionData.current_period_end * 1000);

    // Check if subscription already exists
    const existingResult = await db.query(
      `SELECT id FROM app.organization_subscriptions 
       WHERE stripe_subscription_id = $1 LIMIT 1`,
      [subscriptionData.id]
    );

    if (existingResult.rows.length > 0) {
      // Update existing
      await db.query(
        `UPDATE app.organization_subscriptions 
         SET org_id = $1,
             organization_id = $1,
             plan_id = $2,
             status = $3,
             billing_period = $4,
             billing_cycle_start = $5,
             billing_cycle_end = $6,
             current_period_start = $5,
             current_period_end = $6,
             stripe_subscription_id = $7,
             stripe_price_id = $8,
             cancel_at_period_end = $9,
             updated_at = NOW()
         WHERE id = $10`,
        [
          organizationId,
          planId,
          subscriptionData.status,
          billingPeriod,
          periodStart.toISOString(),
          periodEnd.toISOString(),
          subscriptionData.id,
          priceId,
          subscriptionData.cancel_at_period_end || false,
          existingResult.rows[0].id,
        ]
      );
      logger.info('[billing-kit] Updated app.organization_subscriptions record', {
        subscriptionId: subscriptionData.id,
        organizationId,
      });
    } else {
      // Create new
      await db.query(
        `INSERT INTO app.organization_subscriptions (
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
          cancel_at_period_end,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
        [
          organizationId,
          organizationId,
          planId,
          subscription.status,
          billingPeriod,
          periodStart.toISOString(),
          periodEnd.toISOString(),
          periodStart.toISOString(),
          periodEnd.toISOString(),
          subscriptionData.id,
          priceId,
          subscriptionData.cancel_at_period_end || false,
        ]
      );
      logger.info('[billing-kit] Created app.organization_subscriptions record', {
        subscriptionId: subscriptionData.id,
        organizationId,
        planId,
      });
    }
  } catch (error: any) {
    // Don't fail the subscription creation if app record creation fails
    logger.warn('[billing-kit] Failed to create app.organization_subscriptions record', {
      error: error?.message || 'Unknown error',
      subscriptionId: (subscription as any).id,
    });
  }
}
