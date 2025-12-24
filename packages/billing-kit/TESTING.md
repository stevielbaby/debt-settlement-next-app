# Testing Guide - Billing Kit

Comprehensive testing guide for Stripe Billing integration.

## Prerequisites

- Stripe CLI installed: `brew install stripe/stripe-cli/stripe`
- Stripe test account with API keys
- Next.js app running locally

## Local Development Setup

### 1. Start Stripe CLI Webhook Forwarding

```bash
# Login to Stripe CLI (opens browser)
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Output will include webhook secret (whsec_...)
# Copy this to .env.local as STRIPE_WEBHOOK_SECRET
```

**Expected Output:**
```
> Ready! Your webhook signing secret is whsec_1a2b3c... (^C to quit)
```

### 2. Verify Environment Variables

Create `.env.local`:

```bash
# Test Mode Keys (from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_test_51Abc...
STRIPE_WEBHOOK_SECRET=whsec_1a2b3c...  # From stripe listen command

# App URL
BILLING_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Test Price IDs
STRIPE_PRICE_ID_STARTER_MONTHLY=price_1test123...
STRIPE_PRICE_ID_PRO_MONTHLY=price_1test456...

# Database
DATABASE_URL=postgresql://...
```

### 3. Run Database Migrations

```bash
psql $DATABASE_URL -f packages/billing-kit/src/db/migrations/001-init.sql
```

Verify tables exist:
```bash
psql $DATABASE_URL -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('billing_accounts', 'plans', 'subscriptions', 'invoices', 'stripe_events');"
```

### 4. Seed Plans

```sql
-- Connect to database
psql $DATABASE_URL

-- Insert test plans
INSERT INTO plans (key, name, stripe_product_id, stripe_price_id, interval, unit_amount)
VALUES 
  ('starter_monthly', 'Starter Plan', 'prod_test_starter', 'price_1test123...', 'month', 999),
  ('pro_monthly', 'Pro Plan', 'prod_test_pro', 'price_1test456...', 'month', 2999)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  stripe_price_id = EXCLUDED.stripe_price_id,
  unit_amount = EXCLUDED.unit_amount;
```

Or use sync utility:
```typescript
import { syncPlansFromStripe } from '@billing-kit/core';
import { dbAdapter } from '@/lib/billing/db-adapter';

await syncPlansFromStripe({ db: dbAdapter });
```

## Test Scenarios

### Scenario 1: Create Checkout Session

#### Via API

```bash
# Ensure you're authenticated (use your app's auth)
curl -X POST http://localhost:3000/api/billing/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"price_id": "price_1test123..."}'
```

**Expected Response:**
```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "session_id": "cs_test_..."
}
```

#### Via UI (if implemented)

1. Log in to your app
2. Navigate to pricing/billing page
3. Click "Subscribe" button
4. Should redirect to Stripe Checkout

### Scenario 2: Complete Checkout

#### Option A: Stripe CLI Test Mode

```bash
# Trigger test webhook event
stripe trigger checkout.session.completed
```

#### Option B: Use Test Card

1. Complete checkout with test card: `4242 4242 4242 4242`
2. Expiry: Any future date (e.g., `12/34`)
3. CVC: Any 3 digits (e.g., `123`)
4. ZIP: Any 5 digits (e.g., `12345`)

**Watch Stripe CLI Output:**
```
[200] POST http://localhost:3000/api/stripe/webhook [evt_test_...]
```

**Verify in Database:**
```sql
-- Check billing account created
SELECT * FROM billing_accounts ORDER BY created_at DESC LIMIT 1;

-- Check subscription created
SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 1;

-- Check webhook event logged
SELECT * FROM stripe_events ORDER BY created_at DESC LIMIT 1;
```

### Scenario 3: Subscription Updates

```bash
# Trigger subscription update event
stripe trigger customer.subscription.updated
```

**Verify:**
```sql
SELECT * FROM subscriptions WHERE stripe_subscription_id = 'sub_test_...';
-- Should show updated status, billing period, etc.
```

