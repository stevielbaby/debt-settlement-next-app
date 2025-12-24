#!/usr/bin/env tsx
/**
 * Billing Kit Integration Tests
 * Tests actual API endpoints and webhooks
 * 
 * Requires:
 * - Dev server running (npm run dev)
 * - Stripe CLI webhook forwarding active
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function checkServerRunning(): Promise<boolean> {
  try {
    const response = await fetch(APP_URL);
    return response.ok || response.status === 404; // 404 is fine, means server is up
  } catch {
    return false;
  }
}

async function checkStripeCliRunning(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('ps aux | grep "stripe listen" | grep -v grep');
    return stdout.length > 0;
  } catch {
    return false;
  }
}

async function triggerStripeEvent(eventType: string): Promise<void> {
  log.step(`Triggering Stripe event: ${eventType}`);
  try {
    const { stdout } = await execAsync(`stripe trigger ${eventType}`);
    log.info(stdout.trim());
  } catch (error: any) {
    throw new Error(`Failed to trigger event: ${error.message}`);
  }
}

async function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCheckoutSessionCompleted(): Promise<void> {
  log.step('Test: checkout.session.completed');
  
  await triggerStripeEvent('checkout.session.completed');
  await waitFor(2000); // Wait for webhook processing
  
  // TODO: Verify in database that subscription was created
  log.success('Webhook triggered');
}

async function testSubscriptionCreated(): Promise<void> {
  log.step('Test: customer.subscription.created');
  
  await triggerStripeEvent('customer.subscription.created');
  await waitFor(2000);
  
  log.success('Webhook triggered');
}

async function testSubscriptionUpdated(): Promise<void> {
  log.step('Test: customer.subscription.updated');
  
  await triggerStripeEvent('customer.subscription.updated');
  await waitFor(2000);
  
  log.success('Webhook triggered');
}

async function testInvoicePaymentSucceeded(): Promise<void> {
  log.step('Test: invoice.payment_succeeded');
  
  await triggerStripeEvent('invoice.payment_succeeded');
  await waitFor(2000);
  
  log.success('Webhook triggered');
}

async function testInvoicePaymentFailed(): Promise<void> {
  log.step('Test: invoice.payment_failed');
  
  await triggerStripeEvent('invoice.payment_failed');
  await waitFor(2000);
  
  log.success('Webhook triggered');
}

async function testSubscriptionDeleted(): Promise<void> {
  log.step('Test: customer.subscription.deleted');
  
  await triggerStripeEvent('customer.subscription.deleted');
  await waitFor(2000);
  
  log.success('Webhook triggered');
}

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   Billing Kit Integration Tests       ║');
  console.log('╚════════════════════════════════════════╝');
  console.log();
  
  // Prerequisites
  log.step('Checking prerequisites...');
  
  const serverRunning = await checkServerRunning();
  if (!serverRunning) {
    log.error('Dev server is not running');
    log.info('Start it with: npm run dev');
    process.exit(1);
  }
  log.success('Dev server is running');
  
  const stripeCliRunning = await checkStripeCliRunning();
  if (!stripeCliRunning) {
    log.warning('Stripe CLI webhook forwarding may not be running');
    log.info('Start it with: stripe listen --forward-to localhost:3000/api/stripe/webhook');
    log.info('Continuing anyway...');
  } else {
    log.success('Stripe CLI is running');
  }
  
  console.log();
  log.info('Testing webhook event handlers...');
  console.log();
  
  try {
    await testCheckoutSessionCompleted();
    await testSubscriptionCreated();
    await testSubscriptionUpdated();
    await testInvoicePaymentSucceeded();
    await testInvoicePaymentFailed();
    await testSubscriptionDeleted();
    
    console.log();
    log.success('All integration tests completed!');
    console.log();
    log.info('Next steps:');
    log.info('  1. Check your server logs for webhook processing');
    log.info('  2. Verify database records were created/updated');
    log.info('  3. Check Stripe Dashboard → Events for webhook delivery');
    console.log();
    
  } catch (error: any) {
    console.log();
    log.error(`Test failed: ${error.message}`);
    process.exit(1);
  }
}

main();
