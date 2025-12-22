-- Migration 006: Add webhook_events table for idempotency/deduplication
-- Prevents duplicate Stripe webhook events from being processed multiple times

BEGIN;

-- Create webhook_events table for tracking processed events
CREATE TABLE IF NOT EXISTS app.webhook_events (
  id SERIAL PRIMARY KEY,
  stripe_event_id VARCHAR(255) NOT NULL UNIQUE,
  event_type VARCHAR(255) NOT NULL,
  organization_id VARCHAR(255),
  processed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index on stripe_event_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_event_id 
  ON app.webhook_events(stripe_event_id);

-- Create index on organization_id for filtering by organization
CREATE INDEX IF NOT EXISTS idx_webhook_events_organization_id 
  ON app.webhook_events(organization_id);

-- Create index on event_type for debugging
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type 
  ON app.webhook_events(event_type);

COMMIT;
