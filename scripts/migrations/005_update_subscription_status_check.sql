-- Migration: Update subscription status check to accept both 'canceled' and 'cancelled'
-- Date: 2024-12-22
-- Purpose: Allow both US and UK spellings of canceled/cancelled status

-- Drop the existing check constraint
ALTER TABLE app.organization_subscriptions 
DROP CONSTRAINT IF EXISTS organization_subscriptions_status_check;

-- Add new check constraint that accepts both spellings
ALTER TABLE app.organization_subscriptions 
ADD CONSTRAINT organization_subscriptions_status_check 
CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'cancelled'));

-- Update any 'cancelled' (British spelling) to 'canceled' (US spelling) for consistency
-- This ensures all records use the same spelling going forward
UPDATE app.organization_subscriptions 
SET status = 'canceled' 
WHERE status = 'cancelled';

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT organization_subscriptions_status_check ON app.organization_subscriptions 
IS 'Accepts both canceled and cancelled spellings for compatibility with Stripe webhooks and API';
