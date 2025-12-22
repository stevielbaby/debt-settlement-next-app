BEGIN;

-- 1) organizations: add expected columns and backfill
ALTER TABLE app.organizations
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;

UPDATE app.organizations
SET
  name = COALESCE(name, firm_name),
  email = COALESCE(email, contact_email),
  contact_name = COALESCE(contact_name, firm_name),
  phone = COALESCE(phone, contact_phone)
WHERE (name IS NULL OR email IS NULL OR contact_name IS NULL OR phone IS NULL);

-- 2) subscription_plans: add expected columns and backfill
ALTER TABLE app.subscription_plans
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS monthly_limit INTEGER,
  ADD COLUMN IF NOT EXISTS features TEXT[],
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN;

UPDATE app.subscription_plans
SET
  name = COALESCE(name, plan_name),
  price = COALESCE(price, monthly_price_cents / 100.0),
  monthly_limit = COALESCE(monthly_limit, email_limit_monthly, api_request_limit),
  features = COALESCE(features, ARRAY[]::TEXT[]),
  is_active = COALESCE(is_active, active)
WHERE (name IS NULL OR price IS NULL OR monthly_limit IS NULL OR features IS NULL OR is_active IS NULL);

-- 3) organization_subscriptions: add expected columns and backfill
ALTER TABLE app.organization_subscriptions
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP;

UPDATE app.organization_subscriptions
SET
  organization_id = COALESCE(organization_id, org_id),
  current_period_start = COALESCE(current_period_start, billing_cycle_start),
  current_period_end = COALESCE(current_period_end, billing_cycle_end)
WHERE (organization_id IS NULL OR current_period_start IS NULL OR current_period_end IS NULL);

COMMIT;

-- Verification
-- SELECT column_name FROM information_schema.columns WHERE table_schema='app' AND table_name='organizations' AND column_name IN ('name','email');
-- SELECT column_name FROM information_schema.columns WHERE table_schema='app' AND table_name='subscription_plans' AND column_name IN ('name','price','monthly_limit','features','is_active');
-- SELECT column_name FROM information_schema.columns WHERE table_schema='app' AND table_name='organization_subscriptions' AND column_name IN ('organization_id','current_period_start','current_period_end');