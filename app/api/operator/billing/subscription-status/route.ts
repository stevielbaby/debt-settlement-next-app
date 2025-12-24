/**
 * GET /api/operator/billing/subscription-status
 * Check if organization has an active subscription
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { sql } from "@/app/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "operator") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const organizationId = (session.user as any).organization_id;
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "No organization assigned" },
        { status: 400 }
      );
    }

    // Check for active subscriptions
    const subscriptionResult = await sql`
      SELECT
        s.id,
        s.stripe_subscription_id,
        s.status,
        s.current_period_start,
        s.current_period_end,
        p.name as plan_name,
        p.price as plan_price
      FROM app.organization_subscriptions s
      JOIN app.subscription_plans p ON s.plan_id = p.id
      WHERE s.organization_id = ${organizationId}
      AND s.status IN ('active', 'trialing')
      ORDER BY s.created_at DESC
      LIMIT 1
    `;

    if (subscriptionResult.length > 0) {
      const subscription = subscriptionResult[0];
      return NextResponse.json({
        success: true,
        hasSubscription: true,
        subscription: {
          id: subscription.id,
          stripeId: subscription.stripe_subscription_id,
          status: subscription.status,
          planName: subscription.plan_name,
          planPrice: subscription.plan_price,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
        },
      });
    } else {
      return NextResponse.json({
        success: true,
        hasSubscription: false,
      });
    }
  } catch (error: any) {
    console.error("Check subscription status error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check subscription status" },
      { status: 500 }
    );
  }
}
