/**
 * API Handler: Get Subscription
 * Retrieves current active subscription for user
 */

import type { AuthAdapter } from '../adapters/auth-adapter';
import type { DBAdapter } from '../adapters/db-adapter';
import { BillingConfig, SubscriptionResponse } from '../types';
import {
  findActiveSubscriptionByUserId,
  findPlanByKey,
} from '../db/queries';

export interface GetSubscriptionParams {
  authAdapter: AuthAdapter;
  dbAdapter: DBAdapter;
  config: BillingConfig;
}

/**
 * Get current subscription for authenticated user
 * Returns null if no active subscription
 */
export async function getSubscription(
  params: GetSubscriptionParams
): Promise<SubscriptionResponse> {
  const { authAdapter, dbAdapter, config } = params;
  const logger = config.logger;

  // Get current user
  const user = await authAdapter.requireUser();

  // Find active subscription
  const subscription = await findActiveSubscriptionByUserId(dbAdapter, user.id);

  if (!subscription) {
    logger?.debug('[billing-kit] No active subscription found', {
      userId: user.id,
    });
    return {
      subscription: null,
      plan: null,
    };
  }

  // Find associated plan
  const plan = subscription.current_plan_key
    ? await findPlanByKey(dbAdapter, subscription.current_plan_key)
    : null;

  logger?.info('[billing-kit] Retrieved subscription', {
    userId: user.id,
    subscriptionId: subscription.id,
    status: subscription.status,
    planKey: plan?.key,
  });

  return {
    subscription,
    plan,
  };
}
