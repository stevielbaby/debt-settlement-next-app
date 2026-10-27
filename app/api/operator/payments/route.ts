/**
 * GET /api/operator/payments
 * Get subscription and invoice information for an organization
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { sql } from "@/app/lib/db";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || !session.user.orgId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const organizationId = session.user.orgId;

    // Get subscription info
    const subResult = await sql`
      SELECT
        os.status,
        os.billing_period,
        os.current_period_start,
        os.current_period_end,
        os.stripe_subscription_id,
        os.cancel_at_period_end,
        sp.id as plan_id,
        sp.name as plan_name,
        sp.price,
        sp.description
      FROM app.organization_subscriptions os
      JOIN app.subscription_plans sp ON os.plan_id = sp.id
      WHERE os.organization_id = ${organizationId}
      ORDER BY os.updated_at DESC
      LIMIT 1
    `;

    const sub = subResult[0];
    const paid = Boolean(sub?.stripe_subscription_id) && ["active", "trialing", "past_due"].includes(sub.status);

    if (!paid) {
      return NextResponse.json({
        success: true,
        subscription: null,
        invoices: [],
      });
    }

    const periodEnd = sub.current_period_end ? new Date(sub.current_period_end) : null;
    const daysUntilRenewal = periodEnd
      ? Math.max(0, Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

    return NextResponse.json({
      success: true,
      subscription: {
        planId: sub.plan_id,
        planName: sub.plan_name,
        description: sub.description || "Monthly hosting and maintenance for your site.",
        status: sub.status,
        amount: parseFloat(sub.price),
        billingPeriod: sub.billing_period || "month",
        currentPeriodStart: sub.current_period_start,
        currentPeriodEnd: sub.current_period_end,
        daysUntilRenewal,
        cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      },
      invoices: [],
    });
  } catch (error) {
    console.error("Get operator payments error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch payment information" },
      { status: 500 }
    );
  }
}
