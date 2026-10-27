-- Submissions live in app.leads. This flag hides a lead after it becomes a case.
ALTER TABLE app.leads
  ADD COLUMN IF NOT EXISTS converted boolean NOT NULL DEFAULT false;
