-- Login reads and writes app.users.password_hash only.
-- Older databases stored the bcrypt hash in app.users.password.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'app'
      AND table_name = 'users'
      AND column_name = 'password'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'app'
      AND table_name = 'users'
      AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE app.users RENAME COLUMN password TO password_hash;
  END IF;
END $$;
