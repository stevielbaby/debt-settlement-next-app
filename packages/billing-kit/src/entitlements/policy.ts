/**
 * Entitlement Policy
 * Defines rules for subscription access control
 */

import { EntitlementPolicy, SubscriptionStatus } from '../types';

/**
 * Default entitlement policy
 * Host app can customize by setting environment variables or providing config
 */
const DEFAULT_POLICY: EntitlementPolicy = {
  // Allow access if subscription is active or in trial
  allowed_statuses: ['active', 'trialing'] as SubscriptionStatus[],

  // Grace period (disabled by default)
  grace_period_enabled: process.env.BILLING_GRACE_PERIOD_ENABLED === 'true',
  grace_period_days: process.env.BILLING_GRACE_PERIOD_DAYS
    ? parseInt(process.env.BILLING_GRACE_PERIOD_DAYS, 10)
    : 3,
};

/**
 * Get entitlement policy
 * Can be customized by host app
 */
export function getEntitlementPolicy(
  customPolicy?: Partial<EntitlementPolicy>
): EntitlementPolicy {
  return {
    ...DEFAULT_POLICY,
    ...customPolicy,
  };
}

/**
 * Check if a subscription status is considered "active"
 */
export function isActiveStatus(
  status: SubscriptionStatus,
  policy?: EntitlementPolicy
): boolean {
  const effectivePolicy = policy || DEFAULT_POLICY;
  return effectivePolicy.allowed_statuses.includes(status);
}

/**
 * Common policy presets
 */
export const POLICY_PRESETS = {
  /**
   * Strict: Only active subscriptions allowed (no trial, no grace period)
   */
  strict: {
    allowed_statuses: ['active'] as SubscriptionStatus[],
    grace_period_enabled: false,
  },

  /**
   * Lenient: Allow active, trialing, and past_due (with grace period)
   */
  lenient: {
    allowed_statuses: ['active', 'trialing', 'past_due'] as SubscriptionStatus[],
    grace_period_enabled: true,
    grace_period_days: 7,
  },

  /**
   * Trial-friendly: Allow active and trialing
   */
  trial_friendly: {
    allowed_statuses: ['active', 'trialing'] as SubscriptionStatus[],
    grace_period_enabled: false,
  },
};
