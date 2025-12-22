-- Migration to align database schema with webmaster dashboard expectations
-- Run this against your Neon database to add missing columns and tables

-- 1. Add missing columns to organizations table
ALTER TABLE app.organizations 
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;

-- Populate new columns from existing data
UPDATE app.organizations 
SET 
  name = firm_name,
  email = contact_email,
  contact_name = firm_name,
  phone = contact_phone
WHERE name IS NULL;

-- 2. Ensure subscription_plans has correct columns
ALTER TABLE app.subscription_plans
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS monthly_limit INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS features TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Populate new columns from existing data
UPDATE app.subscription_plans 
SET 
  name = plan_name,
  price = monthly_price_cents / 100.0,
  monthly_limit = COALESCE(email_limit_monthly, api_request_limit, 10),
  features = ARRAY['Feature placeholder']::TEXT[],
  is_active = COALESCE(active, true)
WHERE name IS NULL;

-- 3. Ensure organization_subscriptions has correct columns
ALTER TABLE app.organization_subscriptions
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP;

-- Populate new columns from existing data
UPDATE app.organization_subscriptions 
SET 
  organization_id = org_id,
  current_period_start = billing_cycle_start,
  current_period_end = billing_cycle_end
WHERE organization_id IS NULL;

-- 4. Create usage_metrics table if it doesn't have the right structure
CREATE TABLE IF NOT EXISTS app.usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES app.organizations(id),
  metric_name TEXT NOT NULL CHECK (metric_name IN ('case_created', 'api_request', 'storage_gb')),
  current_month_count INTEGER DEFAULT 0,
  month_year TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, metric_name, month_year)
);

-- 5. Create invoices table if it doesn't exist
CREATE TABLE IF NOT EXISTS app.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES app.organizations(id),
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'canceled')),
  issue_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_date TIMESTAMP NOT NULL,
  paid_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Update users table to ensure it has organization_id reference
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'app' 
    AND table_name = 'users' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE app.users ADD COLUMN organization_id UUID REFERENCES app.organizations(id);
  END IF;
END $$;

-- 7. Ensure org_id column exists in users table for backwards compatibility
ALTER TABLE app.users 
  ADD COLUMN IF NOT EXISTS org_id UUID;

-- Sync org_id with organization_id if not set
UPDATE app.users 
SET org_id = organization_id 
WHERE org_id IS NULL AND organization_id IS NOT NULL;

UPDATE app.users 
SET organization_id = org_id 
WHERE organization_id IS NULL AND org_id IS NOT NULL;

COMMIT;

-- Verification queries
SELECT 'Organizations with new columns' as check_name, COUNT(*) as count FROM app.organizations WHERE name IS NOT NULL;
SELECT 'Subscription plans with new columns' as check_name, COUNT(*) as count FROM app.subscription_plans WHERE name IS NOT NULL;
SELECT 'Organization subscriptions with organization_id' as check_name, COUNT(*) as count FROM app.organization_subscriptions WHERE organization_id IS NOT NULL;
