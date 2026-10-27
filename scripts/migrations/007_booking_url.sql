ALTER TABLE app.calendar_settings
  ADD COLUMN IF NOT EXISTS booking_url text;
