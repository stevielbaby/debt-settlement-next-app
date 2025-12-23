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
  createStripeProduct,
  createStripePrice,
} from "@/lib/stripe";
import { saveStripeSubscription, getPlanStripePriceId, savePlanStripeIds } from "@/lib/stripe-db";
import { ensureStripeCustomerForOrganization } from "@/lib/billing";
import { sql } from "@/app/lib/db";

export async function POST(request: Request) {
  let organizationId = '';
  let planId = '';

  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "webmaster") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (err) {
      console.error("Failed to parse request JSON:", err);
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }
    
    organizationId = body.organizationId;
    planId = body.planId;
    console.log("Assign plan request:", { organizationId, planId });

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

    // Ensure Stripe customer exists (race-safe) via helper
    const stripeCustomerId = await ensureStripeCustomerForOrganization(organizationId);

    // Ensure plan has Stripe product/price; auto-provision if missing
    let stripePriceId = plan.stripe_price_id as string | null;
    if (!stripePriceId) {
      const unitAmount = Math.round(parseFloat(plan.price) * 100);
      const product = await createStripeProduct(plan.name, `Auto-created for plan ${plan.id}`, {
        plan_id: plan.id,
      });
      const price = await createStripePrice(product.id, unitAmount, "usd", "month", {
        plan_id: plan.id,
      });
      await savePlanStripeIds(plan.id, product.id, price.id);
      stripePriceId = price.id;
    }

    // Create subscription in Stripe
    console.log("Creating Stripe subscription with:", { stripeCustomerId, stripePriceId });
    const subResult = await createSubscription(
      stripeCustomerId,
      stripePriceId,
      {
        organization_id: organizationId,
        plan_id: planId,
      }
    );
    console.log("Stripe subscription result:", { id: subResult.id, status: subResult.status, current_period_start: (subResult as any).current_period_start, current_period_end: (subResult as any).current_period_end });

    // Extract subscription details with explicit typing
    const { current_period_start, current_period_end, id, status } = subResult as unknown as {
      current_period_start: number | null | undefined;
      current_period_end: number | null | undefined;
      id: string;
      status: string;
    };

    // Save subscription to database - convert Unix timestamps (seconds) to milliseconds
    let periodStart: Date;
    let periodEnd: Date;
    
    if (current_period_start && current_period_end) {
      periodStart = new Date(current_period_start * 1000);
      periodEnd = new Date(current_period_end * 1000);
    } else {
      // Fallback: use current time and add 1 month
      periodStart = new Date();
      periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Validate dates are valid
    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
      console.error("Invalid subscription period dates:", { current_period_start, current_period_end });
      return NextResponse.json(
        {
          success: false,
          error: `Invalid subscription period dates from Stripe: start=${current_period_start}, end=${current_period_end}`,
        },
        { status: 400 }
      );
    }

    await saveStripeSubscription(
      organizationId,
      id,
      stripePriceId,
      planId,
      status,
      periodStart,
      periodEnd,
      "month" // Default to monthly when webmaster assigns a plan
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
    // FIX 6: Enhanced error logging for Stripe-specific debugging
    console.error("Assign subscription error:", {
      message: error.message,
      code: error.code,
      stripeError: error.type,
      statusCode: error.statusCode,
      requestId: error.requestId,
      param: error.param,
      organizationId,
      planId,
      fullError: error,
    });
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to assign subscription",
        errorCode: error.code,
      },
      { status: 500 }
    );
  }
}
