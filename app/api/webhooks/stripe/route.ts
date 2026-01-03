/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 * No authentication required (but signature verified)
 * PHASE 3B: Basic webhook handling implemented
 */

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { getWebhookEvent } from "@/lib/stripe";

/**
 * Handle subscription created/updated events
 */
async function handleSubscriptionEvent(event: any) {
  const subscription = event.data.object;
  const stripeCustomerId = subscription.customer;

  console.log(`🔄 Processing subscription ${subscription.id} with status ${subscription.status} for customer ${stripeCustomerId}`);

  // #region agent log - subscription event handler
  fetch('http://127.0.0.1:7242/ingest/1b3163b7-f1ae-4e91-bf21-62593b0c9267', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'app/api/webhooks/stripe/route.ts:handleSubscriptionEvent',
      message: 'Processing subscription event',
      data: {
        subscriptionId: subscription.id,
        status: subscription.status,
        customerId: stripeCustomerId,
        priceId: subscription.items.data[0]?.price?.id,
        eventType: event.type
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'webhook-debug',
      hypothesisId: 'WH2,WH4'
    })
  }).catch(() => {});
  // #endregion

  // Find the organization by Stripe customer ID
  const firm = await prisma.firm.findFirst({
    where: { stripeCustomerId },
    select: { id: true }
  });

  if (!firm) {
    console.error(`❌ No firm found for Stripe customer ${stripeCustomerId}`);
    return;
  }

  // Find the plan by Stripe price ID
  const priceId = subscription.items.data[0]?.price?.id;
  const plan = await prisma.stripePlan.findFirst({
    where: { stripePriceId: priceId },
    select: { id: true, name: true, priceCents: true }
  });

  if (!plan) {
    console.warn(`⚠️ No plan found for price ID ${priceId}, subscription may not display correctly`);
  }

  try {
    // Update or create subscription record
    const result = await prisma.firmSubscription.upsert({
      where: { firmId: firm.id },
      update: {
        stripeSubscriptionId: subscription.id,
        status: subscription.status.toUpperCase(),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        stripePriceId: priceId,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        updatedAt: new Date()
      },
      create: {
        firmId: firm.id,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        status: subscription.status.toUpperCase(),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false
      },
      include: {
        plan: true
      }
    });

    console.log(`✅ Successfully updated subscription ${subscription.id} for firm ${firm.id}`);
    console.log(`   Status: ${result.status}, Plan: ${result.plan?.name || 'Unknown'}, Price: $${(result.plan?.priceCents || 0) / 100}`);

  } catch (error) {
    console.error(`❌ Failed to update subscription ${subscription.id} for firm ${firm.id}:`, error);
    throw error; // Re-throw to mark webhook as failed
  }
}

/**
 * Handle subscription deleted events
 */
async function handleSubscriptionDeleted(event: any) {
  const subscription = event.data.object;
  const stripeCustomerId = subscription.customer;

  // Find the organization by Stripe customer ID
  const firm = await prisma.firm.findFirst({
    where: { stripeCustomerId },
    select: { id: true }
  });

  if (!firm) {
    console.error(`No firm found for Stripe customer ${stripeCustomerId}`);
    return;
  }

  // Update subscription status to cancelled
  await prisma.firmSubscription.updateMany({
    where: {
      firmId: firm.id,
      stripeSubscriptionId: subscription.id
    },
    data: {
      status: 'CANCELLED',
      updatedAt: new Date()
    }
  });

  console.log(`Cancelled subscription ${subscription.id} for firm ${firm.id}`);
}

/**
 * Handle invoice payment events
 */
async function handleInvoicePayment(event: any, status: string) {
  const invoice = event.data.object;

  // Find the organization by Stripe customer ID
  const firm = await prisma.firm.findFirst({
    where: { stripeCustomerId: invoice.customer },
    select: { id: true }
  });

  if (!firm) {
    console.error(`No firm found for Stripe customer ${invoice.customer}`);
    return;
  }

  // Update or create invoice record
  await prisma.invoice.upsert({
    where: { stripeInvoiceId: invoice.id },
    update: {
      status: status === 'paid' ? 'paid' : 'uncollectible',
      paidDate: status === 'paid' ? new Date(invoice.status_transitions?.paid_at * 1000) : undefined,
      updatedAt: new Date()
    },
    create: {
      firmId: firm.id,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_due,
      status: status === 'paid' ? 'paid' : 'uncollectible',
      issueDate: new Date(invoice.created * 1000),
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : undefined,
      paidDate: status === 'paid' ? new Date(invoice.status_transitions?.paid_at * 1000) : undefined
    }
  });

  console.log(`Updated invoice ${invoice.id} with status ${status} for firm ${firm.id}`);
}

