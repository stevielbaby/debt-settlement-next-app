/**
 * POST /api/operator/billing/create-checkout-session
 * Create a Stripe Checkout session for an operator to subscribe
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createStripeProduct, createStripePrice } from "@/lib/stripe";
import { savePlanStripeIds } from "@/lib/stripe-db";
import { ensureStripeCustomerForOrganization } from "@/lib/billing";
import { sql } from "@/app/lib/db";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "operator") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const organizationId = (session.user as unknown as Record<string, unknown>)
      .organization_id as string | undefined;
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "No organization assigned" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { planId, billingPeriod } = body;

    if (!planId || !billingPeriod || !["month", "year"].includes(billingPeriod)) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid planId or billingPeriod" },
        { status: 400 }
      );
    }

    // Get organization details
    const orgResult = await sql`
      SELECT id, name, email, stripe_customer_id
      FROM app.organizations
      WHERE id = ${organizationId}
      LIMIT 1
    `;

    if (orgResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Organization not found" },
        { status: 404 }
      );
    }

    // org loaded for existence validation; ensureStripeCustomerForOrganization will reload details if needed

    // Get plan details
    const planResult = await sql`
      SELECT id, name, description, price, monthly_limit, stripe_product_id, stripe_price_id, yearly_stripe_price_id
      FROM app.subscription_plans
      WHERE id = ${planId} AND is_active = true
      LIMIT 1
    `;

    if (planResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Plan not found or not active" },
        { status: 404 }
      );
    }

    const plan = planResult[0];

    // Ensure Stripe customer exists and persist ID if absent (race-safe)
    const ensuredCustomerId: string = await ensureStripeCustomerForOrganization(organizationId);

    // Ensure plan has Stripe product/price; auto-provision if needed
    let stripePriceId = billingPeriod === "month" 
      ? (plan.stripe_price_id as string)
      : (plan.yearly_stripe_price_id as string);

    if (!stripePriceId) {
      // Need to create the price
      let stripeProductId = plan.stripe_product_id;

      if (!stripeProductId) {
        // Create product first
        const product = await createStripeProduct(
          plan.name,
          plan.description || `Plan: ${plan.name}`,
          {
            plan_id: planId,
          }
        );
        stripeProductId = product.id;
      }

      // Create the price for the selected billing period
      const unitAmount = Math.round(parseFloat(plan.price) * 100);
      let amountInCents = unitAmount;

      if (billingPeriod === "year") {
        // Calculate yearly price (10 months = 2 months free)
        amountInCents = Math.round(unitAmount * 10);
      }

      const price = await createStripePrice(
        stripeProductId,
        amountInCents,
        "usd",
        billingPeriod,
        {
          plan_id: planId,
          billing_period: billingPeriod,
        }
      );
      stripePriceId = price.id;

      // Save the price IDs to database
      if (billingPeriod === "month") {
        await savePlanStripeIds(planId, stripeProductId, stripePriceId);
      } else {
        await savePlanStripeIds(planId, stripeProductId, plan.stripe_price_id, stripePriceId);
      }
    }

    // Create Stripe Checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: ensuredCustomerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXTAUTH_URL}/operator/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/operator/billing/select-plan`,
      metadata: {
        organization_id: organizationId,
        plan_id: planId,
        billing_period: billingPeriod,
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: checkoutSession.id,
      sessionUrl: checkoutSession.url,
      planName: plan.name,
      billingPeriod,
      amount: billingPeriod === "month" ? parseFloat(plan.price) : Math.round(parseFloat(plan.price) * 10),
    });
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string; statusCode?: number };
    console.error("Create checkout session error:", {
      message: err?.message,
      code: err?.code,
      statusCode: err?.statusCode,
    });
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to create checkout session",
      },
      { status: 500 }
    );
  }
}
