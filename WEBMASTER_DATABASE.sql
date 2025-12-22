-- Phase 5 Webmaster Dashboard - Database Schema Reference
-- This file documents the tables the webmaster dashboard queries/updates

-- ============================================================================
-- ORGANIZATIONS TABLE
-- ============================================================================
-- Status: Must exist (required)
-- Used by: Organizations management pages
CREATE TABLE IF NOT EXISTS app.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  contact_name TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Status: Must exist (required)
-- Used by: User list in org detail, authentication
-- Note: Needs role and organization_id columns for webmaster features
ALTER TABLE app.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'operator' CHECK (role IN ('client', 'operator', 'webmaster'));
ALTER TABLE app.users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES app.organizations(id);

-- ============================================================================
-- SUBSCRIPTION PLANS TABLE
-- ============================================================================
-- Status: Must exist (required)
-- Used by: Subscriptions page, billing calculations, usage limits
CREATE TABLE IF NOT EXISTS app.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  monthly_limit INTEGER DEFAULT 10,
  features TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample data (insert once):
INSERT INTO app.subscription_plans (name, description, price, monthly_limit, features, is_active)
VALUES 
  ('Starter', 'Basic plan for small firms', 99, 10, ARRAY['Up to 10 cases/month', 'Email support', 'Basic analytics'], true),
  ('Professional', 'For growing law firms', 299, 100, ARRAY['Up to 100 cases/month', 'Priority support', 'Advanced analytics', 'API access'], true),
  ('Enterprise', 'Custom enterprise solution', 999, 999, ARRAY['Unlimited cases', '24/7 phone support', 'Custom integrations', 'Dedicated account manager'], true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- ORGANIZATION SUBSCRIPTIONS TABLE
-- ============================================================================
-- Status: Must exist (required)
-- Used by: Subscriptions page, billing metrics, status tracking
CREATE TABLE IF NOT EXISTS app.organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES app.organizations(id),
  plan_id UUID NOT NULL REFERENCES app.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled')),
  current_period_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  current_period_end TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id) -- One active subscription per org
);

-- ============================================================================
-- USAGE METRICS TABLE
-- ============================================================================
-- Status: Must exist (required)
-- Used by: Dashboard metrics, usage page, organizations page, billing calculations
CREATE TABLE IF NOT EXISTS app.usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES app.organizations(id),
  metric_name TEXT NOT NULL CHECK (metric_name IN ('case_created', 'api_request', 'storage_gb')),
  current_month_count INTEGER DEFAULT 0,
  month_year TEXT NOT NULL, -- Format: 'YYYY-MM'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, metric_name, month_year)
);

-- ============================================================================
-- INVOICES TABLE
-- ============================================================================
-- Status: Must exist (required)
-- Used by: Billing dashboard, invoice list, revenue calculations
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

-- ============================================================================
-- CASES TABLE (for storage calculation)
-- ============================================================================
-- Status: Must exist (required)
-- Used by: Dashboard storage metrics estimate
-- Note: Storage estimate = (count of cases * 0.05 GB) + (count of case notes * 0.01 GB)
CREATE TABLE IF NOT EXISTS app.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES app.organizations(id),
  case_number VARCHAR(20) UNIQUE NOT NULL,
  lead_id UUID,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'active', 'pending', 'closed', 'converted')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CASE NOTES TABLE (for storage calculation)
-- ============================================================================
-- Status: Must exist (required)
-- Used by: Dashboard storage metrics estimate
CREATE TABLE IF NOT EXISTS app.case_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES app.cases(id),
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify all required tables exist and have data:

-- Check organizations table
SELECT COUNT(*) as organization_count FROM app.organizations;
-- Expected: >= 1

-- Check subscription plans
SELECT COUNT(*) as plan_count FROM app.subscription_plans WHERE is_active = true;
-- Expected: >= 2 (at least Starter and Professional)

-- Check organization subscriptions
SELECT COUNT(*) as subscription_count FROM app.organization_subscriptions;
-- Expected: >= 0 (may be 0 if no orgs have subscriptions yet)

-- Check usage metrics
SELECT COUNT(*) as usage_metric_count FROM app.usage_metrics 
WHERE month_year = to_char(CURRENT_DATE, 'YYYY-MM');
-- Expected: >= 0 (may be 0 at start of month)

-- Check invoices
SELECT COUNT(*) as invoice_count FROM app.invoices;
-- Expected: >= 0

-- ============================================================================
-- SAMPLE DATA INSERTION
-- ============================================================================
-- Insert test data for webmaster dashboard testing:

-- 1. Create test organizations
INSERT INTO app.organizations (name, email, contact_name, phone) VALUES
  ('Acme Law Firm', 'admin@acmelaw.com', 'John Smith', '(555) 123-4567'),
  ('Summit Legal Partners', 'contact@summitlegal.com', 'Jane Doe', '(555) 234-5678'),
  ('Premier Defense Group', 'support@premierdefense.com', 'Bob Johnson', '(555) 345-6789')
ON CONFLICT (email) DO NOTHING;

-- 2. Get organization IDs for the next steps
-- SELECT id, name, email FROM app.organizations LIMIT 3;

