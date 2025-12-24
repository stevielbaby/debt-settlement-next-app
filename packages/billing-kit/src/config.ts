/**
 * Configuration management for billing-kit
 * Reads environment variables and validates required settings
 */

import { BillingConfig, Logger, noopLogger } from './types';
import { ConfigurationError } from './errors';

/**
 * Load billing configuration from environment variables
 * Throws ConfigurationError if required vars are missing
 */
export function loadConfig(logger?: Logger): BillingConfig {
  const log = logger || noopLogger;

  const stripe_secret_key = process.env.STRIPE_SECRET_KEY;
  const stripe_webhook_secret = process.env.STRIPE_WEBHOOK_SECRET;
  const billing_app_url = process.env.BILLING_APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  const stripe_portal_configuration_id = process.env.STRIPE_PORTAL_CONFIGURATION_ID;

  // Validate required env vars
  const missing: string[] = [];
  if (!stripe_secret_key) missing.push('STRIPE_SECRET_KEY');
  if (!stripe_webhook_secret) missing.push('STRIPE_WEBHOOK_SECRET');
  if (!billing_app_url) missing.push('BILLING_APP_URL or NEXT_PUBLIC_APP_URL');

  if (missing.length > 0) {
    throw new ConfigurationError(
      `Missing required environment variables: ${missing.join(', ')}`,
      { missing }
    );
  }

  log.info('[billing-kit] Configuration loaded', {
    has_portal_config: !!stripe_portal_configuration_id,
    app_url: billing_app_url,
  });

  return {
    stripe_secret_key: stripe_secret_key!,
    stripe_webhook_secret: stripe_webhook_secret!,
    billing_app_url: billing_app_url!,
    stripe_portal_configuration_id,
    logger: log,
  };
}

/**
 * Plan price ID mappings (optional; host app can customize)
 * These should match env vars like STRIPE_PRICE_ID_STARTER_MONTHLY
 */
export function getPlanPriceIds(): Record<string, string> {
  return {
    starter_monthly: process.env.STRIPE_PRICE_ID_STARTER_MONTHLY || '',
    starter_yearly: process.env.STRIPE_PRICE_ID_STARTER_YEARLY || '',
    pro_monthly: process.env.STRIPE_PRICE_ID_PRO_MONTHLY || '',
    pro_yearly: process.env.STRIPE_PRICE_ID_PRO_YEARLY || '',
  };
}

/**
 * Get configured redirect URLs for checkout
 */
export function getCheckoutUrls(config: BillingConfig): {
  success_url: string;
  cancel_url: string;
} {
  const baseUrl = config.billing_app_url;
  return {
    success_url: `${baseUrl}/operator/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/operator/billing/select-plan`,
  };
}

/**
 * Get return URL for customer portal
 */
export function getPortalReturnUrl(config: BillingConfig): string {
  return `${config.billing_app_url}/billing`;
}
