import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/app/lib/db";
import { cancelSubscription, stripe } from "@/lib/stripe";

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
    const action = body.action === "resume" ? "resume" : "cancel";

    const rows = await sql`
      SELECT id, stripe_subscription_id, status, cancel_at_period_end
      FROM app.organization_subscriptions
      WHERE organization_id = ${organizationId}
        AND stripe_subscription_id IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    const subscription = rows[0];
    if (!subscription) {
      return NextResponse.json({ success: false, error: "No active subscription" }, { status: 404 });
    }

    if (action === "resume") {
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: false,
      });
      await sql`
        UPDATE app.organization_subscriptions
        SET cancel_at_period_end = false, updated_at = NOW()
        WHERE id = ${subscription.id}
      `;
      return NextResponse.json({ success: true, cancelAtPeriodEnd: false });
    }

    if (subscription.cancel_at_period_end) {
      return NextResponse.json({ success: true, cancelAtPeriodEnd: true });
    }

    await cancelSubscription(subscription.stripe_subscription_id, false);
    await sql`
      UPDATE app.organization_subscriptions
      SET cancel_at_period_end = true, updated_at = NOW()
      WHERE id = ${subscription.id}
    `;

    return NextResponse.json({ success: true, cancelAtPeriodEnd: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update subscription";
    console.error("Operator cancel subscription error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
