/**
 * Billing Kit - Main entry point
 * Export all public APIs, types, and utilities
 */

// Types
export * from './types';
export * from './errors';

// Configuration
export { loadConfig, getPlanPriceIds, getCheckoutUrls, getPortalReturnUrl } from './config';

// Adapters (interfaces only; examples are separate)
export type { AuthAdapter } from './adapters/auth-adapter';
export type { DBAdapter } from './adapters/db-adapter';

// Database queries
export * from './db/queries';

// Stripe client
export { createStripeClient } from './stripe/client';
export { processWebhook } from './stripe/webhook';

// API handlers (host app imports and mounts these)
export { ensureCustomer } from './api/ensure-customer';
export { createCheckoutSession } from './api/create-checkout';
export { createPortalSession } from './api/create-portal';
export { getSubscription } from './api/get-subscription';
export { listInvoices } from './api/list-invoices';

// Aliases for convenience
export { createCheckoutSession as createCheckout } from './api/create-checkout';
export { createPortalSession as createPortal } from './api/create-portal';
export { processWebhook as handleWebhook } from './stripe/webhook';

// Entitlements
export { requireActiveSubscription, checkSubscriptionAccess } from './entitlements/gate';
export { getEntitlementPolicy } from './entitlements/policy';

// Optional utilities (not required for core functionality)
export { syncPlansFromStripe } from './utils/sync-plans';
