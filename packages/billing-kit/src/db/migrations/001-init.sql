-- ============================================================================
-- Billing Kit Database Schema
-- Migration 001: Initialize core billing tables
-- ============================================================================
-- Compatible with Neon Postgres (PostgreSQL 15+)
-- Run this migration in your host app's database
-- ============================================================================

BEGIN;

-- ============================================================================
-- Table: billing_accounts
-- Maps app users to Stripe customers (1:1 relationship)
-- ============================================================================

CREATE TABLE IF NOT EXISTS billing_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,  -- References host app's user identifier
    email TEXT NOT NULL,            -- User email (synced from app auth)
    stripe_customer_id TEXT NOT NULL UNIQUE, -- Stripe Customer ID
    default_payment_method_id TEXT, -- Stripe PaymentMethod ID (nullable)
    currency TEXT NOT NULL DEFAULT 'usd',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_billing_accounts_user_id ON billing_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_accounts_stripe_customer_id ON billing_accounts(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_billing_accounts_email ON billing_accounts(email);

-- ============================================================================
-- Table: plans
-- Subscription plan catalog (seeded by host app)
-- ============================================================================

CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,       -- Unique plan identifier (e.g., 'starter', 'pro')
    name TEXT NOT NULL,             -- Display name
    description TEXT,               -- Marketing description
    stripe_product_id TEXT NOT NULL, -- Stripe Product ID
    stripe_price_id TEXT NOT NULL UNIQUE, -- Stripe Price ID
    interval TEXT NOT NULL CHECK (interval IN ('month', 'year')),
    unit_amount INTEGER NOT NULL,   -- Price in cents
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_plans_key ON plans(key);
CREATE INDEX IF NOT EXISTS idx_plans_stripe_price_id ON plans(stripe_price_id);
CREATE INDEX IF NOT EXISTS idx_plans_is_active ON plans(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- Table: subscriptions
-- Subscription projections from Stripe (cached for fast reads)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    billing_account_id UUID NOT NULL REFERENCES billing_accounts(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT NOT NULL UNIQUE, -- Stripe Subscription ID
    status TEXT NOT NULL CHECK (status IN (
        'incomplete',
        'incomplete_expired',
        'trialing',
        'active',
        'past_due',
        'canceled',
        'unpaid'
    )),
    current_plan_key TEXT,          -- References plans.key (nullable for flexibility)
    current_price_id TEXT,          -- Stripe Price ID (for portability)
    quantity INTEGER NOT NULL DEFAULT 1,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,           -- Set when subscription ends
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_account_id ON subscriptions(billing_account_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_plan_key ON subscriptions(current_plan_key);

-- Index for active subscription lookup (most common query)
CREATE INDEX IF NOT EXISTS idx_subscriptions_active_by_account 
    ON subscriptions(billing_account_id, status) 
    WHERE status IN ('active', 'trialing');

-- ============================================================================
-- Table: invoices
-- Invoice projections from Stripe (for display and record-keeping)
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    billing_account_id UUID NOT NULL REFERENCES billing_accounts(id) ON DELETE CASCADE,
    stripe_invoice_id TEXT NOT NULL UNIQUE, -- Stripe Invoice ID
    stripe_subscription_id TEXT,    -- May be null for one-time charges
    status TEXT NOT NULL CHECK (status IN (
        'draft',
        'open',
        'paid',
        'uncollectible',
        'void'
    )),
    currency TEXT NOT NULL DEFAULT 'usd',
    amount_due INTEGER NOT NULL,    -- Total amount in cents
    amount_paid INTEGER NOT NULL,   -- Amount paid in cents
    amount_remaining INTEGER NOT NULL, -- Remaining balance in cents
    hosted_invoice_url TEXT,        -- Stripe-hosted invoice page
    invoice_pdf TEXT,               -- PDF download URL
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_billing_account_id ON invoices(billing_account_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_subscription_id ON invoices(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Index for recent invoices by account
CREATE INDEX IF NOT EXISTS idx_invoices_by_account_created 
    ON invoices(billing_account_id, created_at DESC);

-- ============================================================================
-- Table: stripe_events
-- Webhook event idempotency tracking and audit log
-- ============================================================================

CREATE TABLE IF NOT EXISTS stripe_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT NOT NULL UNIQUE, -- Stripe Event ID (idempotency key)
    type TEXT NOT NULL,             -- Event type (e.g., 'customer.subscription.updated')
    livemode BOOLEAN NOT NULL,      -- true = production, false = test mode
    payload JSONB NOT NULL,         -- Full event payload from Stripe
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    processing_error TEXT,          -- Error message if processing failed
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ        -- Timestamp when successfully processed
);

-- Indexes for idempotency checks and debugging
CREATE INDEX IF NOT EXISTS idx_stripe_events_stripe_event_id ON stripe_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON stripe_events(type);
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed ON stripe_events(processed) WHERE processed = FALSE;
CREATE INDEX IF NOT EXISTS idx_stripe_events_created_at ON stripe_events(created_at DESC);

-- ============================================================================
-- Table: notifications
-- System notifications for webmasters (new operator subscriptions, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,                        -- Notification type ('operator_subscribed', etc.)
    title TEXT NOT NULL,                       -- Notification title
    message TEXT NOT NULL,                     -- Notification message
    data JSONB,                                -- Additional data (operator_id, organization_id, etc.)
    read BOOLEAN NOT NULL DEFAULT FALSE,       -- Whether webmaster has read it
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ                        -- When it was read
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================================
-- Update Triggers (auto-update updated_at timestamps)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_billing_accounts_updated_at
    BEFORE UPDATE ON billing_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plans_updated_at
    BEFORE UPDATE ON plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments (documentation for future developers)
-- ============================================================================

COMMENT ON TABLE billing_accounts IS 'Maps application users to Stripe customers (1:1 relationship)';
COMMENT ON TABLE plans IS 'Subscription plan catalog seeded by host application';
COMMENT ON TABLE subscriptions IS 'Cached subscription projections from Stripe webhooks';
COMMENT ON TABLE invoices IS 'Cached invoice projections from Stripe webhooks';
COMMENT ON TABLE stripe_events IS 'Webhook event log for idempotency and debugging';

COMMIT;
