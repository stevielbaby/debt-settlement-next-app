ALTER TABLE app.organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

UPDATE app.subscription_plans
SET description = 'Monthly hosting and maintenance for your site.',
    features = '["Site hosting", "Ongoing maintenance", "Intake, case queue, and scheduling stay online"]'::jsonb,
    updated_at = NOW()
WHERE id = 'plan_pro'
  AND description IS NULL;
