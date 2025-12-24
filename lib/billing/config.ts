/**
 * Billing configuration
 */

import { loadConfig, getCheckoutUrls as originalGetCheckoutUrls } from '@/packages/billing-kit/src/config';
import type { BillingConfig, Logger } from '@/packages/billing-kit/src/types';

/**
 * Optional: Custom logger implementation
 */
const logger: Logger = {
  info: (message, meta) => console.log('[BILLING]', message, meta),
  warn: (message, meta) => console.warn('[BILLING]', message, meta),
  error: (message, meta) => console.error('[BILLING]', message, meta),
  debug: (message, meta) => console.debug('[BILLING]', message, meta),
};

/**
 * Get billing configuration
 * Caches config for performance
 */
let cachedConfig: BillingConfig | null = null;

export function getBillingConfig(): BillingConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig(logger);
  }
  return cachedConfig;
}

/**
 * Override checkout URLs to use app-specific pages
 * Instead of generic /billing/success, use /operator/billing/success
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
