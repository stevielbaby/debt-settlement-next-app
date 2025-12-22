# Stripe Integration Setup Guide

## Overview
This document describes how to set up Stripe for the SaaS platform to handle subscriptions, billing, and payments.

## Prerequisites
1. Stripe account (create at https://stripe.com)
2. Node.js 20+
3. Database with tables: invoices, organization_subscriptions, subscription_plans
4. stripe npm package installed: `npm install stripe`

## Step 1: Get Stripe API Keys

1. Log in to Stripe Dashboard (https://dashboard.stripe.com)
2. Go to Developers → API Keys
3. Copy:
   - **Publishable Key** (pk_...) - used on frontend
   - **Secret Key** (sk_...) - used on backend (KEEP SECRET!)
4. Go to Developers → Webhooks
5. Create a new endpoint:
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events to listen for:
     - invoice.paid
     - invoice.payment_failed
     - customer.subscription.updated
     - customer.subscription.deleted
     - payment_intent.succeeded
     - payment_intent.payment_failed
6. Copy the **Signing Secret** (whsec_...)

## Step 2: Create Subscription Products in Stripe

For each subscription plan, create a Stripe product:

### Via Stripe Dashboard:
1. Go to Products
2. Click "Add Product"
3. Enter plan name (e.g., "Stratton Professional")
4. Click "Add pricing"
5. Set:
   - Price in cents (e.g., 29900 for $299)
   - Billing period: Monthly or Yearly
   - Currency: USD
6. Click "Save product"
7. Copy the Product ID (prod_...)

### Via API (recommended for automation):
Use the provided script:
```bash
npx ts-node scripts/setup-stripe-products.ts
```

This will:
- Create products for each subscription plan
- Create prices for each plan
- Save Stripe IDs to database

## Step 3: Configure Environment Variables

Add to `.env.local`:

```env
# Stripe API Keys
STRIPE_PUBLIC_KEY=pk_test_... # Get from Stripe Dashboard
STRIPE_SECRET_KEY=sk_test_... # Get from Stripe Dashboard (KEEP SECRET!)
STRIPE_WEBHOOK_SECRET=whsec_... # Get from Webhook settings

# For production (after testing):
# STRIPE_PUBLIC_KEY=pk_live_...
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_WEBHOOK_SECRET=whsec_live_...
```

⚠️ **SECURITY WARNING**: Never commit `.env.local` to git. Add to `.gitignore`:
```
.env.local
.env.*.local
```

## Step 4: Database Schema Updates

Ensure these columns exist on relevant tables:

### organizations table:
```sql
ALTER TABLE app.organizations ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
```

### organization_subscriptions table:
```sql
ALTER TABLE app.organization_subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
ALTER TABLE app.organization_subscriptions ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255);
```

### subscription_plans table:
```sql
ALTER TABLE app.subscription_plans ADD COLUMN IF NOT EXISTS stripe_product_id VARCHAR(255);
ALTER TABLE app.subscription_plans ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255);
```

### invoices table:
```sql
ALTER TABLE app.invoices ADD COLUMN IF NOT EXISTS stripe_invoice_id VARCHAR(255);
```

## Step 5: Test the Integration

### Test Mode (with test API keys):

1. **Test Stripe Customer Creation**:
   ```bash
   curl -X POST http://localhost:3000/api/webmaster/subscriptions/assign-plan \
     -H "Content-Type: application/json" \
     -d '{
       "organizationId": "org-id-here",
       "planId": "plan-id-here"
     }'
   ```

2. **Test Webhook**:
   Use Stripe CLI to forward webhooks locally:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   # Copy the signing secret and add to .env.local as STRIPE_WEBHOOK_SECRET
   ```

3. **Test Payment**:
   Use Stripe test card numbers:
   - Visa: `4242 4242 4242 4242`
   - Mastercard: `5555 5555 5555 4444`
   - Decline: `4000 0000 0000 0002`
   - Any future expiry date, any 3-digit CVC

### Test Webhooks:

```bash
# With Stripe CLI listening (from above terminal)
stripe trigger invoice.paid
stripe trigger customer.subscription.updated
```

## Step 6: Create Test Subscriptions

### Via API:
The webmaster dashboard has a button to assign plans to organizations. This will:
1. Create a Stripe customer
2. Create a subscription in Stripe
3. Store subscription details in database
4. Return client secret for payment confirmation (if needed)

### Via Database directly (for testing):
```sql
-- Create test organization
INSERT INTO app.organizations (name, email, stripe_customer_id)
VALUES ('Test Firm', 'test@firm.com', 'cus_test123');

-- Assign test subscription
INSERT INTO app.organization_subscriptions (
  organization_id, plan_id, status, 
  current_period_start, current_period_end,
  stripe_subscription_id, stripe_price_id
)
VALUES (
  (SELECT id FROM app.organizations WHERE email = 'test@firm.com'),
  (SELECT id FROM app.subscription_plans WHERE name = 'Professional'),
  'active',
  NOW(),
  NOW() + INTERVAL '30 days',
  'sub_test123',
  'price_test123'
);
```

## Step 7: Monitor & Handle Webhooks

### Key Webhook Events:

**invoice.paid**
- Fired when payment is received
- Updates invoice status to 'paid'
- Marks payment date
- Action: Send confirmation email

**invoice.payment_failed**
- Fired when payment fails
- Updates invoice status to 'past_due'
- Action: Send retry instructions, alert admin

**customer.subscription.updated**
- Fired when subscription changes
- Updates period dates, plan changes
- Action: Update plan features, notify customer

**customer.subscription.deleted**
- Fired when subscription is canceled
- Updates subscription status to 'canceled'
- Action: Restrict access, notify customer

**payment_intent.succeeded**
- Fired for one-time payments
- Action: Fulfill payment, send receipt

## Step 8: Operator Subscription Display

Operators can see their subscription at `/operator/payments`:
- Current plan name and status
- Monthly cost
- Usage and limits
- Renewal date
- Recent invoices

This page is automatically populated from:
- `organization_subscriptions` table
- `usage_metrics` table
- `invoices` table

## Step 9: Payment Processing

### Subscription Payments:
1. Stripe automatically charges on renewal date
2. Webhook updates database on success/failure
3. If payment fails, status → 'past_due'
4. After 3 failures, subscription → 'canceled'

### One-Time Payments:
Use PaymentIntent for custom charges:
```typescript
const paymentIntent = await createPaymentIntent(
  10000, // $100 in cents
  customerId,
  "Custom services",
  { reason: "upgrade_fee" }
);
```

## Step 10: Production Deployment

When ready for production:

1. **Upgrade Stripe API Keys**:
   - Generate live API keys in Stripe Dashboard
   - Update `.env.local` with `pk_live_` and `sk_live_` keys

2. **Set Webhook URL**:
   - In Stripe Dashboard, set webhook URL to production domain
   - Verify signing secret

3. **Enable Email Receipts**:
   - Stripe automatically sends payment confirmations
   - Customize in Stripe Dashboard → Email settings

4. **Set Up Billing Portal**:
   ```typescript
   // Allows customers to manage subscriptions
   const portal = await stripe.billingPortal.sessions.create({
     customer: customerId,
     return_url: 'https://yourdomain.com/operator/payments',
   });
   ```

5. **Monitor Dashboard**:
   - Watch Stripe Dashboard for failed payments
   - Set up Stripe alerts for revenue thresholds
   - Review invoice trends

## Troubleshooting

### Issue: "Webhook signature verification failed"
**Solution**: Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- Check: Developers → Webhooks → Signing secret

### Issue: "Invalid API Key"
**Solution**: Verify `STRIPE_SECRET_KEY` starts with `sk_test_` or `sk_live_`
- Don't confuse with Publishable Key (pk_...)
- Never use publishable key for backend calls

### Issue: "Customer not found"
**Solution**: Stripe customer not created before subscription
- Check: `stripe_customer_id` is saved in organizations table
- Call `getOrCreateStripeCustomer()` before creating subscription

### Issue: "Price not found"
**Solution**: Plan not set up in Stripe or ID not saved in database
- Run setup script: `npx ts-node scripts/setup-stripe-products.ts`
- Check: `stripe_price_id` is saved in subscription_plans table

### Issue: Webhooks not triggering
**Solution**: Check webhook configuration
- Verify: Webhook URL is correct and accessible
- Check: Signing secret matches
- Use Stripe CLI to test: `stripe trigger invoice.paid`

## Security Considerations

1. **API Keys**:
   - Keep `STRIPE_SECRET_KEY` secret (never expose in frontend)
   - Use `STRIPE_PUBLIC_KEY` only in client-side code
   - Rotate keys regularly in production

2. **Webhook Verification**:
   - Always verify webhook signature
   - Implement idempotency (don't process same event twice)
   - Log all webhook events for audit trail

3. **Payment Data**:
   - Never store credit card data (PCI compliance)
   - Use Stripe's payment methods
   - Implement 3D Secure for higher security

4. **Access Control**:
   - Only webmaster can assign subscriptions
   - Operators can only view their own subscription
   - Admin can modify billing settings

## API Reference

### Subscription Management
- `createSubscription()` - Create new subscription
- `updateSubscription()` - Update existing subscription
- `cancelSubscription()` - Cancel subscription
- `getActiveSubscription()` - Get current subscription

### Customer Management
- `createStripeCustomer()` - Create Stripe customer
- `getOrCreateStripeCustomer()` - Get or create customer
- `listCustomerInvoices()` - List all invoices

### Payment Intents
- `createPaymentIntent()` - Create one-time payment
- `getWebhookEvent()` - Verify webhook event

## Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions)

---

**Status**: Setup guide for Stripe integration
**Version**: 1.0
**Last Updated**: December 2024
