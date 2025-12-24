/**
 * POST /api/billing/customer
 * Ensures Stripe customer exists for current user
 */

import { ensureCustomer } from '@/packages/billing-kit/src/api/ensure-customer';
import { authAdapter } from '@/lib/billing/auth-adapter';
import { dbAdapter } from '@/lib/billing/db-adapter';
import { getBillingConfig } from '@/lib/billing/config';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const config = getBillingConfig();

    const result = await ensureCustomer({
      authAdapter,
      dbAdapter,
      config,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error ensuring customer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create customer' },
      { status: error.statusCode || 500 }
    );
  }
}
