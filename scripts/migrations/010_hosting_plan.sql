INSERT INTO app.subscription_plans (
  id,
  name,
  price,
  monthly_limit,
  description,
  features,
  is_visible_to_operators,
  is_deprecated,
  created_at,
  updated_at
)
VALUES (
  'plan_hosting',
  'Hosting',
  20,
  1000,
  'Monthly hosting and maintenance for your site.',
  '["Site hosting", "Ongoing maintenance", "Intake, case queue, and scheduling stay online"]'::jsonb,
  true,
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    price = EXCLUDED.price,
    description = EXCLUDED.description,
    features = EXCLUDED.features,
    is_visible_to_operators = true,
    is_deprecated = false,
    updated_at = NOW();
