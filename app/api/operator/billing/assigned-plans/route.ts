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
    const role = session?.user?.role;
    if (!session?.user || (role !== "operator" && role !== "webmaster")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!session.user.orgId) {
      return NextResponse.json(
        { success: false, error: "No organization assigned" },
        { status: 400 }
      );
    }

    const result = await sql`
      SELECT
        id, name, description, price, features,
        stripe_product_id, stripe_price_id, stripe_yearly_price_id
      FROM app.subscription_plans
      WHERE COALESCE(is_deprecated, false) = false
        AND COALESCE(is_visible_to_operators, true) = true
      ORDER BY price ASC
    `;

    const plans = result.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description || "Monthly hosting and maintenance for your site.",
      monthlyPrice: parseFloat(row.price),
      features: Array.isArray(row.features) ? row.features : [],
      stripeProductId: row.stripe_product_id,
      monthlyStripePriceId: row.stripe_price_id,
      yearlyStripePriceId: row.stripe_yearly_price_id,
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
