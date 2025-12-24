/**
 * Database query layer for billing-kit
 * All queries use the DB adapter interface (no direct dependencies)
 */

import type { DBAdapter } from '../adapters/db-adapter';
import { DatabaseError } from '../errors';
import type {
  BillingAccount,
  CreateBillingAccountInput,
  Plan,
  CreatePlanInput,
  Subscription,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  Invoice,
  CreateInvoiceInput,
  StripeEvent,
  CreateStripeEventInput,
} from '../types';

// ============================================================================
// Billing Accounts
// ============================================================================

export async function findBillingAccountByUserId(
  db: DBAdapter,
  userId: string
): Promise<BillingAccount | null> {
  try {
    const result = await db.query<BillingAccount>(
      'SELECT * FROM billing_accounts WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    return result.rows[0] || null;
  } catch (error: any) {
    throw new DatabaseError('Failed to find billing account by user ID', {
      userId,
      error: error.message,
    });
  }
}

export async function findBillingAccountByStripeCustomerId(
  db: DBAdapter,
  stripeCustomerId: string
): Promise<BillingAccount | null> {
  try {
    const result = await db.query<BillingAccount>(
      'SELECT * FROM billing_accounts WHERE stripe_customer_id = $1 LIMIT 1',
      [stripeCustomerId]
    );
    return result.rows[0] || null;
  } catch (error: any) {
    throw new DatabaseError('Failed to find billing account by Stripe customer ID', {
      stripeCustomerId,
      error: error.message,
    });
  }
}

export async function createBillingAccount(
  db: DBAdapter,
  input: CreateBillingAccountInput
): Promise<BillingAccount> {
  try {
    const result = await db.query<BillingAccount>(
      `INSERT INTO billing_accounts (
        user_id, email, stripe_customer_id, default_payment_method_id, currency
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        input.user_id,
        input.email,
        input.stripe_customer_id,
        input.default_payment_method_id || null,
        input.currency || 'usd',
      ]
    );
    return result.rows[0];
  } catch (error: any) {
    throw new DatabaseError('Failed to create billing account', {
      input,
      error: error.message,
    });
  }
}

export async function updateBillingAccount(
  db: DBAdapter,
  userId: string,
  updates: Partial<Pick<BillingAccount, 'email' | 'default_payment_method_id'>>
): Promise<BillingAccount> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.email !== undefined) {
    setClauses.push(`email = $${paramIndex++}`);
    values.push(updates.email);
  }
  if (updates.default_payment_method_id !== undefined) {
    setClauses.push(`default_payment_method_id = $${paramIndex++}`);
    values.push(updates.default_payment_method_id);
  }

  if (setClauses.length === 0) {
    throw new DatabaseError('No fields to update');
  }

  values.push(userId);

  try {
    const result = await db.query<BillingAccount>(
      `UPDATE billing_accounts SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE user_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new DatabaseError('Billing account not found', { userId });
    }

    return result.rows[0];
  } catch (error: any) {
    throw new DatabaseError('Failed to update billing account', {
      userId,
      updates,
      error: error.message,
    });
  }
}

// ============================================================================
// Plans
// ============================================================================

export async function findPlanByKey(
  db: DBAdapter,
  key: string
): Promise<Plan | null> {
  try {
    const result = await db.query<Plan>(
      'SELECT * FROM plans WHERE key = $1 LIMIT 1',
      [key]
    );
    return result.rows[0] || null;
  } catch (error: any) {
    throw new DatabaseError('Failed to find plan by key', {
      key,
      error: error.message,
    });
  }
}

export async function findPlanByPriceId(
  db: DBAdapter,
  priceId: string
): Promise<Plan | null> {
  try {
    const result = await db.query<Plan>(
      'SELECT * FROM plans WHERE stripe_price_id = $1 LIMIT 1',
      [priceId]
    );
    return result.rows[0] || null;
  } catch (error: any) {
    throw new DatabaseError('Failed to find plan by price ID', {
      priceId,
      error: error.message,
    });
  }
}

export async function listActivePlans(db: DBAdapter): Promise<Plan[]> {
  try {
    const result = await db.query<Plan>(
      'SELECT * FROM plans WHERE is_active = TRUE ORDER BY unit_amount ASC'
    );
    return result.rows;
  } catch (error: any) {
    throw new DatabaseError('Failed to list active plans', {
      error: error.message,
    });
  }
}

export async function createPlan(
  db: DBAdapter,
  input: CreatePlanInput
): Promise<Plan> {
  try {
    const result = await db.query<Plan>(
      `INSERT INTO plans (
        key, name, description, stripe_product_id, stripe_price_id,
        interval, unit_amount, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (key) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        stripe_product_id = EXCLUDED.stripe_product_id,
        stripe_price_id = EXCLUDED.stripe_price_id,
        interval = EXCLUDED.interval,
        unit_amount = EXCLUDED.unit_amount,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
      RETURNING *`,
      [
        input.key,
        input.name,
        input.description || null,
        input.stripe_product_id,
        input.stripe_price_id,
        input.interval,
        input.unit_amount,
        input.is_active !== undefined ? input.is_active : true,
      ]
    );
    return result.rows[0];
  } catch (error: any) {
    throw new DatabaseError('Failed to create/update plan', {
      input,
      error: error.message,
    });
  }
}

// ============================================================================
// Subscriptions
// ============================================================================

export async function findActiveSubscriptionByUserId(
  db: DBAdapter,
  userId: string
): Promise<Subscription | null> {
  try {
    const result = await db.query<Subscription>(
      `SELECT s.* FROM subscriptions s
       INNER JOIN billing_accounts ba ON s.billing_account_id = ba.id
       WHERE ba.user_id = $1
       AND s.status IN ('active', 'trialing')
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  } catch (error: any) {
    throw new DatabaseError('Failed to find active subscription', {
      userId,
      error: error.message,
    });
  }
}

export async function findSubscriptionByStripeId(
  db: DBAdapter,
  stripeSubscriptionId: string
): Promise<Subscription | null> {
  try {
    const result = await db.query<Subscription>(
      'SELECT * FROM subscriptions WHERE stripe_subscription_id = $1 LIMIT 1',
      [stripeSubscriptionId]
    );
    return result.rows[0] || null;
  } catch (error: any) {
    throw new DatabaseError('Failed to find subscription by Stripe ID', {
      stripeSubscriptionId,
      error: error.message,
    });
  }
}

export async function createSubscription(
  db: DBAdapter,
  input: CreateSubscriptionInput
): Promise<Subscription> {
  try {
    const result = await db.query<Subscription>(
      `INSERT INTO subscriptions (
        billing_account_id, stripe_subscription_id, status,
        current_plan_key, current_price_id, quantity, cancel_at_period_end,
        current_period_start, current_period_end,
        trial_start, trial_end, ended_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        input.billing_account_id,
        input.stripe_subscription_id,
        input.status,
        input.current_plan_key || null,
        input.current_price_id || null,
        input.quantity || 1,
        input.cancel_at_period_end || false,
        input.current_period_start || null,
        input.current_period_end || null,
        input.trial_start || null,
        input.trial_end || null,
        input.ended_at || null,
      ]
    );
    return result.rows[0];
  } catch (error: any) {
    throw new DatabaseError('Failed to create subscription', {
      input,
      error: error.message,
    });
  }
}

export async function upsertSubscription(
  db: DBAdapter,
  input: CreateSubscriptionInput
): Promise<Subscription> {
  try {
    const result = await db.query<Subscription>(
      `INSERT INTO subscriptions (
        billing_account_id, stripe_subscription_id, status,
        current_plan_key, current_price_id, quantity, cancel_at_period_end,
        current_period_start, current_period_end,
        trial_start, trial_end, ended_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (stripe_subscription_id) DO UPDATE SET
        status = EXCLUDED.status,
        current_plan_key = EXCLUDED.current_plan_key,
        current_price_id = EXCLUDED.current_price_id,
        quantity = EXCLUDED.quantity,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        trial_start = EXCLUDED.trial_start,
        trial_end = EXCLUDED.trial_end,
        ended_at = EXCLUDED.ended_at,
        updated_at = NOW()
      RETURNING *`,
      [
        input.billing_account_id,
        input.stripe_subscription_id,
        input.status,
        input.current_plan_key || null,
        input.current_price_id || null,
        input.quantity || 1,
        input.cancel_at_period_end || false,
        input.current_period_start || null,
        input.current_period_end || null,
        input.trial_start || null,
        input.trial_end || null,
        input.ended_at || null,
      ]
    );
    return result.rows[0];
  } catch (error: any) {
    throw new DatabaseError('Failed to upsert subscription', {
      input,
      error: error.message,
    });
  }
}

export async function updateSubscription(
  db: DBAdapter,
  stripeSubscriptionId: string,
  updates: UpdateSubscriptionInput
): Promise<Subscription> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Build dynamic SET clause
  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }
  if (updates.current_plan_key !== undefined) {
    setClauses.push(`current_plan_key = $${paramIndex++}`);
    values.push(updates.current_plan_key);
  }
  if (updates.current_price_id !== undefined) {
    setClauses.push(`current_price_id = $${paramIndex++}`);
    values.push(updates.current_price_id);
  }
  if (updates.quantity !== undefined) {
    setClauses.push(`quantity = $${paramIndex++}`);
    values.push(updates.quantity);
  }
  if (updates.cancel_at_period_end !== undefined) {
    setClauses.push(`cancel_at_period_end = $${paramIndex++}`);
    values.push(updates.cancel_at_period_end);
  }
  if (updates.current_period_start !== undefined) {
    setClauses.push(`current_period_start = $${paramIndex++}`);
    values.push(updates.current_period_start);
  }
  if (updates.current_period_end !== undefined) {
    setClauses.push(`current_period_end = $${paramIndex++}`);
    values.push(updates.current_period_end);
  }
  if (updates.trial_start !== undefined) {
    setClauses.push(`trial_start = $${paramIndex++}`);
    values.push(updates.trial_start);
  }
  if (updates.trial_end !== undefined) {
    setClauses.push(`trial_end = $${paramIndex++}`);
    values.push(updates.trial_end);
  }
  if (updates.ended_at !== undefined) {
    setClauses.push(`ended_at = $${paramIndex++}`);
    values.push(updates.ended_at);
  }

  if (setClauses.length === 0) {
    throw new DatabaseError('No fields to update');
  }

  values.push(stripeSubscriptionId);

  try {
    const result = await db.query<Subscription>(
      `UPDATE subscriptions SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE stripe_subscription_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new DatabaseError('Subscription not found', { stripeSubscriptionId });
    }

    return result.rows[0];
  } catch (error: any) {
    throw new DatabaseError('Failed to update subscription', {
      stripeSubscriptionId,
      updates,
      error: error.message,
    });
  }
}

// ============================================================================
// Invoices
// ============================================================================

export async function findInvoiceByStripeId(
  db: DBAdapter,
  stripeInvoiceId: string
): Promise<Invoice | null> {
  try {
    const result = await db.query<Invoice>(
      'SELECT * FROM invoices WHERE stripe_invoice_id = $1 LIMIT 1',
      [stripeInvoiceId]
    );
    return result.rows[0] || null;
  } catch (error: any) {
    throw new DatabaseError('Failed to find invoice by Stripe ID', {
      stripeInvoiceId,
      error: error.message,
    });
  }
}

export async function listInvoicesByUserId(
  db: DBAdapter,
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<Invoice[]> {
  try {
    const result = await db.query<Invoice>(
      `SELECT i.* FROM invoices i
       INNER JOIN billing_accounts ba ON i.billing_account_id = ba.id
       WHERE ba.user_id = $1
       ORDER BY i.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  } catch (error: any) {
    throw new DatabaseError('Failed to list invoices', {
      userId,
      limit,
      offset,
      error: error.message,
    });
  }
}

