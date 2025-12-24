/**
 * API Handler: Ensure Customer
 * Creates or retrieves Stripe customer and billing account for current user
 */

import type { AuthAdapter } from '../adapters/auth-adapter';
import type { DBAdapter } from '../adapters/db-adapter';
import { BillingConfig } from '../types';
import { createStripeClient, ensureStripeCustomer } from '../stripe/client';
import {
  findBillingAccountByUserId,
  createBillingAccount,
} from '../db/queries';

export interface EnsureCustomerParams {
  authAdapter: AuthAdapter;
  dbAdapter: DBAdapter;
  config: BillingConfig;
}

export interface EnsureCustomerResult {
  billing_account_id: string;
  stripe_customer_id: string;
}

/**
 * Ensure Stripe customer and billing account exist for current user
 * Idempotent - safe to call multiple times
 */
export async function ensureCustomer(
  params: EnsureCustomerParams
): Promise<EnsureCustomerResult> {
  const { authAdapter, dbAdapter, config } = params;
  const logger = config.logger;

  // Get current user
  const user = await authAdapter.requireUser();

  // Check if billing account already exists
  const existingAccount = await findBillingAccountByUserId(dbAdapter, user.id);
  if (existingAccount) {
    logger?.info('[billing-kit] Billing account already exists', {
      userId: user.id,
      customerId: existingAccount.stripe_customer_id,
    });
    return {
      billing_account_id: existingAccount.id,
      stripe_customer_id: existingAccount.stripe_customer_id,
    };
  }

  // Create Stripe customer
  const stripe = createStripeClient(config);
  const customer = await ensureStripeCustomer(
    stripe,
    {
      email: user.email,
      name: user.name || undefined,
      userId: user.id,
    },
    logger
  );

  // Create billing account record
  const billingAccount = await createBillingAccount(dbAdapter, {
    user_id: user.id,
    email: user.email,
    stripe_customer_id: customer.id,
  });

  logger?.info('[billing-kit] Created billing account', {
    userId: user.id,
    billingAccountId: billingAccount.id,
    customerId: customer.id,
  });

  return {
    billing_account_id: billingAccount.id,
    stripe_customer_id: customer.id,
  };
}
