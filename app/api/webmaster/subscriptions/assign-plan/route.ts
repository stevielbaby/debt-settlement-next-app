/**
 * POST /api/webmaster/subscriptions/assign-plan
 * Assign a subscription plan to an organization
 * Only accessible by webmaster role
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getOrCreateStripeCustomer,
  createSubscription,
} from "@/lib/stripe";
import {
  getStripeCustomerId,
  saveStripeSubscription,
  getPlanStripePriceId,
} from "@/lib/stripe-db";
import { sql } from "@/app/lib/db";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "webmaster") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { organizationId, planId } = await request.json();

    if (!organizationId || !planId) {
      return NextResponse.json(
        { success: false, error: "Missing organizationId or planId" },
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

    const org = orgResult[0];

    // Get plan details with Stripe info
    const planResult = await sql`
      SELECT id, name, price, stripe_price_id
      FROM app.subscription_plans
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

    // Get or create Stripe customer
    let stripeCustomerId = org.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await getOrCreateStripeCustomer(
        organizationId,
        org.email,
        org.name
      );
      stripeCustomerId = customer.id;

      // Save customer ID
      await sql`
        UPDATE app.organizations
        SET stripe_customer_id = ${stripeCustomerId}
        WHERE id = ${organizationId}
      `;
    }

    // Check if plan has Stripe price
    let stripePriceId = plan.stripe_price_id;
    if (!stripePriceId) {
      return NextResponse.json(
        {
          success: false,
          error: "Plan is not configured for Stripe. Contact administrator.",
        },
        { status: 400 }
      );
    }

    // Create subscription in Stripe
    const subResult = await createSubscription(
      stripeCustomerId,
      stripePriceId,
      {
        organization_id: organizationId,
        plan_id: planId,
      }
    );

    // Extract subscription details with explicit typing
    const { current_period_start, current_period_end, id, status } = subResult as unknown as {
      current_period_start: number;
      current_period_end: number;
      id: string;
      status: string;
    };

    // Save subscription to database
    const periodStart = new Date(current_period_start * 1000);
    const periodEnd = new Date(current_period_end * 1000);

    await saveStripeSubscription(
      organizationId,
      id,
      stripePriceId,
      planId,
      status,
      periodStart,
      periodEnd
    );

    return NextResponse.json({
      success: true,
      subscription: {
        id: id,
        status: status,
        planName: plan.name,
        amount: plan.price,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        clientSecret: (subResult as any).latest_invoice?.payment_intent
          ?.client_secret,
      },
    });
  } catch (error: any) {
    console.error("Assign subscription error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to assign subscription",
      },
      { status: 500 }
    );
  }
}
