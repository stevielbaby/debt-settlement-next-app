import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/app/lib/db";
import { cancelSubscription } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Cancel an organization's subscription
 * POST /api/webmaster/subscriptions/cancel
 */
export async function POST(request: Request) {
  try {
    // 1. Verify webmaster authentication
    const session = await auth();
    if (!session?.user || session.user.role !== "webmaster") {
      console.log("[Cancel Subscription] Unauthorized access attempt");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[Cancel Subscription] Request from:", session.user.email);

    // 2. Parse and validate request body
    const body = await request.json();
    const { subscriptionId, immediate } = body;

    if (!subscriptionId) {
      return NextResponse.json(
        { success: false, error: "Subscription ID is required" },
        { status: 400 }
      );
    }

    console.log("[Cancel Subscription] Processing cancellation:", {
      subscriptionId,
      immediate: immediate || false,
    });

    // 3. Get subscription from database
    const subscriptionResult = await sql`
      SELECT 
        os.id,
        os.organization_id,
        os.stripe_subscription_id,
        os.status,
        o.firm_name
      FROM app.organization_subscriptions os
      JOIN app.organizations o ON os.organization_id = o.id
      WHERE os.id = ${subscriptionId}
    `;

    if (subscriptionResult.length === 0) {
      console.log("[Cancel Subscription] Subscription not found:", subscriptionId);
      return NextResponse.json(
        { success: false, error: "Subscription not found" },
        { status: 404 }
      );
    }

    const subscription = subscriptionResult[0];

    // Check if subscription is already canceled or pending cancellation
    if (subscription.status === "canceled") {
      console.log("[Cancel Subscription] Subscription already fully canceled");
      return NextResponse.json(
        { success: false, error: "Subscription is already canceled" },
        { status: 400 }
      );
    }

    // Check if cancellation is already pending (delayed cancellation)
    // BUT: Allow immediate cancellation to override a pending delayed cancellation
    if (subscription.cancel_at_period_end === true && !immediate) {
      console.log("[Cancel Subscription] Subscription already scheduled for cancellation at period end");
      return NextResponse.json(
        { success: false, error: "Subscription is already scheduled for cancellation at the end of the billing period. Click 'Cancel Immediately' to cancel now instead." },
        { status: 400 }
      );
    }

    if (subscription.cancel_at_period_end === true && immediate) {
      console.log("[Cancel Subscription] Upgrading delayed cancellation to immediate cancellation");
    }

    if (!subscription.stripe_subscription_id) {
      console.log("[Cancel Subscription] No Stripe subscription ID found");
      return NextResponse.json(
        { success: false, error: "No Stripe subscription associated with this subscription" },
        { status: 400 }
      );
    }

    // Validate that the Stripe subscription actually exists before trying to cancel
    console.log("[Cancel Subscription] Validating Stripe subscription exists:", subscription.stripe_subscription_id);
    let stripeSubExists = false;
    try {
      const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
      stripeSubExists = true;
      console.log("[Cancel Subscription] Stripe subscription found:", {
        id: stripeSubscription.id,
        status: stripeSubscription.status,
      });
    } catch (retrieveError: any) {
      console.warn("[Cancel Subscription] Stripe subscription not found (may be orphaned):", {
        stripeSubId: subscription.stripe_subscription_id,
        error: retrieveError.message,
        code: retrieveError.code,
      });
      
      // Subscription doesn't exist in Stripe - clean up database
      console.log("[Cancel Subscription] Cleaning up orphaned database record");
      await sql`
        UPDATE app.organization_subscriptions
        SET status = 'canceled',
            cancel_at_period_end = false,
            stripe_subscription_id = NULL,
            updated_at = NOW()
        WHERE id = ${subscriptionId}
      `;
      
      return NextResponse.json({
        success: true,
        message: "Subscription database record cleaned (orphaned from Stripe)",
        subscription: {
          id: subscription.id,
          organization_id: subscription.organization_id,
          firm_name: subscription.firm_name,
          status: "canceled",
          cancel_at_period_end: false,
          note: "This subscription did not exist in your Stripe account. Database record has been marked as canceled and Stripe ID cleared.",
        },
      });
    }

    console.log("[Cancel Subscription] Processing cancellation:", {
      stripeSubId: subscription.stripe_subscription_id,
      organization: subscription.firm_name,
      immediate: immediate || false,
    });

    // 4. Cancel subscription in Stripe
    const canceledStripeSubscription = await cancelSubscription(
      subscription.stripe_subscription_id,
      immediate || false
    );

    console.log("[Cancel Subscription] Stripe cancellation successful:", {
      id: canceledStripeSubscription.id,
      status: canceledStripeSubscription.status,
      cancel_at_period_end: canceledStripeSubscription.cancel_at_period_end,
    });

    // 5. Update database status
    // If immediate cancellation, update status to 'canceled' immediately
    // If delayed (end-of-period), set flag and wait for webhook to update status
    if (immediate) {
      await sql`
        UPDATE app.organization_subscriptions
        SET status = 'canceled',
            cancel_at_period_end = false,
            updated_at = NOW()
        WHERE id = ${subscriptionId}
      `;
      console.log("[Cancel Subscription] Database updated to canceled status");
    } else {
      // Set flag to indicate pending cancellation at period end
      await sql`
        UPDATE app.organization_subscriptions
        SET cancel_at_period_end = true,
            updated_at = NOW()
        WHERE id = ${subscriptionId}
      `;
      console.log("[Cancel Subscription] Marked for cancellation at period end, flag set");
    }

    // 6. Return success response
    return NextResponse.json({
      success: true,
      message: immediate
        ? "Subscription canceled immediately"
        : "Subscription will be canceled at the end of the billing period",
      subscription: {
        id: subscription.id,
        organization_id: subscription.organization_id,
        firm_name: subscription.firm_name,
        status: immediate ? "canceled" : subscription.status,
        cancel_at_period_end: !immediate,
      },
    });
  } catch (error: any) {
    console.error("[Cancel Subscription] Error:", {
      message: error.message,
      stack: error.stack,
      error,
    });

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to cancel subscription",
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
