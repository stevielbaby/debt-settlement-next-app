/**
 * POST /api/operator/billing/cancel
 * Cancel an operator's subscription
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { sql } from "@/app/lib/db";
import { stripe, cancelSubscription } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "operator") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const organizationId = (session.user as any).organization_id || (session.user as any).orgId;
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "No organization assigned" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { immediate } = body;

    // Get subscription
    const subscriptionResult = await sql`
      SELECT 
        os.id,
        os.stripe_subscription_id,
        os.status,
        os.cancel_at_period_end
      FROM app.organization_subscriptions os
      WHERE (os.organization_id = ${organizationId} OR os.org_id = ${organizationId})
        AND os.status IN ('active', 'trialing')
      LIMIT 1
    `;

    if (subscriptionResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "No active subscription found" },
        { status: 404 }
      );
    }

    const subscription = subscriptionResult[0];

    if (!subscription.stripe_subscription_id) {
      return NextResponse.json(
        { success: false, error: "No Stripe subscription ID found" },
        { status: 400 }
      );
    }

    // Cancel in Stripe
    const canceledSubscription = await cancelSubscription(
      subscription.stripe_subscription_id,
      immediate || false
    );

    // Update database
    if (immediate) {
      await sql`
        UPDATE app.organization_subscriptions
        SET status = 'canceled',
            cancel_at_period_end = false,
            updated_at = NOW()
        WHERE id = ${subscription.id}
      `;
    } else {
      await sql`
        UPDATE app.organization_subscriptions
        SET cancel_at_period_end = true,
            updated_at = NOW()
        WHERE id = ${subscription.id}
      `;
    }

    return NextResponse.json({
      success: true,
      message: immediate
        ? "Subscription canceled immediately"
        : "Subscription will be canceled at the end of the billing period",
    });
  } catch (error: any) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}

