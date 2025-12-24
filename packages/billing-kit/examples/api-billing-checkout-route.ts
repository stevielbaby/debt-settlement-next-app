/**
 * Example: POST /api/billing/checkout
 * Creates Stripe Checkout Session for subscription
 * Copy to: app/api/billing/checkout/route.ts
 */

import { createCheckoutSession } from '@billing-kit/core';
import { authAdapter } from '@/lib/billing/auth-adapter';
import { dbAdapter } from '@/lib/billing/db-adapter';
import { getBillingConfig } from '@/lib/billing/config';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const config = getBillingConfig();
    const body = await req.json();

    // Validate price_id
    if (!body.price_id) {
      return NextResponse.json(
        { error: 'price_id is required' },
        { status: 400 }
      );
    }

    const result = await createCheckoutSession({
      authAdapter,
      dbAdapter,
      config,
      request: {
        price_id: body.price_id,
        trial_period_days: body.trial_period_days,
        success_url: body.success_url,
        cancel_url: body.cancel_url,
        metadata: body.metadata,
      },
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: error.statusCode || 500 }
    );
  }
}
