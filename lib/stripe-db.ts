/**
 * Database utilities for Stripe integration
 * Handles storing and retrieving Stripe data in the database
 */

import { sql } from "@/app/lib/db";

/**
 * Store or update Stripe customer ID for an organization
 */
export async function saveStripeCustomerId(
  organizationId: string,
  stripeCustomerId: string
) {
  try {
    const result = await sql`
      UPDATE app.organizations
      SET stripe_customer_id = ${stripeCustomerId},
          updated_at = NOW()
      WHERE id = ${organizationId}
      RETURNING id, stripe_customer_id
    `;

    return result[0];
  } catch (error) {
    console.error("Error saving Stripe customer ID:", error);
    throw error;
  }
}

/**
 * Conditionally persist Stripe customer ID only if absent (race-safe upsert).
 * Returns the effective stripe_customer_id after the operation.
 */
export async function saveStripeCustomerIdIfAbsent(
  organizationId: string,
  stripeCustomerId: string
) {
  try {
    // Attempt conditional update when value is currently NULL
    const updated = await sql`
      UPDATE app.organizations
      SET stripe_customer_id = ${stripeCustomerId},
          updated_at = NOW()
      WHERE id = ${organizationId}
        AND stripe_customer_id IS NULL
      RETURNING id, stripe_customer_id
    `;

    if (updated.length > 0) {
      return updated[0].stripe_customer_id as string;
    }

    // Another concurrent request may have set it; read back the value
    const existing = await sql`
      SELECT stripe_customer_id FROM app.organizations
      WHERE id = ${organizationId}
      LIMIT 1
    `;

    return existing[0]?.stripe_customer_id || stripeCustomerId;
  } catch (error) {
    console.error("Error conditionally saving Stripe customer ID:", error);
    throw error;
  }
}

/**
 * Get Stripe customer ID for an organization
 */
export async function getStripeCustomerId(organizationId: string) {
  try {
    const result = await sql`
      SELECT stripe_customer_id
      FROM app.organizations
      WHERE id = ${organizationId}
      LIMIT 1
    `;

    return result[0]?.stripe_customer_id || null;
  } catch (error) {
    console.error("Error getting Stripe customer ID:", error);
    throw error;
  }
}

/**
 * Store or update Stripe subscription for an organization
 */
export async function saveStripeSubscription(
  organizationId: string,
  stripeSubscriptionId: string,
  stripePriceId: string,
  planId: string,
  status: string,
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  billingPeriod: "month" | "year"
) {
  try {
    // Map Stripe subscription status to database status
    // Stripe uses: 'active', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'canceled'
    // Database expects: 'active', 'trialing', 'past_due', 'canceled', 'cancelled'
    let dbStatus = status;
    if (status === 'canceled') {
      dbStatus = 'canceled';  // Keep American spelling (constraint accepts both)
    } else if (status === 'incomplete' || status === 'incomplete_expired') {
      dbStatus = 'active';  // Treat incomplete subscriptions as active until they resolve
    } else if (status === 'trialing') {
      dbStatus = 'trialing';  // Keep trialing as-is
    }
    // All other statuses (active, past_due) are already compatible

    // Validate and normalize dates
    let start = currentPeriodStart;
    let end = currentPeriodEnd;

    // If dates are invalid, use current time and add 1 month
    if (isNaN(start.getTime()) || !start) {
      start = new Date();
    }
    if (isNaN(end.getTime()) || !end) {
      end = new Date();
      end.setMonth(end.getMonth() + 1);
    }

    console.log("Saving subscription with dates:", { start: start.toISOString(), end: end.toISOString() });

    // First, get the existing subscription ID to see if we're updating
    const existing = await sql`
      SELECT id FROM app.organization_subscriptions
      WHERE org_id = ${organizationId} OR organization_id = ${organizationId}
      LIMIT 1
    `;

    if (existing.length > 0) {
      // Update existing subscription - populate both org_id and organization_id for dual-column pattern
      const result = await sql`
        UPDATE app.organization_subscriptions
        SET org_id = ${organizationId},
            organization_id = ${organizationId},
            plan_id = ${planId},
            status = ${dbStatus},
            billing_period = ${billingPeriod},
            current_period_start = ${start.toISOString()},
            current_period_end = ${end.toISOString()},
            stripe_subscription_id = ${stripeSubscriptionId},
            stripe_price_id = ${stripePriceId},
            updated_at = NOW()
        WHERE id = ${existing[0].id}
        RETURNING id, stripe_subscription_id, status
      `;

      return result[0];
    } else {
      // Create new subscription - populate both org_id (legacy, NOT NULL) and organization_id (new) for dual-column pattern
      const result = await sql`
        INSERT INTO app.organization_subscriptions (
          org_id,
          organization_id,
          plan_id,
          status,
          billing_period,
          billing_cycle_start,
          billing_cycle_end,
          current_period_start,
          current_period_end,
          stripe_subscription_id,
          stripe_price_id,
          created_at,
          updated_at
        )
        VALUES (
          ${organizationId},
          ${organizationId},
          ${planId},
          ${dbStatus},
          ${billingPeriod},
          ${start.toISOString()},
          ${end.toISOString()},
          ${start.toISOString()},
          ${end.toISOString()},
          ${stripeSubscriptionId},
          ${stripePriceId},
          NOW(),
          NOW()
        )
        RETURNING id, stripe_subscription_id, status
      `;

      return result[0];
    }
  } catch (error) {
    console.error("Error saving Stripe subscription:", error);
    throw error;
  }
}

