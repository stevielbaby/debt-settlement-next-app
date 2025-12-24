/**
 * API Handler: Create Portal Session
 * Creates a Stripe Customer Portal session for self-service billing management
 */

import type { AuthAdapter } from '../adapters/auth-adapter';
import type { DBAdapter } from '../adapters/db-adapter';
import { BillingConfig, PortalSessionRequest, PortalSessionResponse } from '../types';
import { createStripeClient, createStripePortalSession } from '../stripe/client';
import { findBillingAccountByUserId } from '../db/queries';
import { getPortalReturnUrl } from '../config';
import { CustomerError } from '../errors';

export interface CreatePortalParams {
  authAdapter: AuthAdapter;
  dbAdapter: DBAdapter;
  config: BillingConfig;
  request?: PortalSessionRequest;
}

/**
 * Create Stripe Customer Portal session
 */
export async function createPortalSession(
  params: CreatePortalParams
): Promise<PortalSessionResponse> {
  const { authAdapter, dbAdapter, config, request } = params;
  const logger = config.logger;

  // Get current user
  const user = await authAdapter.requireUser();

  // Find billing account
  const billingAccount = await findBillingAccountByUserId(dbAdapter, user.id);
  if (!billingAccount) {
    throw new CustomerError('Billing account not found', {
      userId: user.id,
    });
  }

  // Get return URL
  const defaultReturnUrl = getPortalReturnUrl(config);
  const returnUrl = request?.return_url || defaultReturnUrl;

  // Create portal session
  const stripe = createStripeClient(config);
  const session = await createStripePortalSession(
    stripe,
    {
      customerId: billingAccount.stripe_customer_id,
      returnUrl,
      configurationId: config.stripe_portal_configuration_id,
    },
    logger
  );

  logger?.info('[billing-kit] Created portal session', {
    userId: user.id,
    sessionId: session.id,
  });

  return {
    url: session.url,
  };
}