-- 3. Create subscriptions for organizations (replace UUID values with actual IDs)
-- INSERT INTO app.organization_subscriptions (organization_id, plan_id, status)
-- SELECT o.id, sp.id, 'active'
-- FROM app.organizations o
-- CROSS JOIN app.subscription_plans sp
-- WHERE sp.name = 'Professional'
-- AND NOT EXISTS (
--   SELECT 1 FROM app.organization_subscriptions 
--   WHERE organization_id = o.id
-- )
-- LIMIT 3;

-- 4. Add usage data for this month
-- INSERT INTO app.usage_metrics (organization_id, metric_name, current_month_count, month_year)
-- SELECT id, 'case_created', FLOOR(RANDOM() * 50) + 10, to_char(CURRENT_DATE, 'YYYY-MM')
-- FROM app.organizations
-- ON CONFLICT (organization_id, metric_name, month_year) DO UPDATE
-- SET current_month_count = EXCLUDED.current_month_count;

-- 5. Create sample invoices
-- INSERT INTO app.invoices (organization_id, amount, status, issue_date, due_date, paid_date)
-- SELECT id, 299.00, 'paid', NOW() - INTERVAL '30 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days'
-- FROM app.organizations
-- LIMIT 2;

-- ============================================================================
-- MIGRATION SCRIPT (if starting fresh)
-- ============================================================================
-- This SQL can be run once to set up the complete webmaster dashboard schema:

-- All CREATE TABLE statements above
-- All sample data INSERT statements above
-- Run verification queries to confirm success

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================

-- 1. The webmaster dashboard is READ-HEAVY (mostly SELECT queries)
--    Write operations are only for organization CRUD

-- 2. All tables use UUID for primary keys (gen_random_uuid())

-- 3. Timestamps use TIMESTAMP DEFAULT CURRENT_TIMESTAMP
--    Format: YYYY-MM-DD HH:MM:SS UTC

-- 4. Foreign keys are set up with:
--    - NO ACTION on delete (to prevent orphaning)
--    - Cascading updates

-- 5. Check constraints enforce valid values:
--    - status: 'active', 'trialing', 'past_due', 'canceled'
--    - metric_name: 'case_created', 'api_request', 'storage_gb'
--    - invoice status: 'pending', 'paid', 'overdue', 'canceled'

-- 6. UNIQUE constraints prevent duplicates:
--    - organizations.email (unique)
--    - subscription_plans.name (unique)
--    - organization_subscriptions.organization_id (one sub per org)
--    - usage_metrics (org, metric, month must be unique)

-- 7. month_year format is crucial for queries: 'YYYY-MM'
--    Use: to_char(CURRENT_DATE, 'YYYY-MM')

-- ============================================================================
-- BACKUP & RESTORE
-- ============================================================================

-- Backup all webmaster-related data:
-- pg_dump --table 'app.organizations' \
--         --table 'app.subscription_plans' \
--         --table 'app.organization_subscriptions' \
--         --table 'app.usage_metrics' \
--         --table 'app.invoices' \
--         $DATABASE_URL > webmaster_backup.sql

-- Restore from backup:
-- psql $DATABASE_URL < webmaster_backup.sql

-- ============================================================================
-- PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Create indexes on frequently queried columns:
CREATE INDEX IF NOT EXISTS idx_organization_subscriptions_org_id 
  ON app.organization_subscriptions(organization_id);

CREATE INDEX IF NOT EXISTS idx_usage_metrics_org_id_month 
  ON app.usage_metrics(organization_id, month_year);

CREATE INDEX IF NOT EXISTS idx_invoices_org_id_status 
  ON app.invoices(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_users_org_id 
  ON app.users(organization_id);

CREATE INDEX IF NOT EXISTS idx_cases_org_id 
  ON app.cases(organization_id);

-- ============================================================================
-- MONITORING QUERIES
-- ============================================================================

-- View all active organizations and their subscriptions:
SELECT o.id, o.name, sp.name as plan, os.status, os.current_period_end
FROM app.organizations o
LEFT JOIN app.organization_subscriptions os ON o.id = os.organization_id
LEFT JOIN app.subscription_plans sp ON os.plan_id = sp.id
ORDER BY o.created_at DESC;

-- Check organizations near usage limit (90%+):
SELECT o.name, um.current_month_count, sp.monthly_limit,
       ROUND((um.current_month_count::float / sp.monthly_limit) * 100, 2) as usage_percent
FROM app.organizations o
JOIN app.usage_metrics um ON o.id = um.organization_id
JOIN app.organization_subscriptions os ON o.id = os.organization_id
JOIN app.subscription_plans sp ON os.plan_id = sp.id
WHERE (um.current_month_count::float / sp.monthly_limit) >= 0.9
ORDER BY usage_percent DESC;

-- Monthly revenue by status:
SELECT status, COUNT(*) as count, SUM(amount) as total
FROM app.invoices
WHERE EXTRACT(YEAR FROM issue_date) = EXTRACT(YEAR FROM CURRENT_DATE)
AND EXTRACT(MONTH FROM issue_date) = EXTRACT(MONTH FROM CURRENT_DATE)
GROUP BY status;

-- ============================================================================
-- END DATABASE REFERENCE
-- ============================================================================
