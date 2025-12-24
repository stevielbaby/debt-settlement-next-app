/**
 * Core type definitions for billing-kit
 * Zero dependencies on host app specifics
 */

// ============================================================================
// Logger Interface (optional injection by host app)
// ============================================================================

export interface Logger {
  info: (message: string, meta?: Record<string, any>) => void;
  warn: (message: string, meta?: Record<string, any>) => void;
  error: (message: string, meta?: Record<string, any>) => void;
  debug: (message: string, meta?: Record<string, any>) => void;
}

// No-op logger (default if none provided)
export const noopLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

// ============================================================================
// User Identity (from auth adapter)
// ============================================================================

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
}

// ============================================================================
// Billing Account (maps app user to Stripe customer)
// ============================================================================

export interface BillingAccount {
  id: string;
  user_id: string;
  email: string;
  stripe_customer_id: string;
  default_payment_method_id: string | null;
  currency: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBillingAccountInput {
  user_id: string;
  email: string;
  stripe_customer_id: string;
  default_payment_method_id?: string | null;
  currency?: string;
}

// ============================================================================
// Plan
// ============================================================================

export interface Plan {
  id: string;
  key: string; // e.g., 'starter', 'pro'
  name: string;
  description: string | null;
  stripe_product_id: string;
  stripe_price_id: string;
  interval: 'month' | 'year';
  unit_amount: number; // in cents
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePlanInput {
  key: string;
  name: string;
  description?: string | null;
  stripe_product_id: string;
  stripe_price_id: string;
  interval: 'month' | 'year';
  unit_amount: number;
  is_active?: boolean;
}

// ============================================================================
// Subscription (projection from Stripe)
// ============================================================================

export type SubscriptionStatus =
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'paused';

export interface Subscription {
  id: string;
  billing_account_id: string;
  stripe_subscription_id: string;
  status: SubscriptionStatus;
  current_plan_key: string | null;
  current_price_id: string | null;
  quantity: number;
  cancel_at_period_end: boolean;
  current_period_start: Date | null;
  current_period_end: Date | null;
  trial_start: Date | null;
  trial_end: Date | null;
  ended_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSubscriptionInput {
  billing_account_id: string;
  stripe_subscription_id: string;
  status: SubscriptionStatus;
  current_plan_key?: string | null;
  current_price_id?: string | null;
  quantity?: number;
  cancel_at_period_end?: boolean;
  current_period_start?: Date | null;
  current_period_end?: Date | null;
  trial_start?: Date | null;
  trial_end?: Date | null;
  ended_at?: Date | null;
}

export interface UpdateSubscriptionInput {
  status?: SubscriptionStatus;
  current_plan_key?: string | null;
  current_price_id?: string | null;
  quantity?: number;
  cancel_at_period_end?: boolean;
  current_period_start?: Date | null;
  current_period_end?: Date | null;
  trial_start?: Date | null;
  trial_end?: Date | null;
  ended_at?: Date | null;
}

// ============================================================================
// Invoice (projection from Stripe)
// ============================================================================

export type InvoiceStatus =
  | 'draft'
  | 'open'
  | 'paid'
  | 'uncollectible'
  | 'void';

export interface Invoice {
  id: string;
  billing_account_id: string;
  stripe_invoice_id: string;
  stripe_subscription_id: string | null;
  status: InvoiceStatus;
  currency: string;
  amount_due: number;
  amount_paid: number;
  amount_remaining: number;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  created_at: Date;
}

export interface CreateInvoiceInput {
  billing_account_id: string;
  stripe_invoice_id: string;
  stripe_subscription_id?: string | null;
  status: InvoiceStatus;
  currency: string;
  amount_due: number;
  amount_paid: number;
  amount_remaining: number;
  hosted_invoice_url?: string | null;
  invoice_pdf?: string | null;
}

// ============================================================================
// Stripe Event (idempotency tracking)
// ============================================================================

export interface StripeEvent {
  id: string;
  stripe_event_id: string;
  type: string;
  livemode: boolean;
  payload: Record<string, any>;
  processed: boolean;
  processing_error: string | null;
  created_at: Date;
  processed_at: Date | null;
}

export interface CreateStripeEventInput {
  stripe_event_id: string;
  type: string;
  livemode: boolean;
  payload: Record<string, any>;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CheckoutSessionRequest {
  price_id: string;
  success_url?: string;
  cancel_url?: string;
  trial_period_days?: number;
  metadata?: Record<string, string>;
}

export interface CheckoutSessionResponse {
  url: string;
  session_id: string;
}

export interface PortalSessionRequest {
  return_url?: string;
}

export interface PortalSessionResponse {
  url: string;
}

export interface SubscriptionResponse {
  subscription: Subscription | null;
  plan: Plan | null;
}

export interface InvoiceListResponse {
  invoices: Invoice[];
  has_more: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

export interface BillingConfig {
  stripe_secret_key: string;
  stripe_webhook_secret: string;
  billing_app_url: string;
  stripe_portal_configuration_id?: string;
  logger?: Logger;
}

// ============================================================================
// Entitlement Policy
// ============================================================================

export interface EntitlementPolicy {
  allowed_statuses: SubscriptionStatus[];
  grace_period_days?: number;
  grace_period_enabled?: boolean;
}
