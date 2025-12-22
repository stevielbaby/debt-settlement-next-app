-- Migration 005: Add Stripe columns for plans and subscriptions

BEGIN;

-- 1) subscription_plans: add Stripe IDs and updated_at used by code
ALTER TABLE app.subscription_plans
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 2) organization_subscriptions: add Stripe subscription and price IDs
ALTER TABLE app.organization_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

COMMIT;

-- Verification
-- SELECT column_name FROM information_schema.columns WHERE table_schema='app' AND table_name='subscription_plans' AND column_name IN ('stripe_product_id','stripe_price_id','updated_at');
-- SELECT column_name FROM information_schema.columns WHERE table_schema='app' AND table_name='organization_subscriptions' AND column_name IN ('stripe_subscription_id','stripe_price_id');
