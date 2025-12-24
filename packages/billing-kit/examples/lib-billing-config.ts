/**
 * Example: Billing configuration
 * Copy to: lib/billing/config.ts
 */

import { loadConfig } from '@billing-kit/core';
import type { BillingConfig, Logger } from '@billing-kit/core';

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