### Scenario 4: Invoice Payment

```bash
# Trigger invoice paid event
stripe trigger invoice.payment_succeeded
```

**Verify:**
```sql
SELECT * FROM invoices ORDER BY created_at DESC LIMIT 1;
-- Should show status = 'paid', amount_paid populated
```

### Scenario 5: Failed Payment

```bash
# Trigger payment failed event
stripe trigger invoice.payment_failed
```

**Verify:**
```sql
SELECT * FROM invoices WHERE status = 'open' ORDER BY created_at DESC LIMIT 1;
-- Should show failed invoice
```

### Scenario 6: Subscription Cancellation

```bash
# Trigger cancellation event
stripe trigger customer.subscription.deleted
```

**Verify:**
```sql
SELECT * FROM subscriptions WHERE status = 'canceled' ORDER BY created_at DESC LIMIT 1;
-- Should show ended_at timestamp
```

### Scenario 7: Entitlement Check

```typescript
// In API route or server component
import { requireActiveSubscription } from '@billing-kit/core';
import { dbAdapter } from '@/lib/billing/db-adapter';

export async function GET() {
  const user = await authAdapter.requireUser();
  
  try {
    await requireActiveSubscription(dbAdapter, user.id);
    return Response.json({ access: 'granted' });
  } catch (error) {
    return Response.json({ access: 'denied' }, { status: 403 });
  }
}
```

**Test:**
```bash
# With active subscription
curl http://localhost:3000/api/protected-feature
# Expected: { "access": "granted" }

# After canceling subscription
curl http://localhost:3000/api/protected-feature
# Expected: { "access": "denied" }
```

## Test Cards

Use Stripe test cards to simulate different scenarios:

| Card Number         | Scenario                    |
|---------------------|-----------------------------|
| `4242 4242 4242 4242` | Success (US)              |
| `4000 0025 0000 3155` | Requires authentication   |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0000 0000 0341` | Declined (processing error) |

Full list: https://stripe.com/docs/testing

## Webhook Verification

### Verify Signature Locally

```bash
# Send test webhook with valid signature
stripe trigger checkout.session.completed

# Check server logs for:
# "[billing-kit] Webhook received" 
# "[billing-kit] Webhook processed successfully"
```

### Verify Idempotency

```bash
# Send same webhook twice
stripe events resend evt_test_...

# Check database - should only have ONE record:
SELECT COUNT(*) FROM stripe_events WHERE stripe_event_id = 'evt_test_...';
-- Should return 1 (not 2)
```

## Debugging

### Enable Verbose Logging

```typescript
// lib/billing/logger.ts
export const logger = {
  info: (msg: string, meta?: any) => console.log('[BILLING]', msg, meta),
  warn: (msg: string, meta?: any) => console.warn('[BILLING]', msg, meta),
  error: (msg: string, meta?: any) => console.error('[BILLING]', msg, meta),
  debug: (msg: string, meta?: any) => console.debug('[BILLING]', msg, meta),
};

// Pass to config
const config = loadConfig(logger);
```

### Check Webhook Processing Errors

```sql
-- Find failed webhooks
SELECT stripe_event_id, type, processing_error, created_at
FROM stripe_events
WHERE processed = FALSE
ORDER BY created_at DESC;
```

### Verify Customer Creation

```sql
-- Check if customer was created
SELECT ba.user_id, ba.email, ba.stripe_customer_id
FROM billing_accounts ba
WHERE ba.user_id = 'YOUR_USER_ID';
```

### Check Subscription Status

```sql
-- Get current subscription for user
SELECT s.stripe_subscription_id, s.status, s.current_plan_key, 
       s.current_period_start, s.current_period_end
