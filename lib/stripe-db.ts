/**
 * Database utilities for Stripe integration
 * Handles storing and retrieving Stripe data in the database
 */

import { prisma } from "@/app/lib/db";

/**
 * Store or update Stripe customer ID for an organization
 */
export async function saveStripeCustomerId(
  organizationId: string,
  stripeCustomerId: string
) {
  try {
    const result = await prisma.firm.update({
      where: { id: organizationId },
      data: {
        stripeCustomerId,
        updatedAt: new Date()
      }
    });

    return { id: result.id, stripe_customer_id: result.stripeCustomerId };
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
    const firm = await prisma.firm.findUnique({
      where: { id: organizationId },
      select: { stripeCustomerId: true }
    });

    return firm?.stripeCustomerId || null;
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
    const result = await prisma.firmSubscription.upsert({
      where: { firmId: organizationId },
      update: {
        stripeSubscriptionId,
        status: status.toUpperCase() as any,
        currentPeriodStart,
        currentPeriodEnd,
        updatedAt: new Date()
      },
      create: {
        firmId: organizationId,
        stripePriceId: stripePriceId,
        stripeSubscriptionId,
        status: status.toUpperCase() as any,
        currentPeriodStart,
        currentPeriodEnd
      }
    });

    return {
      id: result.id,
      stripe_subscription_id: result.stripeSubscriptionId,
      status: result.status
    };
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
    const subscription = await prisma.firmSubscription.findFirst({
      where: { firmId: organizationId },
      select: {
        stripeSubscriptionId: true,
        plan: { select: { stripePriceId: true } },
        status: true,
        currentPeriodEnd: true
      }
    });

    if (!subscription) return null;

    return {
      stripe_subscription_id: subscription.stripeSubscriptionId,
      stripe_price_id: subscription.plan?.stripePriceId,
      status: subscription.status,
      current_period_end: subscription.currentPeriodEnd
    };
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
    const result = await prisma.stripePlan.update({
      where: { id: planId },
      data: {
        stripePriceId,
        updatedAt: new Date()
      }
    });

    return {
      id: result.id,
      stripe_product_id: null, // TODO: Add to schema if needed
      stripe_price_id: result.stripePriceId
    };
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
    const plan = await prisma.stripePlan.findUnique({
      where: { id: planId },
      select: {
        stripePriceId: true,
        priceCents: true
      }
    });

    if (!plan) return null;

    return {
      stripe_price_id: plan.stripePriceId,
      stripe_product_id: null, // TODO: Add to schema if needed
      price: plan.priceCents,
      monthly_limit: null // TODO: Add to schema if needed
    };
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
    const result = await prisma.invoice.create({
      data: {
        firmId: organizationId,
        stripeInvoiceId,
        amount,
        status,
        issueDate,
        dueDate,
        paidDate
      },
      select: {
        id: true,
        stripeInvoiceId: true
      }
    });

    return result;
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
    const result = await prisma.invoice.update({
      where: { stripeInvoiceId },
      data: {
        status,
        paidDate,
        updatedAt: new Date()
      },
      select: {
        id: true,
        status: true
      }
    });

    return result;
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
    const plans = await prisma.stripePlan.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        stripePriceId: true,
        priceCents: true
      },
      orderBy: { priceCents: 'asc' } // Using price as proxy for ordering
    });

    return plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      stripe_product_id: null, // TODO: Add to schema if needed
      stripe_price_id: plan.stripePriceId,
      price: plan.priceCents,
      monthly_limit: null // TODO: Add to schema if needed
    }));
  } catch (error) {
    console.error("Error getting plan Stripe IDs:", error);
    throw error;
  }
}
