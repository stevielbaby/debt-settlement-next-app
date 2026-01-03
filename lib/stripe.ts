/**
 * Stripe Integration Setup
 * 
 * This file handles all Stripe API interactions for:
 * - Customer creation and management
 * - Payment methods
 * - Subscription creation and management
 * - Invoices and billing
 */

import Stripe from "stripe";
import { prisma } from "@/app/lib/db";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

/**
 * Create a Stripe customer for an organization
 */
export async function createStripeCustomer(
  organizationId: string,
  organizationEmail: string,
  organizationName: string,
  metadata?: Record<string, string>
) {
  try {
    const customer = await stripe.customers.create({
      email: organizationEmail,
      name: organizationName,
      metadata: {
        organization_id: organizationId,
        ...metadata,
      },
    });

    return customer;
  } catch (error) {
    console.error("Error creating Stripe customer:", error);
    throw error;
  }
}

/**
 * Get or create a Stripe customer
 */
export async function getOrCreateStripeCustomer(
  organizationId: string,
  organizationEmail: string,
  organizationName: string
) {
  try {
    // First check if we already have a customer ID in the database
    const firm = await prisma.firm.findUnique({
      where: { id: organizationId },
      select: { stripeCustomerId: true }
    });

    if (firm?.stripeCustomerId) {
      // Verify the customer still exists in Stripe
      try {
        const customer = await stripe.customers.retrieve(firm.stripeCustomerId);
        return customer;
      } catch (error) {
        console.warn("Stored Stripe customer ID is invalid, will create new customer");
        // Continue to search/create logic below
      }
    }

    // Search for existing customer by metadata
    const customers = await stripe.customers.search({
      query: `metadata['organization_id']:'${organizationId}'`,
    });

    if (customers.data.length > 0) {
      // Save the customer ID to database if not already saved
      if (!firm?.stripeCustomerId) {
        await prisma.firm.update({
          where: { id: organizationId },
          data: { stripeCustomerId: customers.data[0].id }
        });
      }
      return customers.data[0];
    }

    // Create new customer if not found
    const newCustomer = await createStripeCustomer(
      organizationId,
      organizationEmail,
      organizationName
    );

    // Save the new customer ID to database
    await prisma.firm.update({
      where: { id: organizationId },
      data: { stripeCustomerId: newCustomer.id }
    });

    return newCustomer;
  } catch (error) {
    console.error("Error getting or creating Stripe customer:", error);
    throw error;
  }
}

/**
 * Create a subscription for an organization
 */
export async function createSubscription(
  stripeCustomerId: string,
  stripePriceId: string,
  metadata?: Record<string, string>
) {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [
        {
          price: stripePriceId,
        },
      ],
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
      metadata: metadata || {},
    });

    return subscription;
  } catch (error) {
    console.error("Error creating subscription:", error);
    throw error;
  }
}

/**
 * Update a subscription
 */
export async function updateSubscription(
  subscriptionId: string,
  updates: Stripe.SubscriptionUpdateParams
) {
  try {
    const subscription = await stripe.subscriptions.update(
      subscriptionId,
      updates
    );

    return subscription;
  } catch (error) {
    console.error("Error updating subscription:", error);
    throw error;
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediate: boolean = false
) {
  try {
    const subscription = await stripe.subscriptions.update(
      subscriptionId,
      {
        cancel_at_period_end: !immediate,
      }
    );

    if (immediate) {
      await stripe.subscriptions.cancel(subscriptionId);
    }

    return subscription;
  } catch (error) {
    console.error("Error canceling subscription:", error);
    throw error;
  }
}

/**
 * Create a Stripe price for a plan
 */
export async function createStripePrice(
  productId: string,
  amount: number, // in cents
  currency: string = "usd",
  billingPeriod: "month" | "year" = "month",
  metadata?: Record<string, string>
) {
  try {
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: amount,
      currency: currency,
      recurring: {
        interval: billingPeriod,
        interval_count: 1,
      },
      metadata: metadata || {},
    });

    return price;
  } catch (error) {
    console.error("Error creating Stripe price:", error);
    throw error;
  }
}

/**
 * Create a Stripe product for a subscription plan
 */
export async function createStripeProduct(
  planName: string,
  description?: string,
  metadata?: Record<string, string>
) {
  try {
    const product = await stripe.products.create({
      name: planName,
      description: description || "",
      metadata: metadata || {},
    });

    return product;
  } catch (error) {
    console.error("Error creating Stripe product:", error);
    throw error;
  }
}