FROM subscriptions s
INNER JOIN billing_accounts ba ON s.billing_account_id = ba.id
WHERE ba.user_id = 'YOUR_USER_ID'
AND s.status IN ('active', 'trialing')
ORDER BY s.created_at DESC
LIMIT 1;
```

## Production Testing

### 1. Deploy to Vercel

```bash
vercel deploy
```

### 2. Set Environment Variables

In Vercel dashboard:
- `STRIPE_SECRET_KEY` (live key: `sk_live_...`)
- `STRIPE_WEBHOOK_SECRET` (from Stripe webhook endpoint)
- `BILLING_APP_URL` (your production URL)
- `DATABASE_URL` (Neon connection string)

### 3. Create Production Webhook

1. Stripe Dashboard → **Developers** → **Webhooks**
2. **Add endpoint**: `https://your-app.vercel.app/api/stripe/webhook`
3. Select events (same as local)
4. Copy signing secret to Vercel env vars

### 4. Test with Real Card (Test Mode)

1. Use Stripe Dashboard **Test Mode**
2. Complete checkout with test card
3. Verify webhook received in Stripe Dashboard → **Events**
4. Check database for subscription record

### 5. Switch to Live Mode

⚠️ **Before going live:**
- [ ] Review Stripe Radar rules (fraud prevention)
- [ ] Configure Customer Portal settings
- [ ] Set up email notifications (Stripe handles this)
- [ ] Test refund flow (via Stripe Dashboard)
- [ ] Document runbook for support team

## Common Issues

### Issue: Webhook signature verification fails

**Symptoms:**
```
[billing-kit] Webhook signature verification failed
```

**Solution:**
1. Verify `STRIPE_WEBHOOK_SECRET` matches Stripe CLI output
2. Ensure raw body is passed (not parsed JSON)
3. Check `stripe-signature` header is present

### Issue: Subscription not found after checkout

**Symptoms:**
- Checkout succeeds but no subscription in database

**Solution:**
1. Check Stripe CLI for webhook delivery
2. Verify `checkout.session.completed` event was received
3. Check `stripe_events` table for processing errors
4. Ensure customer has `billing_account` record

### Issue: Duplicate subscriptions created

**Symptoms:**
- Multiple subscription records for same Stripe subscription ID

**Solution:**
- Verify `upsertSubscription` is used (has ON CONFLICT clause)
- Check for race conditions (multiple webhooks processed simultaneously)

### Issue: Plans table empty

**Symptoms:**
```sql
SELECT * FROM plans; -- Returns no rows
```

**Solution:**
- Run sync utility or seed manually
- Verify Stripe products/prices exist in dashboard

## Helper Scripts

### Reset Test Data

```sql
BEGIN;

-- Delete test data (use with caution!)
DELETE FROM invoices WHERE billing_account_id IN (
  SELECT id FROM billing_accounts WHERE email LIKE '%@test.com'
);
DELETE FROM subscriptions WHERE billing_account_id IN (
  SELECT id FROM billing_accounts WHERE email LIKE '%@test.com'
);
DELETE FROM billing_accounts WHERE email LIKE '%@test.com';
DELETE FROM stripe_events WHERE livemode = FALSE;

COMMIT;
```

### Check Webhook Health

```sql
-- Recent webhooks
SELECT 
  stripe_event_id,
  type,
  processed,
  processing_error,
  created_at
FROM stripe_events
ORDER BY created_at DESC
LIMIT 10;

-- Failed webhooks count
SELECT COUNT(*) as failed_count
FROM stripe_events
WHERE processed = FALSE;
```

## Next Steps

1. Implement UI pages (subscription status, invoice list)
2. Add email notifications (Stripe handles, or use host app mailer)
3. Set up monitoring (Sentry, Datadog for webhook failures)
4. Configure Stripe Radar rules for fraud prevention
5. Test edge cases (expired cards, payment retries, proration)

---

**Need Help?**
- Stripe Dashboard → **Events** (see webhook delivery logs)
- Stripe CLI: `stripe listen --print-json` (debug webhook payloads)
- Database: Check `processing_error` column in `stripe_events`
