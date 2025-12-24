/**
 * POST /api/billing/portal
 * Creates Stripe Customer Portal session
 */

import { createPortalSession } from '@/packages/billing-kit/src/api/create-portal';
import { authAdapter } from '@/lib/billing/auth-adapter';
import { dbAdapter } from '@/lib/billing/db-adapter';
import { getBillingConfig } from '@/lib/billing/config';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const config = getBillingConfig();
    const body = await req.json().catch(() => ({}));

    const result = await createPortalSession({
      authAdapter,
      dbAdapter,
      config,
      request: {
        return_url: body.return_url,
      },
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: error.statusCode || 500 }
    );
  }
}