/**
 * Get Stripe subscription for an organization
 */
export async function getStripeSubscription(organizationId: string) {
  try {
    const result = await sql`
      SELECT stripe_subscription_id, stripe_price_id, status, current_period_end
      FROM app.organization_subscriptions
      WHERE org_id = ${organizationId} OR organization_id = ${organizationId}
      LIMIT 1
    `;

    return result[0] || null;
  } catch (error) {
    console.error("Error getting Stripe subscription:", error);
    throw error;
  }
}

/**
 * Save a plan's Stripe product and price IDs (monthly and yearly)
 */
export async function savePlanStripeIds(
  planId: string,
  stripeProductId: string,
  stripePriceId: string,
  yearlyStripePriceId?: string
) {
  try {
    if (yearlyStripePriceId) {
      const result = await sql`
        UPDATE app.subscription_plans
        SET stripe_product_id = ${stripeProductId},
            stripe_price_id = ${stripePriceId},
            yearly_stripe_price_id = ${yearlyStripePriceId},
            updated_at = NOW()
        WHERE id = ${planId}
        RETURNING id, stripe_product_id, stripe_price_id, yearly_stripe_price_id
      `;

      return result[0];
    } else {
      const result = await sql`
        UPDATE app.subscription_plans
        SET stripe_product_id = ${stripeProductId},
            stripe_price_id = ${stripePriceId},
            updated_at = NOW()
        WHERE id = ${planId}
        RETURNING id, stripe_product_id, stripe_price_id, yearly_stripe_price_id
      `;

      return result[0];
    }
  } catch (error) {
    console.error("Error saving plan Stripe IDs:", error);
    throw error;
  }
}

/**
 * Get Stripe price ID for a plan
 */
export async function getPlanStripePriceId(planId: string) {
  try {
    const result = await sql`
      SELECT stripe_price_id, stripe_product_id, price, monthly_limit
      FROM app.subscription_plans
      WHERE id = ${planId}
      LIMIT 1
    `;

    return result[0] || null;
  } catch (error) {
    console.error("Error getting plan Stripe price ID:", error);
    throw error;
  }
}

/**
 * Save a Stripe invoice locally
 */
export async function saveStripeInvoice(
  organizationId: string,
  stripeInvoiceId: string,
  amount: number,
  status: string,
  issueDate: Date,
  dueDate: Date,
  paidDate?: Date
) {
  try {
    const result = await sql`
      INSERT INTO app.invoices (
        organization_id,
        stripe_invoice_id,
        amount,
        status,
        issue_date,
        due_date,
        paid_date,
        created_at,
        updated_at
      )
      VALUES (
        ${organizationId},
        ${stripeInvoiceId},
        ${amount},
        ${status},
        ${issueDate},
        ${dueDate},
        ${paidDate || null},
        NOW(),
        NOW()
      )
      RETURNING id, stripe_invoice_id
    `;

    return result[0];
  } catch (error) {
    console.error("Error saving Stripe invoice:", error);
    throw error;
  }
}

