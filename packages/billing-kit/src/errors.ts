/**
 * Custom error classes for billing-kit
 * All errors extend base BillingError for easy catching
 */

export class BillingError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly metadata?: Record<string, any>;

  constructor(
    message: string,
    code: string = 'BILLING_ERROR',
    statusCode: number = 500,
    metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'BillingError';
    this.code = code;
    this.statusCode = statusCode;
    this.metadata = metadata;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Webhook processing errors (signature verification, idempotency, handler failures)
 */
export class WebhookProcessingError extends BillingError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 'WEBHOOK_PROCESSING_ERROR', 400, metadata);
    this.name = 'WebhookProcessingError';
  }
}

/**
 * Subscription-related errors (not found, invalid status, entitlement checks)
 */
export class SubscriptionError extends BillingError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 'SUBSCRIPTION_ERROR', 403, metadata);
    this.name = 'SubscriptionError';
  }
}

/**
 * Customer/account errors (not found, creation failures)
 */
export class CustomerError extends BillingError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 'CUSTOMER_ERROR', 400, metadata);
    this.name = 'CustomerError';
  }
}

/**
 * Database operation errors
 */
export class DatabaseError extends BillingError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 'DATABASE_ERROR', 500, metadata);
    this.name = 'DatabaseError';
  }
}

/**
 * Configuration errors (missing env vars, invalid settings)
 */
export class ConfigurationError extends BillingError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 'CONFIGURATION_ERROR', 500, metadata);
    this.name = 'ConfigurationError';
  }
}

/**
 * Stripe API errors (wraps Stripe SDK errors)
 */
export class StripeApiError extends BillingError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 'STRIPE_API_ERROR', 500, metadata);
    this.name = 'StripeApiError';
  }
}
