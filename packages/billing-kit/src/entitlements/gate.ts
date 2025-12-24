/**
 * Entitlement Gate
 * Access control for subscription-based features
 */

import type { DBAdapter } from '../adapters/db-adapter';
import { SubscriptionError } from '../errors';
import { findActiveSubscriptionByUserId } from '../db/queries';
import { getEntitlementPolicy } from './policy';
import type { Logger } from '../types';

/**
 * Require active subscription for current user
 * Throws SubscriptionError if user doesn't have valid subscription
 */
export async function requireActiveSubscription(
  db: DBAdapter,
  userId: string,
  logger?: Logger
): Promise<void> {
  const policy = getEntitlementPolicy();

  // Find subscription
  const subscription = await findActiveSubscriptionByUserId(db, userId);

  if (!subscription) {
    logger?.warn('[billing-kit] Access denied: No subscription found', {
      userId,
    });
    throw new SubscriptionError('Active subscription required', {
      userId,
      reason: 'no_subscription',
    });
  }

  // Check status against policy
  if (!policy.allowed_statuses.includes(subscription.status)) {
    // Check grace period (if enabled)
    if (policy.grace_period_enabled && policy.grace_period_days) {
      const gracePeriodEnd = new Date(subscription.current_period_end || Date.now());
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + policy.grace_period_days);

      if (new Date() <= gracePeriodEnd) {
        logger?.info('[billing-kit] Access granted via grace period', {
          userId,
          subscriptionStatus: subscription.status,
          gracePeriodEnd,
        });
        return;
      }
    }

    logger?.warn('[billing-kit] Access denied: Invalid subscription status', {
      userId,
      status: subscription.status,
      allowedStatuses: policy.allowed_statuses,
    });

    throw new SubscriptionError('Active subscription required', {
      userId,
      status: subscription.status,
      reason: 'invalid_status',
    });
  }

  logger?.debug('[billing-kit] Access granted', {
    userId,
    subscriptionStatus: subscription.status,
  });
}

/**
 * Check subscription access without throwing
 * Returns true if user has valid subscription, false otherwise
 */
export async function checkSubscriptionAccess(
  db: DBAdapter,
  userId: string,
  logger?: Logger
): Promise<boolean> {
  try {
    await requireActiveSubscription(db, userId, logger);
    return true;
  } catch (error) {
    if (error instanceof SubscriptionError) {
      return false;
    }
    throw error; // Re-throw non-subscription errors
  }
}
