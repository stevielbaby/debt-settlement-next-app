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
        os.id,
        os.status,
        os.current_period_start,
        os.current_period_end,
        sp.name as plan_name,
        sp.price,
        sp.monthly_limit,
        COALESCE(um.metric_value, 0) as current_usage
      FROM app.organization_subscriptions os
      JOIN app.subscription_plans sp ON os.plan_id = sp.id
      LEFT JOIN app.usage_metrics um ON os.organization_id = um.org_id
        AND um.metric_type = 'case_created'
        AND um.billing_cycle_start <= CURRENT_DATE AND um.billing_cycle_end >= CURRENT_DATE
      WHERE os.organization_id = ${organizationId} OR os.org_id = ${organizationId}
      LIMIT 1
    `;

    if (subResult.length === 0) {
      return NextResponse.json({
        success: true,
        subscription: null,
        invoices: [],
      });
    }

    const sub = subResult[0];
    const periodEnd = new Date(sub.current_period_end);
    const today = new Date();
    const daysUntilRenewal = Math.ceil(
      (periodEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    const currentUsage = parseInt(sub.current_usage) || 0;
    const monthlyLimit = parseInt(sub.monthly_limit) || 1;
    const usagePercentage = (currentUsage / monthlyLimit) * 100;

    const subscription = {
      planName: sub.plan_name,
      status: sub.status,
      amount: parseFloat(sub.price),
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
      daysUntilRenewal: Math.max(0, daysUntilRenewal),
      caseLimit: monthlyLimit,
      currentUsage: currentUsage,
      usagePercentage: Math.min(100, usagePercentage),
    };

    // Get invoices
    const invoicesResult = await sql`
      SELECT 
        id,
        amount,
        status,
        issue_date,
        due_date,
        paid_date
      FROM app.invoices
      WHERE organization_id = ${organizationId}
      ORDER BY issue_date DESC
      LIMIT 12
    `;

    const invoices = invoicesResult.map((inv: any) => ({
      id: inv.id,
      amount: parseFloat(inv.amount),
      status: inv.status,
      date: inv.issue_date,
      dueDate: inv.due_date,
      paidDate: inv.paid_date,
    }));

    return NextResponse.json({
      success: true,
      subscription,
      invoices,
    });
  } catch (error) {
    console.error("Get operator payments error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch payment information" },
      { status: 500 }
    );
  }
}
