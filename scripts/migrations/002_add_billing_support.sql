-- Migration 002: Add billing period support and payment methods table
-- Date: 2025-12-22

-- 1. Add yearly_stripe_price_id to subscription_plans
ALTER TABLE app.subscription_plans
ADD COLUMN IF NOT EXISTS yearly_stripe_price_id VARCHAR(255);

-- 2. Add billing_period to organization_subscriptions  
ALTER TABLE app.organization_subscriptions
ADD COLUMN IF NOT EXISTS billing_period VARCHAR(10) DEFAULT 'month';

-- 3. Create payment_methods table
CREATE TABLE IF NOT EXISTS app.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'card' or 'ach'
  card_last_four VARCHAR(4),
  card_brand VARCHAR(50),
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  ach_last_four VARCHAR(4),
  ach_routing_number_last_four VARCHAR(4),
  billing_address_line1 VARCHAR(255),
  billing_address_line2 VARCHAR(255),
  billing_address_city VARCHAR(255),
  billing_address_state VARCHAR(2),
  billing_address_zip VARCHAR(10),
  billing_address_country VARCHAR(2),
  is_default BOOLEAN DEFAULT FALSE,
  is_valid BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Create indexes for payment_methods
CREATE INDEX IF NOT EXISTS idx_payment_methods_org_id ON app.payment_methods(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe_id ON app.payment_methods(stripe_payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON app.payment_methods(organization_id, is_default) WHERE deleted_at IS NULL;

-- 4. Add columns to invoices if not exists
ALTER TABLE app.invoices
ADD COLUMN IF NOT EXISTS billing_period_start TIMESTAMP,
ADD COLUMN IF NOT EXISTS billing_period_end TIMESTAMP,
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS line_items JSONB,
ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS attempted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS next_retry_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Create indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_org_status ON app.invoices(organization_id, status) WHERE status IN ('open', 'pending', 'past_due');
CREATE INDEX IF NOT EXISTS idx_invoices_org_date ON app.invoices(organization_id, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_id ON app.invoices(stripe_invoice_id);

-- 5. Create billing_events table (audit trail)
CREATE TABLE IF NOT EXISTS app.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  stripe_event_id VARCHAR(255) UNIQUE,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for billing_events
CREATE INDEX IF NOT EXISTS idx_billing_events_org_id ON app.billing_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_type ON app.billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_date ON app.billing_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_events_stripe_id ON app.billing_events(stripe_event_id);

-- 6. Create webhook_events table for idempotency (if not exists)
CREATE TABLE IF NOT EXISTS app.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(50),
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for webhook_events
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id ON app.webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON app.webhook_events(processed);