export async function createInvoice(
  db: DBAdapter,
  input: CreateInvoiceInput
): Promise<Invoice> {
  try {
    const result = await db.query<Invoice>(
      `INSERT INTO invoices (
        billing_account_id, stripe_invoice_id, stripe_subscription_id,
        status, currency, amount_due, amount_paid, amount_remaining,
        hosted_invoice_url, invoice_pdf
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        input.billing_account_id,
        input.stripe_invoice_id,
        input.stripe_subscription_id || null,
        input.status,
        input.currency,
        input.amount_due,
        input.amount_paid,
        input.amount_remaining,
        input.hosted_invoice_url || null,
        input.invoice_pdf || null,
      ]
    );
    return result.rows[0];
  } catch (error: any) {
    throw new DatabaseError('Failed to create invoice', {
      input,
      error: error.message,
    });
  }
}

export async function upsertInvoice(
  db: DBAdapter,
  input: CreateInvoiceInput
): Promise<Invoice> {
  try {
    const result = await db.query<Invoice>(
      `INSERT INTO invoices (
        billing_account_id, stripe_invoice_id, stripe_subscription_id,
        status, currency, amount_due, amount_paid, amount_remaining,
        hosted_invoice_url, invoice_pdf
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (stripe_invoice_id) DO UPDATE SET
        status = EXCLUDED.status,
        amount_due = EXCLUDED.amount_due,
        amount_paid = EXCLUDED.amount_paid,
        amount_remaining = EXCLUDED.amount_remaining,
        hosted_invoice_url = EXCLUDED.hosted_invoice_url,
        invoice_pdf = EXCLUDED.invoice_pdf
      RETURNING *`,
      [
        input.billing_account_id,
        input.stripe_invoice_id,
        input.stripe_subscription_id || null,
        input.status,
        input.currency,
        input.amount_due,
        input.amount_paid,
        input.amount_remaining,
        input.hosted_invoice_url || null,
        input.invoice_pdf || null,
      ]
    );
    return result.rows[0];
  } catch (error: any) {
    throw new DatabaseError('Failed to upsert invoice', {
      input,
      error: error.message,
    });
  }
}

// ============================================================================
// Stripe Events (idempotency)
// ============================================================================

export async function findStripeEventById(
  db: DBAdapter,
  stripeEventId: string
): Promise<StripeEvent | null> {
  try {
    const result = await db.query<StripeEvent>(
      'SELECT * FROM stripe_events WHERE stripe_event_id = $1 LIMIT 1',
      [stripeEventId]
    );
    return result.rows[0] || null;
  } catch (error: any) {
    throw new DatabaseError('Failed to find Stripe event', {
      stripeEventId,
      error: error.message,
    });
  }
}

export async function createStripeEvent(
  db: DBAdapter,
  input: CreateStripeEventInput
): Promise<StripeEvent> {
  try {
    const result = await db.query<StripeEvent>(
      `INSERT INTO stripe_events (stripe_event_id, type, livemode, payload)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (stripe_event_id) DO NOTHING
       RETURNING *`,
      [input.stripe_event_id, input.type, input.livemode, input.payload]
    );

    // If ON CONFLICT triggered, fetch existing event
    if (result.rows.length === 0) {
      const existing = await findStripeEventById(db, input.stripe_event_id);
      if (existing) {
        return existing;
      }
      throw new DatabaseError('Failed to create or fetch Stripe event');
    }

    return result.rows[0];
  } catch (error: any) {
    throw new DatabaseError('Failed to create Stripe event', {
      input,
      error: error.message,
    });
  }
}

export async function markStripeEventProcessed(
  db: DBAdapter,
  stripeEventId: string,
  error?: string | null
): Promise<void> {
  try {
    await db.query(
      `UPDATE stripe_events
       SET processed = $2,
           processing_error = $3,
           processed_at = CASE WHEN $2 = TRUE THEN NOW() ELSE NULL END
       WHERE stripe_event_id = $1`,
      [stripeEventId, !error, error || null]
    );
  } catch (err: any) {
    throw new DatabaseError('Failed to mark Stripe event as processed', {
      stripeEventId,
      error: err.message,
    });
  }
}
