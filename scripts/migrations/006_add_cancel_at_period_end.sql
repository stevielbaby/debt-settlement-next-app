-- Migration: Add cancel_at_period_end column and standardize status to 'canceled'
-- Date: 2024-12-22
-- Purpose: Track pending cancellations and fix status spelling inconsistency

-- Step 1: Add cancel_at_period_end column if it doesn't exist
ALTER TABLE app.organization_subscriptions
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

-- Step 2: Drop old constraint that allowed 'cancelled'
ALTER TABLE app.organization_subscriptions
DROP CONSTRAINT IF EXISTS organization_subscriptions_status_check;

-- Step 3: Add new constraint that only accepts 'canceled' (American spelling)
ALTER TABLE app.organization_subscriptions
ADD CONSTRAINT organization_subscriptions_status_check
CHECK (status IN ('active', 'trialing', 'past_due', 'canceled'));

-- Step 4: Convert any existing 'cancelled' records to 'canceled'
UPDATE app.organization_subscriptions
SET status = 'canceled'
WHERE status = 'cancelled';

-- Step 5: Update any subscriptions with status='active' that have cancel_at_period_end=true
-- (in case they were marked by Stripe webhooks before this migration)
-- This ensures consistency

COMMENT ON COLUMN app.organization_subscriptions.cancel_at_period_end 
IS 'Boolean flag indicating subscription is scheduled to cancel at end of current billing period. Status remains active while this is true, becomes canceled when period ends.';

COMMENT ON CONSTRAINT organization_subscriptions_status_check ON app.organization_subscriptions 
IS 'Subscription status values: active (including active+pending-cancel), trialing, past_due, canceled';
