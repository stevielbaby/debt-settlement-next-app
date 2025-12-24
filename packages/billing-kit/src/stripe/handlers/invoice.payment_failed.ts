/**
 * Webhook Handler: invoice.payment_failed
 * Triggered when an invoice payment fails
 */

import type Stripe from 'stripe';
import type { WebhookContext } from '../webhook';
import {
  findBillingAccountByStripeCustomerId,
  upsertInvoice,
} from '../../db/queries';
import { DatabaseError } from '../../errors';

export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  context: WebhookContext
): Promise<void> {
  const { db, logger } = context;

  logger.warn('[billing-kit] Processing invoice.payment_failed', {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    amountDue: invoice.amount_due,
    attemptCount: invoice.attempt_count,
  });

  const customerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id;

  if (!customerId) {
    throw new DatabaseError('Invoice has no customer', {
      invoiceId: invoice.id,
    });
  }

  // Find billing account
  const billingAccount = await findBillingAccountByStripeCustomerId(db, customerId);
  if (!billingAccount) {
    throw new DatabaseError('Billing account not found for customer', {
      customerId,
    });
  }

  // Extract subscription ID
  const rawSub = invoice.parent?.subscription_details?.subscription ?? (invoice as any).subscription ?? null;
  const subscriptionId =
    typeof rawSub === 'string'
      ? rawSub
      : rawSub?.id || null;

  // Upsert invoice record
  await upsertInvoice(db, {
    billing_account_id: billingAccount.id,
    stripe_invoice_id: invoice.id,
    stripe_subscription_id: subscriptionId,
    status: invoice.status as any,
    currency: invoice.currency,
    amount_due: invoice.amount_due,
    amount_paid: invoice.amount_paid,
    amount_remaining: invoice.amount_remaining,
    hosted_invoice_url: invoice.hosted_invoice_url,
    invoice_pdf: invoice.invoice_pdf,
  });

  logger.warn('[billing-kit] Invoice payment failure recorded', {
    invoiceId: invoice.id,
    status: invoice.status,
    amountDue: invoice.amount_due,
    attemptCount: invoice.attempt_count,
  });

  // Optional: Trigger grace period logic here
  // Host app can customize this behavior via entitlements policy
}
