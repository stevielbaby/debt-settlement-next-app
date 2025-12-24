/**
 * GET /api/billing/invoices
 * Gets invoice history for user
 */

import { listInvoices } from '@/packages/billing-kit/src/api/list-invoices';
import { authAdapter } from '@/lib/billing/auth-adapter';
import { dbAdapter } from '@/lib/billing/db-adapter';
import { getBillingConfig } from '@/lib/billing/config';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const config = getBillingConfig();

    const result = await listInvoices({
      authAdapter,
      dbAdapter,
      config,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error listing invoices:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list invoices' },
      { status: error.statusCode || 500 }
    );
  }
}
