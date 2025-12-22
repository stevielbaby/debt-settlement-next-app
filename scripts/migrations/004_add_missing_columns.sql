-- Migration 004: Add missing columns to fix runtime errors
-- Fixes: users.organization_id, organizations.stripe_customer_id, app.invoices table

BEGIN;

-- 1) Add organization_id to users table (referenced by webmaster API)
ALTER TABLE app.users
  ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Backfill organization_id from org_id
UPDATE app.users
SET organization_id = org_id
WHERE organization_id IS NULL AND org_id IS NOT NULL;

-- 2) Add stripe_customer_id to organizations table (needed for Stripe integration)
ALTER TABLE app.organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- 3) Create invoices table if it doesn't exist (needed for billing page)
CREATE TABLE IF NOT EXISTS app.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES app.organizations(id),
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'canceled')),
  issue_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_date TIMESTAMP NOT NULL,
  paid_date TIMESTAMP,
  stripe_invoice_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on invoices
CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON app.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON app.invoices(status);

COMMIT;

-- Verification queries:
-- SELECT column_name FROM information_schema.columns WHERE table_schema='app' AND table_name='users' AND column_name='organization_id';
-- SELECT column_name FROM information_schema.columns WHERE table_schema='app' AND table_name='organizations' AND column_name='stripe_customer_id';
-- SELECT table_name FROM information_schema.tables WHERE table_schema='app' AND table_name='invoices';
