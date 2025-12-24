/**
 * Example: GET /api/billing/subscription
 * Gets current subscription for user
 * Copy to: app/api/billing/subscription/route.ts
 */

import { getSubscription } from '@billing-kit/core';
import { authAdapter } from '@/lib/billing/auth-adapter';
import { dbAdapter } from '@/lib/billing/db-adapter';
import { getBillingConfig } from '@/lib/billing/config';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const config = getBillingConfig();

    const result = await getSubscription({
      authAdapter,
      dbAdapter,
      config,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error getting subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get subscription' },
      { status: error.statusCode || 500 }
    );
  }
}
