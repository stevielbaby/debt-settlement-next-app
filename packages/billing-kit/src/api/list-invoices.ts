/**
 * API Handler: List Invoices
 * Retrieves invoice history for current user
 */

import type { AuthAdapter } from '../adapters/auth-adapter';
import type { DBAdapter } from '../adapters/db-adapter';
import { BillingConfig, InvoiceListResponse } from '../types';
import { listInvoicesByUserId } from '../db/queries';

export interface ListInvoicesParams {
  authAdapter: AuthAdapter;
  dbAdapter: DBAdapter;
  config: BillingConfig;
  limit?: number;
  offset?: number;
}

/**
 * List invoices for authenticated user
 */
export async function listInvoices(
  params: ListInvoicesParams
): Promise<InvoiceListResponse> {
  const { authAdapter, dbAdapter, config, limit = 20, offset = 0 } = params;
  const logger = config.logger;

  // Get current user
  const user = await authAdapter.requireUser();

  // Fetch invoices with pagination
  const invoices = await listInvoicesByUserId(dbAdapter, user.id, limit, offset);

  logger?.info('[billing-kit] Retrieved invoices', {
    userId: user.id,
    count: invoices.length,
    limit,
    offset,
  });

  return {
    invoices,
    has_more: invoices.length === limit, // Simple check; can be enhanced
  };
}
