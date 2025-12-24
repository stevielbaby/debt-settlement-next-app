/**
 * POST /api/stripe/webhook
 * Stripe webhook handler
 * 
 * CRITICAL: This route must NOT parse the body as JSON
 * Stripe signature verification requires the raw body
 */

import { processWebhook, getRawBody } from '@/packages/billing-kit/src/stripe/webhook';
import { createStripeClient } from '@/packages/billing-kit/src/stripe/client';
import { dbAdapter } from '@/lib/billing/db-adapter';
import { getBillingConfig } from '@/lib/billing/config';
import { NextResponse } from 'next/server';

// Important: Ensure edge runtime is NOT used (we need Node.js for Buffer)
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const config = getBillingConfig();
    const stripe = createStripeClient(config);

    // Get raw body (required for signature verification)
    const rawBody = await getRawBody(req);

    // Get Stripe signature from headers
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Process webhook
    const result = await processWebhook({
      rawBody,
      signature,
      stripe,
      db: dbAdapter,
      config,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    
    // Return 400 for webhook errors (Stripe will retry)
    return NextResponse.json(
      { 
        error: error.message || 'Webhook processing failed',
        code: error.code,
      },
      { status: 400 }
    );
  }
}