/**
 * Update invoice status
 */
export async function updateInvoiceStatus(
  stripeInvoiceId: string,
  status: string,
  paidDate?: Date
) {
  try {
    const result = await sql`
      UPDATE app.invoices
      SET status = ${status},
          paid_date = ${paidDate || null},
          updated_at = NOW()
      WHERE stripe_invoice_id = ${stripeInvoiceId}
      RETURNING id, status
    `;

    return result[0];
  } catch (error) {
    console.error("Error updating invoice status:", error);
    throw error;
  }
}

/**
 * Get all Stripe product IDs for plans
 */
export async function getAllPlanStripeIds() {
  try {
    const result = await sql`
      SELECT id, name, stripe_product_id, stripe_price_id, yearly_stripe_price_id, price, monthly_limit
      FROM app.subscription_plans
      WHERE is_active = true
      ORDER BY monthly_limit ASC
    `;

    return result;
  } catch (error) {
    console.error("Error getting plan Stripe IDs:", error);
    throw error;
  }
}

/**
 * Get yearly Stripe price ID for a plan
 */
export async function getPlanYearlyStripePriceId(planId: string) {
  try {
    const result = await sql`
      SELECT yearly_stripe_price_id, stripe_product_id, price, monthly_limit
      FROM app.subscription_plans
      WHERE id = ${planId}
      LIMIT 1
    `;

    return result[0] || null;
  } catch (error) {
    console.error("Error getting plan yearly Stripe price ID:", error);
    throw error;
  }
}

/**
 * Mark webhook event as processed for idempotency
 */
export async function markWebhookProcessed(stripeEventId: string, eventType?: string) {
  try {
    await sql`
      INSERT INTO app.webhook_events (stripe_event_id, event_type, processed)
      VALUES (${stripeEventId}, ${eventType || null}, true)
      ON CONFLICT (stripe_event_id) DO UPDATE SET processed = true
    `;
  } catch (error) {
    console.error("Error marking webhook processed:", error);
    throw error;
  }
}

/**
 * Check if webhook event was already processed
 */
export async function isWebhookProcessed(stripeEventId: string) {
  try {
    const result = await sql`
      SELECT processed FROM app.webhook_events
      WHERE stripe_event_id = ${stripeEventId}
      LIMIT 1
    `;

    return result.length > 0 && result[0].processed === true;
  } catch (error) {
    console.error("Error checking webhook:", error);
    return false;
  }
}

/**
 * Log billing event for audit trail
 */
export async function logBillingEvent(
  organizationId: string,
  eventType: string,
  stripeEventId?: string,
  details?: Record<string, any>
) {
  try {
    await sql`
      INSERT INTO app.billing_events
      (organization_id, event_type, stripe_event_id, details)
      VALUES (${organizationId}, ${eventType}, ${stripeEventId || null}, ${JSON.stringify(details) || null})
    `;
  } catch (error) {
    console.error("Error logging billing event:", error);
    // Don't throw - logging failure shouldn't break main operation
  }
}

/**
 * Save payment method to database
 */
