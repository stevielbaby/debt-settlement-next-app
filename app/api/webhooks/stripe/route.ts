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
  saveStripeInvoice,
  markWebhookProcessed,
  isWebhookProcessed,
  logBillingEvent,
  createOperatorSubscriptionNotification,
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

    console.log(`Processing Stripe event: ${event.type} (${event.id})`);

    // Check if this event has already been processed (idempotency)
    try {
      if (await isWebhookProcessed(event.id)) {
        console.log(`Event ${event.id} already processed, skipping`);
        return NextResponse.json({ success: true, received: true, duplicate: true });
      }
    } catch (err) {
      // webhook_events table might not exist yet, continue without deduplication
      console.log("webhook_events table not available, skipping deduplication check");
    }

    // Process the event BEFORE marking as processed (prevents data loss if handler fails)
    let eventProcessed = false;

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

      case "invoice.created": {
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string;

        console.log(`Invoice created: ${invoice.id}`);

        // Find organization by Stripe customer ID
        try {
          const orgResult = await sql`
            SELECT id FROM app.organizations
            WHERE stripe_customer_id = ${customerId}
            LIMIT 1
          `;

          if (orgResult.length > 0) {
            const organizationId = orgResult[0].id;

            // Save invoice to database if not exists
            const existingInvoice = await sql`
              SELECT id FROM app.invoices
              WHERE stripe_invoice_id = ${invoice.id}
              LIMIT 1
            `;

            if (existingInvoice.length === 0) {
              const periodStart = invoice.period_start
                ? new Date(invoice.period_start * 1000)
                : new Date();
              const periodEnd = invoice.period_end
                ? new Date(invoice.period_end * 1000)
                : new Date();
              const dueDate = invoice.due_date
                ? new Date(invoice.due_date * 1000)
                : new Date(periodEnd.getTime() + 30 * 24 * 60 * 60 * 1000);

              await saveStripeInvoice(
                organizationId,
                invoice.id,
                (invoice.amount_due || 0) / 100,
                invoice.status || "draft",
                new Date(invoice.created * 1000),
                dueDate
              );

              // Log event
              await logBillingEvent(organizationId, "invoice.created", event.id, {
                invoiceId: invoice.id,
                amount: invoice.amount_due,
              });
            }
          }
        } catch (err) {
          console.error("Error processing invoice.created:", err);
        }

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        console.log(`Subscription updated: ${subscription.id}`);

        try {
          // Get organization from customer metadata
          const customer = await stripe.customers.retrieve(subscription.customer as string);

          const organizationId = (customer as any).metadata?.organization_id;

          // Validate organizationId before processing
          if (!organizationId) {
            console.error(`Subscription ${subscription.id} has no organizationId in metadata`);
            break;
          }

          // For canceled subscriptions, only update database status - don't try to update Stripe
          if (subscription.status === 'canceled') {
            console.log(`Subscription ${subscription.id} is canceled, updating database only`);
            
            const existingSub = await sql`
              SELECT id FROM app.organization_subscriptions
              WHERE stripe_subscription_id = ${subscription.id}
              LIMIT 1
            `;

            if (existingSub.length > 0) {
              await sql`
                UPDATE app.organization_subscriptions
                SET status = 'canceled',
                    cancel_at_period_end = false,
                    updated_at = NOW()
                WHERE id = ${existingSub[0].id}
              `;

              await logBillingEvent(organizationId, "subscription.canceled", event.id, {
                subscriptionId: subscription.id,
              });
            }
            break;  // Exit early - don't try to save to Stripe
          }

          const periodStart = new Date(subscription.current_period_start * 1000);
          const periodEnd = new Date(subscription.current_period_end * 1000);

          // Get plan ID from our database using price ID
          const item = subscription.items.data[0];
          const priceId = item.price.id;

          const planResult = await sql`
            SELECT id FROM app.subscription_plans
            WHERE stripe_price_id = ${priceId} OR yearly_stripe_price_id = ${priceId}
            LIMIT 1
          `;

          if (planResult.length > 0) {
            const billingPeriod = 
              (await sql`
                SELECT stripe_price_id, yearly_stripe_price_id FROM app.subscription_plans
                WHERE id = ${planResult[0].id}
              `)[0];

            const period = billingPeriod.yearly_stripe_price_id === priceId ? "year" : "month";

            await saveStripeSubscription(
              organizationId,
              subscription.id,
              priceId,
              planResult[0].id,
              subscription.status,
              periodStart,
              periodEnd,
              period as "month" | "year"
            );

            // Log event
            await logBillingEvent(organizationId, "subscription.updated", event.id, {
              subscriptionId: subscription.id,
              status: subscription.status,
            });
          }
        } catch (error) {
          console.error(`Error processing subscription.updated event ${event.id}:`, error);
          // Don't rethrow - return 200 to prevent Stripe retry, but log the error
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        console.log(`Subscription deleted: ${subscription.id}`);

        try {
          // Get organization from customer metadata
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          const organizationId = (customer as any).metadata?.organization_id;

          // Validate organizationId before processing
          if (!organizationId) {
            console.error(`Subscription ${subscription.id} has no organizationId in metadata`);
            break;
          }

          // Update subscription status in database
          await sql`
            UPDATE app.organization_subscriptions
            SET status = 'canceled',
                cancel_at_period_end = false,
                updated_at = NOW()
            WHERE stripe_subscription_id = ${subscription.id}
          `;

          // Log event
          await logBillingEvent(organizationId, "subscription.canceled", event.id, {
            subscriptionId: subscription.id,
          });
        } catch (error) {
          console.error(`Error processing subscription deleted: ${error}`);
          // Don't rethrow - return 200 to prevent Stripe retry, but log the error
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

      case "checkout.session.completed": {
        const session = event.data.object as any;
        console.log(`Checkout session completed: ${session.id}`);

        // Only handle subscription mode
        if (session.mode !== 'subscription') {
          break;
        }

        try {
          const organizationId = session.metadata?.organization_id;
          const planId = session.metadata?.plan_id;
          const billingPeriod = session.metadata?.billing_period || 'month';

          if (!organizationId || !planId) {
            console.error('Checkout session missing organization_id or plan_id metadata');
            break;
          }

          // Get subscription details from Stripe
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string) as any;
          const priceId = subscription.items.data[0]?.price.id;

          const periodStart = new Date(subscription.current_period_start * 1000);
          const periodEnd = new Date(subscription.current_period_end * 1000);

          // Save to app.organization_subscriptions
          await saveStripeSubscription(
            organizationId,
            subscription.id,
            priceId,
            planId,
            subscription.status,
            periodStart,
            periodEnd,
            billingPeriod as "month" | "year"
          );

          console.log(`Created subscription record for org ${organizationId}`);

          // Create notification for webmaster
          await createOperatorSubscriptionNotification(
            organizationId,
            planId,
            subscription.id,
            event.id
          );

          // Log event
          await logBillingEvent(organizationId, "subscription.created", event.id, {
            subscriptionId: subscription.id,
            planId,
            billingPeriod,
          });

        } catch (error) {
          console.error('Error processing checkout.session.completed:', error);
          // Don't throw - return 200 to prevent Stripe retry
        }

        break;
      }

      case "customer.deleted": {
        const customer = event.data.object as any;
        console.log(`Customer deleted: ${customer.id}`);

        try {
          // Find the organization by Stripe customer ID
          const orgResult = await sql`
            SELECT id, stripe_customer_id FROM app.organizations
            WHERE stripe_customer_id = ${customer.id}
            LIMIT 1
          `;

          if (orgResult.length > 0) {
            const organizationId = orgResult[0].id;
            console.log(`Found organization ${organizationId} for deleted customer ${customer.id}`);

            // Cancel all active subscriptions for this organization in Stripe
            const subscriptions = await stripe.subscriptions.list({
              customer: customer.id,
              status: "all",
              limit: 100,
            });

            for (const subscription of subscriptions.data) {
              if (subscription.status !== "canceled") {
                try {
                  await stripe.subscriptions.cancel(subscription.id);
                  console.log(`Canceled Stripe subscription ${subscription.id}`);
                } catch (err) {
                  console.error(`Error canceling subscription ${subscription.id}:`, err);
                }
              }
            }

            // Clear all organization subscription records in database
            await sql`
              UPDATE app.organization_subscriptions
              SET status = 'canceled',
                  cancel_at_period_end = false,
                  stripe_subscription_id = NULL,
                  updated_at = NOW()
              WHERE organization_id = ${organizationId}
              AND status != 'canceled'
            `;

            // Clear Stripe customer reference
            await sql`
              UPDATE app.organizations
              SET stripe_customer_id = NULL,
                  updated_at = NOW()
              WHERE id = ${organizationId}
            `;

            // Log event
            await logBillingEvent(organizationId, "customer.deleted", event.id, {
              customerId: customer.id,
            });

            console.log(`Successfully cleaned up organization ${organizationId} from deleted customer`);
          } else {
            console.log(`No organization found for deleted customer ${customer.id}`);
          }
        } catch (error) {
          console.error(`Error processing customer.deleted event ${event.id}:`, error);
        }

        break;
      }

      case "invoice.deleted": {
        const invoice = event.data.object as any;
        console.log(`Invoice deleted: ${invoice.id}`);

        try {
          // Find and delete orphaned invoice records
          const invoiceResult = await sql`
            SELECT id, organization_id FROM app.invoices
            WHERE stripe_invoice_id = ${invoice.id}
            LIMIT 1
          `;

          if (invoiceResult.length > 0) {
            const organizationId = invoiceResult[0].organization_id;

            // Delete the invoice from database
            await sql`
              DELETE FROM app.invoices
              WHERE stripe_invoice_id = ${invoice.id}
            `;

            // Log event
            await logBillingEvent(organizationId, "invoice.deleted", event.id, {
              invoiceId: invoice.id,
            });

            console.log(`Deleted invoice ${invoice.id} from database`);
          } else {
            console.log(`No invoice record found for deleted Stripe invoice ${invoice.id}`);
          }
        } catch (error) {
          console.error(`Error processing invoice.deleted event ${event.id}:`, error);
        }

        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as any;
        console.log(`Charge refunded: ${charge.id}`);

        try {
          // If charge is fully refunded, mark related invoice as needs review
          if (charge.refunded && charge.refund_count > 0) {
            const invoiceId = charge.invoice as string;

            if (invoiceId && invoiceId !== "null") {
              // Find related organization and invoice
              const invoiceResult = await sql`
                SELECT id, organization_id, stripe_invoice_id 
                FROM app.invoices
                WHERE stripe_invoice_id = ${invoiceId}
                LIMIT 1
              `;

              if (invoiceResult.length > 0) {
                const organizationId = invoiceResult[0].organization_id;

                // Log refund event for auditing
                await logBillingEvent(organizationId, "charge.refunded", event.id, {
                  chargeId: charge.id,
                  invoiceId: invoiceId,
                  refundAmount: charge.amount_refunded,
                  fullRefund: charge.refunded,
                });

                console.log(
                  `Recorded refund: charge ${charge.id}, amount ${charge.amount_refunded}, invoice ${invoiceId}`
                );
              }
            }
          }
        } catch (error) {
          console.error(`Error processing charge.refunded event ${event.id}:`, error);
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark as processed ONLY AFTER successful processing (prevents data loss)
    try {
      await markWebhookProcessed(event.id, event.type);
      eventProcessed = true;
    } catch (err) {
      console.log("Could not mark webhook as processed:", err);
      // Even if we can't mark it, we've processed it, so return 200
    }

    return NextResponse.json({ success: true, received: true, processed: eventProcessed });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 400 }
    );
  }
}
