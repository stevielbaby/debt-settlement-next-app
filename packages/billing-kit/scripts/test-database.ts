#!/usr/bin/env tsx
/**
 * Test database queries and verify billing data
 */

import { neon } from '@neondatabase/serverless';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const log = {
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  step: (msg: string) => console.log(`${colors.cyan}→${colors.reset} ${msg}`),
  dim: (msg: string) => console.log(`${colors.gray}${msg}${colors.reset}`),
};

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  log.error('DATABASE_URL not found in environment');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function showPlans() {
  log.step('Plans');
  const plans = await sql`
    SELECT 
      key,
      name,
      interval,
      unit_amount,
      stripe_product_id,
      stripe_price_id
    FROM plans
    ORDER BY unit_amount ASC
  `;
  
  if (plans.length === 0) {
    log.warning('No plans found');
    return;
  }
  
  console.table(
    plans.map(p => ({
      Key: p.key,
      Name: p.name,
      Price: `$${(p.unit_amount / 100).toFixed(2)}`,
      Interval: p.interval,
      'Product ID': p.stripe_product_id?.substring(0, 20) + '...',
      'Price ID': p.stripe_price_id?.substring(0, 20) + '...',
    }))
  );
}

async function showBillingAccounts() {
  log.step('Billing Accounts');
  const accounts = await sql`
    SELECT 
      id,
      user_id,
      email,
      stripe_customer_id,
      created_at
    FROM billing_accounts
    ORDER BY created_at DESC
    LIMIT 10
  `;
  
  if (accounts.length === 0) {
    log.warning('No billing accounts found');
    return;
  }
  
  console.table(
    accounts.map(a => ({
      ID: a.id.substring(0, 8) + '...',
      'User ID': a.user_id.substring(0, 8) + '...',
      Email: a.email,
      'Stripe Customer': a.stripe_customer_id?.substring(0, 15) + '...' || 'Not created',
      Created: new Date(a.created_at).toLocaleDateString(),
    }))
  );
}

async function showSubscriptions() {
  log.step('Subscriptions');
  const subscriptions = await sql`
    SELECT 
      s.id,
      s.stripe_subscription_id,
      s.status,
      s.current_plan_key,
      s.current_period_start,
      s.current_period_end,
      ba.email
    FROM subscriptions s
    INNER JOIN billing_accounts ba ON s.billing_account_id = ba.id
    ORDER BY s.created_at DESC
    LIMIT 10
  `;
  
  if (subscriptions.length === 0) {
    log.warning('No subscriptions found');
    return;
  }
  
  console.table(
    subscriptions.map(s => ({
      ID: s.id.substring(0, 8) + '...',
      Email: s.email,
      Plan: s.current_plan_key || 'N/A',
      Status: s.status,
      'Period End': s.current_period_end 
        ? new Date(s.current_period_end).toLocaleDateString()
        : 'N/A',
    }))
  );
}

async function showInvoices() {
  log.step('Invoices');
  const invoices = await sql`
    SELECT 
      i.id,
      i.stripe_invoice_id,
      i.status,
      i.amount_due,
      i.amount_paid,
      i.created_at,
      ba.email
    FROM invoices i
    INNER JOIN billing_accounts ba ON i.billing_account_id = ba.id
    ORDER BY i.created_at DESC
    LIMIT 10
  `;
  
  if (invoices.length === 0) {
    log.warning('No invoices found');
    return;
  }
  
  console.table(
    invoices.map(i => ({
      ID: i.id.substring(0, 8) + '...',
      Email: i.email,
      Status: i.status,
      Due: `$${(i.amount_due / 100).toFixed(2)}`,
      Paid: `$${(i.amount_paid / 100).toFixed(2)}`,
      Created: new Date(i.created_at).toLocaleDateString(),
    }))
  );
}

async function showWebhookEvents() {
  log.step('Recent Webhook Events');
  const events = await sql`
    SELECT 
      stripe_event_id,
      type,
      processed,
      processing_error,
      created_at
    FROM stripe_events
    ORDER BY created_at DESC
    LIMIT 10
  `;
  
  if (events.length === 0) {
    log.warning('No webhook events found');
    return;
  }
  
  console.table(
    events.map(e => ({
      'Event ID': e.stripe_event_id.substring(0, 20) + '...',
      Type: e.type,
      Processed: e.processed ? '✓' : '✗',
      Error: e.processing_error ? 'Yes' : '-',
      Time: new Date(e.created_at).toLocaleTimeString(),
    }))
  );
  
  const failedCount = events.filter(e => !e.processed).length;
  if (failedCount > 0) {
    log.warning(`${failedCount} failed webhook(s) found`);
    
    const failed = events.filter(e => !e.processed);
    failed.forEach(e => {
      log.dim(`  ${e.stripe_event_id}: ${e.processing_error}`);
    });
  }
}

async function showStats() {
  log.step('Statistics');
  
  const [accountsCount] = await sql`SELECT COUNT(*) as count FROM billing_accounts`;
  const [subsCount] = await sql`SELECT COUNT(*) as count FROM subscriptions`;
  const [activeSubsCount] = await sql`
    SELECT COUNT(*) as count FROM subscriptions 
    WHERE status IN ('active', 'trialing')
  `;
  const [invoicesCount] = await sql`SELECT COUNT(*) as count FROM invoices`;
  const [eventsCount] = await sql`SELECT COUNT(*) as count FROM stripe_events`;
  const [failedEventsCount] = await sql`
    SELECT COUNT(*) as count FROM stripe_events WHERE processed = FALSE
  `;
  
  console.table([
    { Metric: 'Billing Accounts', Value: accountsCount.count },
    { Metric: 'Total Subscriptions', Value: subsCount.count },
    { Metric: 'Active Subscriptions', Value: activeSubsCount.count },
    { Metric: 'Invoices', Value: invoicesCount.count },
    { Metric: 'Webhook Events', Value: eventsCount.count },
    { Metric: 'Failed Webhooks', Value: failedEventsCount.count },
  ]);
}

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   Billing Kit Database Inspector      ║');
  console.log('╚════════════════════════════════════════╝');
  console.log();
  
  try {
    await showStats();
    console.log();
    
    await showPlans();
    console.log();
    
    await showBillingAccounts();
    console.log();
    
    await showSubscriptions();
    console.log();
    
    await showInvoices();
    console.log();
    
    await showWebhookEvents();
    console.log();
    
    log.success('Database inspection complete');
  } catch (error: any) {
    log.error(`Failed: ${error.message}`);
    process.exit(1);
  }
}

main();
