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

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-01.acacia",
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
    // Search for existing customer
    const customers = await stripe.customers.search({
      query: `metadata['organization_id']:'${organizationId}'`,
    });

    if (customers.data.length > 0) {
      return customers.data[0];
    }

    // Create new customer if not found
    return await createStripeCustomer(
      organizationId,
      organizationEmail,
      organizationName
    );
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
 */
export async function getUpcomingInvoice(customerId: string) {
  try {
    const invoice = await stripe.invoices.retrieveUpcoming({
      customer: customerId,
    });

    return invoice;
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
 * Get a customer's active subscription
 */
export async function getActiveSubscription(customerId: string) {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    return subscriptions.data[0] || null;
  } catch (error) {
    console.error("Error getting active subscription:", error);
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
 * Retrieve a webhook event
 */
export async function getWebhookEvent(
  body: string,
  signature: string,
  secret: string
) {
  try {
    const event = stripe.webhooks.constructEvent(body, signature, secret);
    return event;
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    throw error;
  }
}
