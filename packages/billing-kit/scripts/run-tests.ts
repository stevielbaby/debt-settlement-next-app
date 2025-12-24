#!/usr/bin/env tsx
/**
 * Billing Kit Test Runner
 * Runs all billing-kit integration tests
 */

import { neon } from '@neondatabase/serverless';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  step: (msg: string) => console.log(`${colors.cyan}→${colors.reset} ${msg}`),
};

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

// Load environment
const DATABASE_URL = process.env.DATABASE_URL;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PUBLIC_KEY = process.env.STRIPE_PUBLIC_KEY;

async function runTest(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  log.step(name);
  
  try {
    await fn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, duration });
    log.success(`Passed (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMsg, duration });
    log.error(`Failed: ${errorMsg}`);
  }
  
  console.log();
}

async function testDatabaseConnection(): Promise<void> {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL not found in environment');
  }
  
  const sql = neon(DATABASE_URL);
  const result = await sql`SELECT NOW()`;
  
  if (!result || result.length === 0) {
    throw new Error('Database query returned no results');
  }
  
  log.info(`Connected to database at ${new Date(result[0].now).toISOString()}`);
}

async function testBillingKitTables(): Promise<void> {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL not found');
  }
  
  const sql = neon(DATABASE_URL);
  const tables = [
    'billing_accounts',
    'subscriptions',
    'invoices',
    'plans',
    'stripe_events',
  ];
  
  for (const table of tables) {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${table}
      )
    `;
    
    if (!result[0].exists) {
      throw new Error(`Table '${table}' does not exist`);
    }
  }
  
  log.info(`All ${tables.length} required tables exist`);
}

async function testPlansExist(): Promise<void> {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL not found');
  }
  
  const sql = neon(DATABASE_URL);
  const result = await sql`SELECT COUNT(*) as count FROM plans`;
  
  const count = parseInt(result[0].count);
  if (count === 0) {
    throw new Error('No plans found in database. Run sync-plans first.');
  }
  
  log.info(`Found ${count} plan(s) in database`);
}

async function testStripeConfiguration(): Promise<void> {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not found in environment');
  }
  
  if (!STRIPE_SECRET_KEY.startsWith('sk_test_')) {
    log.warning('Using live Stripe key (not test mode)');
  } else {
    log.info('Using Stripe test mode');
  }
  
  if (!STRIPE_PUBLIC_KEY) {
    throw new Error('STRIPE_PUBLIC_KEY not found in environment');
  }
  
  // Test Stripe API connectivity
  const Stripe = require('stripe');
  const stripe = new Stripe(STRIPE_SECRET_KEY);
  
  try {
    const account = await stripe.accounts.retrieve();
    log.info(`Connected to Stripe account: ${account.email || account.id}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to connect to Stripe: ${errorMsg}`);
  }
}

async function testWebhookEndpoint(): Promise<void> {
  const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET not found in environment');
  }
  
  if (!WEBHOOK_SECRET.startsWith('whsec_')) {
    throw new Error('STRIPE_WEBHOOK_SECRET appears to be invalid (should start with whsec_)');
  }
  
  log.info('Webhook secret configured');
}

async function testBillingKitModules(): Promise<void> {
  try {
    // Test that billing-kit can be imported
    const billingKit = await import('../../billing-kit/src/index');
    
    const requiredExports = [
      'createCheckout',
      'createPortal',
      'ensureCustomer',
      'getSubscription',
      'listInvoices',
      'handleWebhook',
      'requireActiveSubscription',
    ];
    
    for (const exportName of requiredExports) {
      if (!(exportName in billingKit)) {
        throw new Error(`Missing export: ${exportName}`);
      }
    }
    
    log.info(`All ${requiredExports.length} core functions exported`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to import billing-kit: ${errorMsg}`);
  }
}

async function testEventHandlers(): Promise<void> {
  const handlers = [
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
  ];
  
  for (const handler of handlers) {
    try {
      const modulePath = `../../billing-kit/src/stripe/handlers/${handler}`;
      await import(modulePath);
    } catch (error) {
      throw new Error(`Handler ${handler} not found or has errors`);
    }
  }
  
  log.info(`All ${handlers.length} webhook handlers available`);
}

async function testStripeProducts(): Promise<void> {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not found');
  }
  
  const Stripe = require('stripe');
  const stripe = new Stripe(STRIPE_SECRET_KEY);
  
  const STARTER_PRICE = process.env.STRIPE_PRICE_ID_STARTER_MONTHLY;
  const PRO_PRICE = process.env.STRIPE_PRICE_ID_PRO_MONTHLY;
  
  if (!STARTER_PRICE || !PRO_PRICE) {
    throw new Error('STRIPE_PRICE_ID_STARTER_MONTHLY or STRIPE_PRICE_ID_PRO_MONTHLY not configured');
  }
  
  try {
    const starterPrice = await stripe.prices.retrieve(STARTER_PRICE);
    const proPrice = await stripe.prices.retrieve(PRO_PRICE);
    
    log.info(`Starter: $${(starterPrice.unit_amount! / 100).toFixed(2)}/${starterPrice.recurring?.interval}`);
    log.info(`Pro: $${(proPrice.unit_amount! / 100).toFixed(2)}/${proPrice.recurring?.interval}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to retrieve price from Stripe: ${errorMsg}`);
  }
}

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   Billing Kit Test Suite              ║');
  console.log('╚════════════════════════════════════════╝');
  console.log();
  
  // Environment checks
  await runTest('Environment: Database connection', testDatabaseConnection);
  await runTest('Environment: Stripe configuration', testStripeConfiguration);
  await runTest('Environment: Webhook secret', testWebhookEndpoint);
  
  // Database checks
  await runTest('Database: Required tables exist', testBillingKitTables);
  await runTest('Database: Plans seeded', testPlansExist);
  
  // Code checks
  await runTest('Code: Billing-kit modules', testBillingKitModules);
  await runTest('Code: Event handlers', testEventHandlers);
  
  // Stripe checks
  await runTest('Stripe: Products configured', testStripeProducts);
  
  // Summary
  console.log('═══════════════════════════════════════');
  console.log('Test Summary');
  console.log('═══════════════════════════════════════');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`Total: ${total}`);
  console.log();
  
  if (failed > 0) {
    console.log('Failed Tests:');
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`  ${colors.red}✗${colors.reset} ${r.name}`);
        console.log(`    ${r.error}`);
      });
    console.log();
    process.exit(1);
  } else {
    log.success('All tests passed! Ready for integration testing.');
    console.log();
    console.log('Next steps:');
    console.log('  1. Start dev server: npm run dev');
    console.log('  2. Start webhook forwarding: stripe listen --forward-to localhost:3000/api/stripe/webhook');
    console.log('  3. Run integration tests: npm run test:billing-integration');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