export async function POST(request: Request) {
  // #region agent log - webhook received
  fetch('http://127.0.0.1:7242/ingest/1b3163b7-f1ae-4e91-bf21-62593b0c9267', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'app/api/webhooks/stripe/route.ts:webhook-entry',
      message: 'Stripe webhook received',
      data: {
        headers: Object.fromEntries(request.headers.entries()),
        method: request.method,
        url: request.url
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'webhook-debug',
      hypothesisId: 'WH1,WH2,WH3,WH4,WH5'
    })
  }).catch(() => {});
  // #endregion

  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature") || "";
    const secret = process.env.STRIPE_WEBHOOK_SECRET || "";

    // #region agent log - webhook secret check
    fetch('http://127.0.0.1:7242/ingest/1b3163b7-f1ae-4e91-bf21-62593b0c9267', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/api/webhooks/stripe/route.ts:webhook-secret-check',
        message: 'Checking webhook secret',
        data: {
          hasSecret: !!secret,
          secretLength: secret.length,
          hasSignature: !!signature
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'webhook-debug',
        hypothesisId: 'WH1'
      })
    }).catch(() => {});
    // #endregion

    if (!secret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { success: false, error: "Webhook not configured" },
        { status: 500 }
      );
    }

    // Verify webhook signature
    const event = await getWebhookEvent(body, signature, secret);

    // Log the event (Phase 3B: Basic logging, no full processing yet)
    await prisma.webhookEvent.create({
      data: {
        eventId: event.id,
        eventType: event.type,
        processed: false,
        rawPayload: JSON.parse(JSON.stringify(event.data)),
      }
    });

    console.log(`Stripe webhook received: ${event.type}`);

    // #region agent log - event processing start
    fetch('http://127.0.0.1:7242/ingest/1b3163b7-f1ae-4e91-bf21-62593b0c9267', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/api/webhooks/stripe/route.ts:event-processing',
        message: 'Processing webhook event',
        data: {
          eventType: event.type,
          eventId: event.id,
          created: event.created
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'webhook-debug',
        hypothesisId: 'WH2,WH3,WH4'
      })
    }).catch(() => {});
    // #endregion

    // Process webhook events
    let processedSuccessfully = false;

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await handleSubscriptionEvent(event);
          processedSuccessfully = true;
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event);
          processedSuccessfully = true;
          break;

        case 'invoice.payment_succeeded':
          await handleInvoicePayment(event, 'paid');
          processedSuccessfully = true;
          break;

        case 'invoice.payment_failed':
          await handleInvoicePayment(event, 'failed');
          processedSuccessfully = true;
          break;

        default:
          // Mark other important events as processed without specific handling
          const importantEvents = [
            'customer.subscription.created',
            'customer.subscription.updated',
            'customer.subscription.deleted',
            'invoice.payment_succeeded',
            'invoice.payment_failed'
          ];

          if (importantEvents.includes(event.type)) {
            processedSuccessfully = true;
          }
      }

      // Mark event as processed
      await prisma.webhookEvent.update({
        where: { eventId: event.id },
        data: { processed: processedSuccessfully }
      });

      console.log(`Webhook ${event.type} ${processedSuccessfully ? 'processed successfully' : 'marked as processed'}`);
    } catch (processingError) {
      console.error(`Error processing webhook ${event.type}:`, processingError);
      // Still mark as processed to avoid infinite retries, but log the error
      await prisma.webhookEvent.update({
        where: { eventId: event.id },
        data: {
          processed: true,
          errorMessage: processingError.message
        }
      });
    }

    return NextResponse.json({ success: true, received: true });

  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'WEBHOOK_ERROR',
          message: error.message || 'Webhook processing failed'
        }
      },
      { status: 400 }
    );
  }
}