export async function savePaymentMethod(
  organizationId: string,
  stripePaymentMethodId: string,
  type: "card" | "ach",
  details?: {
    cardLast4?: string;
    cardBrand?: string;
    cardExpMonth?: number;
    cardExpYear?: number;
    achLast4?: string;
    achRoutingNumberLastFour?: string;
    billingAddressLine1?: string;
    billingAddressCity?: string;
    billingAddressState?: string;
    billingAddressZip?: string;
    billingAddressCountry?: string;
  },
  isDefault: boolean = false
) {
  try {
    // If setting as default, unset other defaults first
    if (isDefault) {
      await sql`
        UPDATE app.payment_methods
        SET is_default = FALSE
        WHERE organization_id = ${organizationId} AND is_default = TRUE
      `;
    }

    const result = await sql`
      INSERT INTO app.payment_methods
      (organization_id, stripe_payment_method_id, type, card_last_four, card_brand, 
       card_exp_month, card_exp_year, ach_last_four, ach_routing_number_last_four,
       billing_address_line1, billing_address_city, billing_address_state,
       billing_address_zip, billing_address_country, is_default, is_valid)
      VALUES 
      (${organizationId}, ${stripePaymentMethodId}, ${type}, ${details?.cardLast4 || null}, ${details?.cardBrand || null},
       ${details?.cardExpMonth || null}, ${details?.cardExpYear || null}, ${details?.achLast4 || null}, ${details?.achRoutingNumberLastFour || null},
       ${details?.billingAddressLine1 || null}, ${details?.billingAddressCity || null}, ${details?.billingAddressState || null},
       ${details?.billingAddressZip || null}, ${details?.billingAddressCountry || null}, ${isDefault}, true)
      ON CONFLICT (stripe_payment_method_id) DO UPDATE SET
        updated_at = CURRENT_TIMESTAMP,
        is_default = EXCLUDED.is_default,
        is_valid = TRUE,
        deleted_at = NULL
      RETURNING id, stripe_payment_method_id
    `;

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error saving payment method:", error);
    throw error;
  }
}

/**
 * Get organization's subscription with plan details
 */
export async function getOrganizationSubscription(organizationId: string) {
  try {
    const result = await sql`
      SELECT 
        os.id,
        os.stripe_subscription_id,
        os.stripe_price_id,
        os.plan_id,
        os.status,
        os.current_period_start,
        os.current_period_end,
        os.billing_period,
        sp.name as plan_name,
        sp.description,
        sp.price,
        sp.monthly_limit,
        sp.stripe_product_id,
        sp.stripe_price_id as monthly_stripe_price_id,
        sp.yearly_stripe_price_id
      FROM app.organization_subscriptions os
      JOIN app.subscription_plans sp ON os.plan_id = sp.id
      WHERE os.organization_id = ${organizationId} OR os.org_id = ${organizationId}
      LIMIT 1
    `;

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error getting organization subscription:", error);
    throw error;
  }
}

/**
 * Update subscription billing period
 */
export async function updateSubscriptionBillingPeriod(
  organizationId: string,
  billingPeriod: "month" | "year"
) {
  try {
    await sql`
      UPDATE app.organization_subscriptions
      SET billing_period = ${billingPeriod},
          updated_at = NOW()
      WHERE organization_id = ${organizationId} OR org_id = ${organizationId}
    `;
  } catch (error) {
    console.error("Error updating subscription billing period:", error);
    throw error;
  }
}

/**
 * Create notification for webmaster when operator subscribes
 */
export async function createOperatorSubscriptionNotification(
  organizationId: string,
  planId: string,
  stripeSubscriptionId: string,
  stripeEventId: string
) {
  try {
    // Get organization and plan details
    const orgResult = await sql`
      SELECT name, email FROM app.organizations WHERE id = ${organizationId} LIMIT 1
    `;
    const planResult = await sql`
      SELECT name, price FROM app.subscription_plans WHERE id = ${planId} LIMIT 1
    `;

    const orgName = orgResult[0]?.name || 'Unknown Organization';
    const orgEmail = orgResult[0]?.email || '';
    const planName = planResult[0]?.name || 'Unknown Plan';
    const planPrice = planResult[0]?.price || 0;

    // Create notification
    await sql`
      INSERT INTO notifications (type, title, message, data)
      VALUES (
        'operator_subscribed',
        'New Operator Subscription',
        ${`${orgName} has subscribed to ${planName}`},
        ${JSON.stringify({
          organization_id: organizationId,
          organization_name: orgName,
          organization_email: orgEmail,
          plan_id: planId,
          plan_name: planName,
          plan_price: planPrice,
          stripe_subscription_id: stripeSubscriptionId,
          stripe_event_id: stripeEventId,
        })}
      )
    `;

    console.log(`Created notification: ${orgName} subscribed to ${planName}`);
  } catch (error) {
    console.error('Error creating subscription notification:', error);
    // Don't throw - notification failure shouldn't break subscription
  }
}
