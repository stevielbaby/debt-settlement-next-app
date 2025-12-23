#!/usr/bin/env node
/* eslint-disable */
/**
 * Structural tests for ensure-customer flow (CommonJS-compatible)
 */
const fs = require('fs');

/** @type {(content: string, needle: string, message: string) => void} */
function assertContains(content, needle, message) {
  if (!content.includes(needle)) {
    throw new Error(message + ` (missing: ${needle})`);
  }
}

function main() {
  console.log('\n🔎 Ensuring customer-before-assignment: structural checks');
  console.log('========================================================');

  const assignPlan = fs.readFileSync('./app/api/webmaster/subscriptions/assign-plan/route.ts','utf-8');
  const operatorCheckout = fs.readFileSync('./app/api/operator/billing/create-checkout-session/route.ts','utf-8');
  const stripeLib = fs.readFileSync('./lib/stripe.ts','utf-8');
  const billingUtil = fs.readFileSync('./lib/billing.ts','utf-8');

  // 1) Helper exists
  assertContains(billingUtil, 'export async function ensureStripeCustomerForOrganization', 'Helper ensureStripeCustomerForOrganization not found');

  // 2) Webmaster assign-plan uses helper
  assertContains(assignPlan, 'ensureStripeCustomerForOrganization', 'assign-plan route must use ensureStripeCustomerForOrganization');

  // 3) Operator checkout uses helper
  assertContains(operatorCheckout, 'ensureStripeCustomerForOrganization', 'operator checkout route must use ensureStripeCustomerForOrganization');

  // 4) stripe.ts creation sets metadata
  assertContains(stripeLib, 'organization_id', 'stripe customer should include organization_id metadata');
  assertContains(stripeLib, 'organization_name', 'stripe customer should include organization_name metadata');
  assertContains(stripeLib, 'organization_email', 'stripe customer should include organization_email metadata');

  // 5) stripe.ts fallback search by email
  assertContains(stripeLib, "query: `email:'", 'stripe customers.search fallback by email expected');

  console.log('\n✅ Structural checks passed.');
  console.log('\nNext manual validation:');
  console.log('- Assign a plan to an org without stripe_customer_id: DB should fill it and Stripe should have a customer with metadata.');
  console.log('- Repeat quickly to simulate a race: should still end with a single customer, no duplicate.');
}

try { main(); } catch (e) { const err = /** @type {any} */(e); console.error('\n❌', err?.message || err); process.exit(1); }