/**
 * Get a subscription's upcoming invoice
 * TODO: Fix Stripe API method - upcoming() method not available in current version
 */
export async function getUpcomingInvoice(customerId: string) {
  try {
    // const invoice = await stripe.invoices.upcoming({
    //   customer: customerId,
    // });
    // return invoice;

    // Temporarily return null until Stripe API is fixed
    console.log("getUpcomingInvoice not implemented - Stripe API method unavailable");
    return null;
  } catch (error) {
    console.error("Error getting upcoming invoice:", error);
    return null;
  }
}

/**
 * List all invoices for a customer
 */
export async function listCustomerInvoices(customerId: string, limit = 10) {
  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: limit,
    });

    return invoices.data;
  } catch (error) {
    console.error("Error listing invoices:", error);
    throw error;
  }
}

/**
 * Get a subscription status
 */
export async function getSubscriptionStatus(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription.status;
  } catch (error) {
    console.error("Error getting subscription status:", error);
    throw error;
  }
}

/**
 * Get a customer's active, trialing, or incomplete subscription
 */
export async function getActiveSubscription(customerId: string) {
  try {
    // Get ALL active subscriptions and return the most recent one
    let subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10, // Get more to find the most recent
    });

    if (subscriptions.data.length > 0) {
      // Sort by created date (newest first) and return the most recent
      const sorted = subscriptions.data.sort((a, b) => b.created - a.created);
      return sorted[0];
    }

    // Check for trialing subscriptions
    subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "trialing",
      limit: 10,
    });

    if (subscriptions.data.length > 0) {
      // Sort by created date (newest first)
      const sorted = subscriptions.data.sort((a, b) => b.created - a.created);
      return sorted[0];
    }

    // Check for incomplete subscriptions (created but payment not completed)
    subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "incomplete",
      limit: 10,
    });

    if (subscriptions.data.length > 0) {
      // Sort by created date (newest first)
      const sorted = subscriptions.data.sort((a, b) => b.created - a.created);
      return sorted[0];
    }

    return null;
  } catch (error) {
    console.error("Error getting subscription:", error);
    throw error;
  }
}

/**
 * Create a payment intent for one-time payment
 */
export async function createPaymentIntent(
  amount: number, // in cents
  customerId: string,
  description?: string,
  metadata?: Record<string, string>
) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      customer: customerId,
      description: description || "",
      metadata: metadata || {},
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return paymentIntent;
  } catch (error) {
    console.error("Error creating payment intent:", error);
    throw error;
  }
}

/**
 * List active Stripe products
 */
export async function listStripeProducts() {
  try {
    const products = await stripe.products.list({ active: true });
    return products.data;
  } catch (error) {
    console.error("Error listing Stripe products:", error);
    throw error;
  }
}

/**
 * List active Stripe prices
 */
export async function listStripePrices() {
  try {
    const prices = await stripe.prices.list({ active: true });
    return prices.data;
  } catch (error) {
    console.error("Error listing Stripe prices:", error);
    throw error;
  }
}

/**
 * Create a Stripe checkout session for subscription
 */
export async function createCheckoutSession(
  priceId: string,
  customerId: string,
  successUrl: string,
  cancelUrl: string,
  metadata?: Record<string, string>
) {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata || {},
    });

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Retrieve a webhook event
 */
export async function getWebhookEvent(
  body: string,
  signature: string,
  secret: string
) {
  try {
    console.log("🔐 Webhook signature verification attempt:");
    console.log("   Body length:", body.length);
    console.log("   Signature present:", !!signature);
    console.log("   Secret present:", !!secret);
    console.log("   Secret starts with whsec_:", secret.startsWith('whsec_'));

    const event = stripe.webhooks.constructEvent(body, signature, secret);
    console.log("✅ Webhook signature verified successfully for event:", event.type);
    return event;
  } catch (error) {
    console.error("❌ Webhook signature verification failed:");
    console.error("   Error:", error.message);
    console.error("   Body preview:", body.substring(0, 200) + "...");
    console.error("   Signature:", signature ? signature.substring(0, 50) + "..." : "none");
    console.error("   Secret configured:", !!secret);
    throw error;
  }
}
