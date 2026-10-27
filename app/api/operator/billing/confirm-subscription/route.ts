/**
 * POST /api/operator/billing/confirm-subscription
 * Confirm and save subscription after successful Stripe Checkout
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { stripe, subscriptionPeriod } from "@/lib/stripe";
import { saveStripeSubscription, logBillingEvent } from "@/lib/stripe-db";
import { sql } from "@/app/lib/db";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const role = session?.user?.role;
    if (!session?.user || (role !== "operator" && role !== "webmaster")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const organizationId = session.user.orgId;
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "No organization assigned" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { checkoutSessionId } = body;

    if (!checkoutSessionId) {
      return NextResponse.json(
        { success: false, error: "Missing checkoutSessionId" },
        { status: 400 }
      );
    }

    // Retrieve the checkout session from Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(checkoutSessionId);

    if (!checkoutSession || checkoutSession.payment_status !== "paid") {
      return NextResponse.json(
        { success: false, error: "Payment not completed" },
        { status: 400 }
      );
    }

    // Get subscription ID from checkout session
    const subscriptionId = checkoutSession.subscription as string;
    if (!subscriptionId) {
      return NextResponse.json(
        { success: false, error: "No subscription created" },
        { status: 400 }
      );
    }

    // Retrieve the full subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Get metadata from checkout session
    const planId = checkoutSession.metadata?.plan_id;
    const billingPeriod = (checkoutSession.metadata?.billing_period || "month") as "month" | "year";

    if (!planId) {
      return NextResponse.json(
        { success: false, error: "Plan information missing" },
        { status: 400 }
      );
    }

    // Get plan details
    const planResult = await sql`
      SELECT id, name, price FROM app.subscription_plans
      WHERE id = ${planId}
      LIMIT 1
    `;

    if (planResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Plan not found" },
        { status: 404 }
      );
    }

    const plan = planResult[0];

    // Extract subscription details
    const { start: currentPeriodStart, end: currentPeriodEnd } = subscriptionPeriod(subscription);
    const stripePriceId = subscription.items.data[0].price.id;

    // Save subscription to database
    await saveStripeSubscription(
      organizationId,
      subscription.id,
      stripePriceId,
      planId,
      subscription.status,
      currentPeriodStart,
      currentPeriodEnd,
      billingPeriod
    );

    // Log billing event
    await logBillingEvent(
      organizationId,
      "subscription_created",
      subscription.id,
      {
        planId,
        planName: plan.name,
        billingPeriod,
        status: subscription.status,
      }
    );

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        planName: plan.name,
        amount: parseFloat(plan.price),
        billingPeriod,
        currentPeriodStart: currentPeriodStart.toISOString(),
        currentPeriodEnd: currentPeriodEnd.toISOString(),
        daysUntilRenewal: Math.ceil(
          (currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ),
      },
    });
  } catch (error: any) {
    console.error("Confirm subscription error:", {
      message: error.message,
      code: error.code,
    });
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to confirm subscription",
      },
      { status: 500 }
    );
  }
}
