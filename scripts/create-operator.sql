-- Create test organization for operator
INSERT INTO app.organizations (firm_name, contact_email, contact_phone, status, subscription_status)
VALUES (
  'Test Operator Firm',
  'operator@test.com',
  '(555) 123-4567',
  'active',
  'active'
) ON CONFLICT DO NOTHING;

-- Create test operator user (password: 'operator123' - CHANGE THIS!)
-- Password hash for 'operator123' using bcrypt
INSERT INTO app.users (email, password_hash, name, role, org_id, status)
SELECT 
  'operator@strattondefense.com',
  '$2a$10$M2kXGpDQqL5q.4YpZnY7e.6QZv5qZpOJQZvN9qZwvN8qZvN9qZvN',
  'Test Operator',
  'operator',
  id,
  'active'
FROM app.organizations
WHERE firm_name = 'Test Operator Firm'
ON CONFLICT DO NOTHING;
