-- Migration 007: Add organization invite code for linking
-- Allows operators to join existing organizations via invite code instead of creating new ones

BEGIN;

-- Add invite_code column to organizations
ALTER TABLE app.organizations 
ADD COLUMN IF NOT EXISTS invite_code VARCHAR(20) UNIQUE;

-- Create index for faster lookups by invite code
CREATE INDEX IF NOT EXISTS idx_organizations_invite_code 
ON app.organizations(invite_code);

COMMIT;
