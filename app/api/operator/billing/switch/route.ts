import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/app/lib/db";
import { createStripePrice, createStripeProduct, stripe } from "@/lib/stripe";
import { savePlanStripeIds } from "@/lib/stripe-db";

async function monthlyPriceId(plan: {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
}) {
  if (plan.stripe_price_id) {
    try {
      const existing = await stripe.prices.retrieve(plan.stripe_price_id);
      if (existing.active) return plan.stripe_price_id;
    } catch {
      // The stored price is not usable. Create a new one below.
    }
  }

  let productId = plan.stripe_product_id;
  if (!productId) {
    const product = await createStripeProduct(
      plan.name,
      plan.description || `Plan: ${plan.name}`,
      { plan_id: plan.id }
    );
    productId = product.id;
  }

  const price = await createStripePrice(
    productId,
    Math.round(Number(plan.price) * 100),
    "usd",
    "month",
    { plan_id: plan.id, billing_period: "month" }
  );
  await savePlanStripeIds(plan.id, productId, price.id);
  return price.id;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const role = session?.user?.role;
    if (!session?.user || (role !== "operator" && role !== "webmaster")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = session.user.orgId;
    if (!organizationId) {
      return NextResponse.json({ success: false, error: "No organization assigned" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const planId = String(body.planId || "");
    if (!planId) {
      return NextResponse.json({ success: false, error: "Choose a plan" }, { status: 400 });
    }

    const plans = await sql`
      SELECT id, name, description, price, stripe_product_id, stripe_price_id
      FROM app.subscription_plans
      WHERE id = ${planId} AND COALESCE(is_deprecated, false) = false
      LIMIT 1
    `;
    const plan = plans[0];
    if (!plan) {
      return NextResponse.json({ success: false, error: "Plan not found" }, { status: 404 });
    }

    const subs = await sql`
      SELECT id, stripe_subscription_id
      FROM app.organization_subscriptions
      WHERE organization_id = ${organizationId}
        AND stripe_subscription_id IS NOT NULL
        AND status IN ('active', 'trialing', 'past_due')
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    const current = subs[0];
    if (!current) {
      return NextResponse.json({ success: false, error: "No active subscription to switch" }, { status: 404 });
    }

    const priceId = await monthlyPriceId(plan as {
      id: string;
      name: string;
      description: string | null;
      price: number;
      stripe_product_id: string | null;
      stripe_price_id: string | null;
    });
    const stripeSubscription = await stripe.subscriptions.retrieve(current.stripe_subscription_id);
    const itemId = stripeSubscription.items.data[0]?.id;
    if (!itemId) {
      return NextResponse.json({ success: false, error: "Subscription has no billable item" }, { status: 400 });
    }

    await stripe.subscriptions.update(current.stripe_subscription_id, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: "none",
      cancel_at_period_end: false,
    });

    await sql`
      UPDATE app.organization_subscriptions
      SET plan_id = ${plan.id},
          stripe_price_id = ${priceId},
          cancel_at_period_end = false,
          updated_at = NOW()
      WHERE id = ${current.id}
    `;

    return NextResponse.json({ success: true, planId: plan.id, amount: Number(plan.price) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not switch plans";
    console.error("Switch plan error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
