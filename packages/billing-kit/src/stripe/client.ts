/**
 * Stripe client wrapper
 * Wraps Stripe SDK with error handling and logging
 */

import Stripe from 'stripe';
import { BillingConfig, Logger, noopLogger } from '../types';
import { StripeApiError } from '../errors';

/**
 * Create configured Stripe client
 */
export function createStripeClient(config: BillingConfig): Stripe {
  const logger = config.logger || noopLogger;

  try {
    const stripe = new Stripe(config.stripe_secret_key, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
      appInfo: {
        name: 'billing-kit',
        version: '1.0.0',
      },
    });

    logger.info('[billing-kit] Stripe client initialized');

    return stripe;
  } catch (error: any) {
    logger.error('[billing-kit] Failed to initialize Stripe client', {
      error: error.message,
    });
    throw new StripeApiError('Failed to initialize Stripe client', {
      error: error.message,
    });
  }
}

/**
 * Helper: Create or retrieve Stripe customer
 */
export async function ensureStripeCustomer(
  stripe: Stripe,
  params: {
    email: string;
    name?: string;
    userId: string;
  },
  logger?: Logger
): Promise<Stripe.Customer> {
  const log = logger || noopLogger;

  try {
    // Search for existing customer by email
    const existingCustomers = await stripe.customers.list({
      email: params.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      const customer = existingCustomers.data[0];
      log.info('[billing-kit] Found existing Stripe customer', {
        customerId: customer.id,
        email: params.email,
      });
      return customer;
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: {
        user_id: params.userId,
      },
    });

    log.info('[billing-kit] Created new Stripe customer', {
      customerId: customer.id,
      email: params.email,
    });

    return customer;
  } catch (error: any) {
    log.error('[billing-kit] Failed to ensure Stripe customer', {
      email: params.email,
      error: error.message,
    });
    throw new StripeApiError('Failed to create or retrieve Stripe customer', {
      email: params.email,
      error: error.message,
    });
  }
}

/**
 * Helper: Create checkout session
 */
export async function createStripeCheckoutSession(
  stripe: Stripe,
  params: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    trialPeriodDays?: number;
    metadata?: Record<string, string>;
  },
  logger?: Logger
): Promise<Stripe.Checkout.Session> {
  const log = logger || noopLogger;

  try {
    const session = await stripe.checkout.sessions.create({
      customer: params.customerId,
      mode: 'subscription',
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      subscription_data: params.trialPeriodDays
        ? { trial_period_days: params.trialPeriodDays }
        : undefined,
      metadata: params.metadata,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
    });

    log.info('[billing-kit] Created checkout session', {
      sessionId: session.id,
      customerId: params.customerId,
      priceId: params.priceId,
    });

    return session;
  } catch (error: any) {
    log.error('[billing-kit] Failed to create checkout session', {
      customerId: params.customerId,
      priceId: params.priceId,
      error: error.message,
    });
    throw new StripeApiError('Failed to create checkout session', {
      customerId: params.customerId,
      error: error.message,
    });
  }
}

/**
 * Helper: Create customer portal session
 */
export async function createStripePortalSession(
  stripe: Stripe,
  params: {
    customerId: string;
    returnUrl: string;
    configurationId?: string;
  },
  logger?: Logger
): Promise<Stripe.BillingPortal.Session> {
  const log = logger || noopLogger;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
      configuration: params.configurationId,
    });

    log.info('[billing-kit] Created portal session', {
      sessionId: session.id,
      customerId: params.customerId,
    });

    return session;
  } catch (error: any) {
    log.error('[billing-kit] Failed to create portal session', {
      customerId: params.customerId,
      error: error.message,
    });
    throw new StripeApiError('Failed to create portal session', {
      customerId: params.customerId,
      error: error.message,
    });
  }
}

/**
 * Helper: Retrieve subscription
 */
export async function retrieveStripeSubscription(
  stripe: Stripe,
  subscriptionId: string,
  logger?: Logger
): Promise<Stripe.Subscription> {
  const log = logger || noopLogger;

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['default_payment_method', 'items.data.price.product'],
    });

    log.debug('[billing-kit] Retrieved subscription', {
      subscriptionId: subscription.id,
      status: subscription.status,
    });

    return subscription;
  } catch (error: any) {
    log.error('[billing-kit] Failed to retrieve subscription', {
      subscriptionId,
      error: error.message,
    });
    throw new StripeApiError('Failed to retrieve subscription', {
      subscriptionId,
      error: error.message,
    });
  }
}

/**
 * Helper: Cancel subscription
 */
export async function cancelStripeSubscription(
  stripe: Stripe,
  subscriptionId: string,
  params: {
    cancelAtPeriodEnd: boolean;
  },
  logger?: Logger
): Promise<Stripe.Subscription> {
  const log = logger || noopLogger;

  try {
    let subscription: Stripe.Subscription;

    if (params.cancelAtPeriodEnd) {
      // Schedule cancellation at period end
      subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      log.info('[billing-kit] Scheduled subscription cancellation', {
        subscriptionId,
        cancelAt: subscription.cancel_at,
      });
    } else {
      // Cancel immediately
      subscription = await stripe.subscriptions.cancel(subscriptionId);
      log.info('[billing-kit] Canceled subscription immediately', {
        subscriptionId,
      });
    }

    return subscription;
  } catch (error: any) {
    log.error('[billing-kit] Failed to cancel subscription', {
      subscriptionId,
      error: error.message,
    });
    throw new StripeApiError('Failed to cancel subscription', {
      subscriptionId,
      error: error.message,
    });
  }
}
