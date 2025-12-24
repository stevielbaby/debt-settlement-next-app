/**
 * Stripe webhook processing engine
 * Handles signature verification, idempotency, and event dispatching
 */

import Stripe from 'stripe';
import { BillingConfig, Logger, noopLogger } from '../types';
import { WebhookProcessingError } from '../errors';
import type { DBAdapter } from '../adapters/db-adapter';
import {
  createStripeEvent,
  findStripeEventById,
  markStripeEventProcessed,
} from '../db/queries';

// Import handlers
import { handleCheckoutSessionCompleted } from './handlers/checkout.session.completed';
import { handleCustomerSubscriptionCreated } from './handlers/customer.subscription.created';
import { handleCustomerSubscriptionUpdated } from './handlers/customer.subscription.updated';
import { handleCustomerSubscriptionDeleted } from './handlers/customer.subscription.deleted';
import { handleInvoicePaymentSucceeded } from './handlers/invoice.payment_succeeded';
import { handleInvoicePaymentFailed } from './handlers/invoice.payment_failed';

/**
 * Webhook handler context (passed to all event handlers)
 */
export interface WebhookContext {
  stripe: Stripe;
  db: DBAdapter;
  config: BillingConfig;
  logger: Logger;
}

/**
 * Process incoming Stripe webhook
 * Returns 200 if event was processed or already seen (idempotent)
 * Throws WebhookProcessingError for signature failures or processing errors
 */
export async function processWebhook(params: {
  rawBody: string | Buffer;
  signature: string;
  stripe: Stripe;
  db: DBAdapter;
  config: BillingConfig;
}): Promise<{ success: boolean; eventId: string }> {
  const { rawBody, signature, stripe, db, config } = params;
  const logger = config.logger || noopLogger;

  // Step 1: Verify webhook signature
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      config.stripe_webhook_secret
    );
  } catch (error: any) {
    logger.error('[billing-kit] Webhook signature verification failed', {
      error: error.message,
    });
    throw new WebhookProcessingError('Webhook signature verification failed', {
      error: error.message,
    });
  }

  logger.info('[billing-kit] Webhook received', {
    eventId: event.id,
    type: event.type,
    livemode: event.livemode,
  });

  // Step 2: Check idempotency (have we seen this event before?)
  const existingEvent = await findStripeEventById(db, event.id);
  if (existingEvent) {
    if (existingEvent.processed) {
      logger.info('[billing-kit] Webhook already processed (idempotent)', {
        eventId: event.id,
      });
      return { success: true, eventId: event.id };
    }

    // Event exists but not yet processed (retry after failure)
    logger.warn('[billing-kit] Retrying failed webhook processing', {
      eventId: event.id,
      previousError: existingEvent.processing_error,
    });
  }

  // Step 3: Insert event record (if not exists)
  if (!existingEvent) {
    await createStripeEvent(db, {
      stripe_event_id: event.id,
      type: event.type,
      livemode: event.livemode,
      payload: event as any,
    });
  }

  // Step 4: Dispatch to appropriate handler
  const context: WebhookContext = {
    stripe,
    db,
    config,
    logger,
  };

  try {
    await dispatchWebhookEvent(event, context);

    // Step 5: Mark as processed
    await markStripeEventProcessed(db, event.id);

    logger.info('[billing-kit] Webhook processed successfully', {
      eventId: event.id,
      type: event.type,
    });

    return { success: true, eventId: event.id };
  } catch (error: any) {
    // Step 6: Record processing error
    const errorMessage = error.message || 'Unknown error';
    await markStripeEventProcessed(db, event.id, errorMessage);

    logger.error('[billing-kit] Webhook processing failed', {
      eventId: event.id,
      type: event.type,
      error: errorMessage,
    });

    throw new WebhookProcessingError('Webhook processing failed', {
      eventId: event.id,
      type: event.type,
      error: errorMessage,
    });
  }
}

/**
 * Route webhook event to appropriate handler
 */
async function dispatchWebhookEvent(
  event: Stripe.Event,
  context: WebhookContext
): Promise<void> {
  const { type } = event;

  // Map event types to handlers
  switch (type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(
        event.data.object as Stripe.Checkout.Session,
        context
      );
      break;

    case 'customer.subscription.created':
      await handleCustomerSubscriptionCreated(
        event.data.object as Stripe.Subscription,
        context
      );
      break;

    case 'customer.subscription.updated':
      await handleCustomerSubscriptionUpdated(
        event.data.object as Stripe.Subscription,
        context
      );
      break;

    case 'customer.subscription.deleted':
      await handleCustomerSubscriptionDeleted(
        event.data.object as Stripe.Subscription,
        context
      );
      break;

    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(
        event.data.object as Stripe.Invoice,
        context
      );
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(
        event.data.object as Stripe.Invoice,
        context
      );
      break;

    default:
      // Unhandled event type (not an error, just log)
      context.logger.debug('[billing-kit] Unhandled webhook event type', {
        type,
      });
      break;
  }
}

/**
 * Extract raw body from Next.js Request (required for signature verification)
 * Next.js 13+ App Router pattern
 */
export async function getRawBody(req: Request): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = req.body?.getReader();

  if (!reader) {
    throw new WebhookProcessingError('Request body is empty');
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  return Buffer.concat(chunks);
}
