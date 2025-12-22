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
  currentPeriodEnd: Date
) {
  try {
    // First, get the existing subscription ID to see if we're updating
    const existing = await sql`
      SELECT id FROM app.organization_subscriptions
      WHERE organization_id = ${organizationId}
      LIMIT 1
    `;

    if (existing.length > 0) {
      // Update existing subscription
      const result = await sql`
        UPDATE app.organization_subscriptions
        SET plan_id = ${planId},
            status = ${status},
            current_period_start = ${currentPeriodStart},
            current_period_end = ${currentPeriodEnd},
            stripe_subscription_id = ${stripeSubscriptionId},
            stripe_price_id = ${stripePriceId},
            updated_at = NOW()
        WHERE id = ${existing[0].id}
        RETURNING id, stripe_subscription_id, status
      `;

      return result[0];
    } else {
      // Create new subscription
      const result = await sql`
        INSERT INTO app.organization_subscriptions (
          organization_id,
          plan_id,
          status,
          current_period_start,
          current_period_end,
          stripe_subscription_id,
          stripe_price_id,
          created_at,
          updated_at
        )
        VALUES (
          ${organizationId},
          ${planId},
          ${status},
          ${currentPeriodStart},
          ${currentPeriodEnd},
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
      WHERE organization_id = ${organizationId}
      LIMIT 1
    `;

    return result[0] || null;
  } catch (error) {
    console.error("Error getting Stripe subscription:", error);
    throw error;
  }
}

/**
 * Save a plan's Stripe product and price IDs
 */
export async function savePlanStripeIds(
  planId: string,
  stripeProductId: string,
  stripePriceId: string
) {
  try {
    const result = await sql`
      UPDATE app.subscription_plans
      SET stripe_product_id = ${stripeProductId},
          stripe_price_id = ${stripePriceId},
          updated_at = NOW()
      WHERE id = ${planId}
      RETURNING id, stripe_product_id, stripe_price_id
    `;

    return result[0];
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
      SELECT id, name, stripe_product_id, stripe_price_id, price, monthly_limit
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
