/**
 * GET /api/operator/billing/assigned-plans
 * Get only the plans assigned to this operator's organization
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

    // Get the organization's assigned plans
    // In this system, all active plans are available to all operators
    // But you can modify this to query a organization_plans junction table if you want
    // to restrict certain plans to certain organizations
    
    const result = await sql`
      SELECT 
        id, name, description, price, monthly_limit, features, is_active,
        stripe_product_id, stripe_price_id, yearly_stripe_price_id
      FROM app.subscription_plans
      WHERE is_active = true
      ORDER BY monthly_limit ASC
    `;

    const plans = result.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      monthlyPrice: parseFloat(row.price),
      yearlyPrice: Math.round(parseFloat(row.price) * 10), // 10 months for yearly (2 months free)
      monthlyLimit: parseInt(row.monthly_limit),
      features: row.features || [],
      isActive: row.is_active,
      stripeProductId: row.stripe_product_id,
      monthlyStripePriceId: row.stripe_price_id,
      yearlyStripePriceId: row.yearly_stripe_price_id,
    }));

    return NextResponse.json({
      success: true,
      plans,
    });
  } catch (error) {
    console.error("Get assigned plans error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}
