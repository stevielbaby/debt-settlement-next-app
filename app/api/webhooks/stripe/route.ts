/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 * No authentication required (but signature verified)
 */

import { NextResponse } from "next/server";
import { getWebhookEvent, stripe } from "@/lib/stripe";
import {
  updateInvoiceStatus,
  saveStripeSubscription,
} from "@/lib/stripe-db";
import { sql } from "@/app/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature") || "";
    const secret = process.env.STRIPE_WEBHOOK_SECRET || "";

    if (!secret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { success: false, error: "Webhook not configured" },
        { status: 500 }
      );
    }

    // Verify webhook signature
    const event = await getWebhookEvent(body, signature, secret);

    console.log(`Processing Stripe event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case "invoice.paid": {
        const invoice = event.data.object as any;
        console.log(`Invoice paid: ${invoice.id}`);

        // Update invoice status in database
        const paidDate = new Date(invoice.paid_at * 1000);
        await updateInvoiceStatus(invoice.id, "paid", paidDate);

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        console.log(`Invoice payment failed: ${invoice.id}`);

        // Update invoice status
        await updateInvoiceStatus(invoice.id, "past_due");

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        console.log(`Subscription updated: ${subscription.id}`);

        // Get organization from customer metadata
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        const organizationId = (customer as any).metadata?.organization_id;

        if (organizationId) {
          const periodStart = new Date(subscription.current_period_start * 1000);
          const periodEnd = new Date(subscription.current_period_end * 1000);

          // Get plan ID from our database using price ID
          const item = subscription.items.data[0];
          const priceId = item.price.id;

          const planResult = await sql`
            SELECT id FROM app.subscription_plans
            WHERE stripe_price_id = ${priceId}
            LIMIT 1
          `;

          if (planResult.length > 0) {
            await saveStripeSubscription(
              organizationId,
              subscription.id,
              priceId,
              planResult[0].id,
              subscription.status,
              periodStart,
              periodEnd
            );
          }
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        console.log(`Subscription deleted: ${subscription.id}`);

        // Get organization from customer metadata
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        const organizationId = (customer as any).metadata?.organization_id;

        if (organizationId) {
          // Update subscription status in database
          await sql`
            UPDATE app.organization_subscriptions
            SET status = 'canceled',
                updated_at = NOW()
            WHERE stripe_subscription_id = ${subscription.id}
          `;
        }

        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as any;
        console.log(`Payment intent succeeded: ${paymentIntent.id}`);

        // Handle one-time payment success
        // You can store this event for later reference
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as any;
        console.log(`Payment intent failed: ${paymentIntent.id}`);

        // Handle payment failure
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 400 }
    );
  }
}
