/**
 * API Handler: Create Checkout Session
 * Creates a Stripe Checkout Session for subscribing to a plan
 */

import type { AuthAdapter } from '../adapters/auth-adapter';
import type { DBAdapter } from '../adapters/db-adapter';
import { BillingConfig, CheckoutSessionRequest, CheckoutSessionResponse } from '../types';
import { createStripeClient, createStripeCheckoutSession } from '../stripe/client';
import { findBillingAccountByUserId } from '../db/queries';
import { getCheckoutUrls } from '../config';
import { CustomerError } from '../errors';
import { ensureCustomer } from './ensure-customer';

export interface CreateCheckoutParams {
  authAdapter: AuthAdapter;
  dbAdapter: DBAdapter;
  config: BillingConfig;
  request: CheckoutSessionRequest;
}

/**
 * Create Stripe Checkout Session for subscription
 */
export async function createCheckoutSession(
  params: CreateCheckoutParams
): Promise<CheckoutSessionResponse> {
  const { authAdapter, dbAdapter, config, request } = params;
  const logger = config.logger;

  // Get current user
  const user = await authAdapter.requireUser();

  // Ensure billing account exists
  let billingAccount = await findBillingAccountByUserId(dbAdapter, user.id);
  if (!billingAccount) {
    // Create if not exists
    const result = await ensureCustomer({ authAdapter, dbAdapter, config });
    billingAccount = await findBillingAccountByUserId(dbAdapter, user.id);
    if (!billingAccount) {
      throw new CustomerError('Failed to create billing account');
    }
  }

  // Get configured URLs or use request overrides
  const defaultUrls = getCheckoutUrls(config);
  const successUrl = request.success_url || defaultUrls.success_url;
  const cancelUrl = request.cancel_url || defaultUrls.cancel_url;

  // Create Stripe checkout session
  const stripe = createStripeClient(config);
  const session = await createStripeCheckoutSession(
    stripe,
    {
      customerId: billingAccount.stripe_customer_id,
      priceId: request.price_id,
      successUrl,
      cancelUrl,
      trialPeriodDays: request.trial_period_days,
      metadata: {
        user_id: user.id,
        billing_account_id: billingAccount.id,
        ...request.metadata,
      },
    },
    logger
  );

  logger?.info('[billing-kit] Created checkout session', {
    userId: user.id,
    sessionId: session.id,
    priceId: request.price_id,
  });

  return {
    url: session.url!,
    session_id: session.id,
  };
}
