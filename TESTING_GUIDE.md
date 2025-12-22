# Testing Guide: Webmaster Login & Stripe Integration

## Phase 1: Test Webmaster Login Redirect ✅

### Prerequisites
- Node.js 20+
- Dev server running: `npm run dev`
- Database with webmaster user created

### Step 1: Create Test Webmaster User
```bash
npx ts-node scripts/create-webmaster.ts
```

**Expected Output:**
```
✅ Webmaster user created successfully
Email: webmaster@strattondefense.com
Password: webmaster123
```

**Database Verification:**
```sql
SELECT id, email, role, org_id FROM app.users WHERE email = 'webmaster@strattondefense.com';
-- Should show: role = 'webmaster'
```

### Step 2: Test Login Flow

**Method A: Auto-fill Button**
1. Go to `http://localhost:3000/auth/signin`
2. Click "🔧 Webmaster Dashboard" button
3. Should auto-fill email and password and submit

**Method B: Manual Entry**
1. Go to `http://localhost:3000/auth/signin`
2. Enter email: `webmaster@strattondefense.com`
3. Enter password: `webmaster123`
4. Click "Access System"

### Step 3: Verify Redirect

**Expected Behavior:**
- ✅ Login succeeds
- ✅ Page redirects to `/webmaster`
- ✅ Webmaster dashboard loads
- ✅ Can see sidebar with: Dashboard, Organizations, Billing, Subscriptions, Usage

**If Redirect Fails:**
- Check browser console for errors
- Check server logs: `npm run dev`
- Verify `/api/auth/user-role` returns `{ role: 'webmaster' }`

### Step 4: Verify Operator Redirect
1. Go to `http://localhost:3000/auth/signin`
2. Click "📋 Try Operator Account"
3. Should redirect to `/operator` (case queue)
4. Should see: Cases, Submissions, Billing & Payments, Settings

---

## Phase 2: Configure Stripe for Testing

### Step 1: Create Stripe Test Account
1. Go to https://stripe.com
2. Sign up or log in
3. Go to Dashboard

### Step 2: Get Test API Keys
1. Click "Developers" in top-right
2. Click "API Keys"
3. Make sure you're in **Test mode** (toggle in top-right)
4. Copy:
   - **Publishable Key**: `pk_test_...`
   - **Secret Key**: `sk_test_...`

### Step 3: Create Webhook Endpoint
1. In Developers, click "Webhooks"
2. Click "Add endpoint"
3. Endpoint URL: `http://localhost:3000/api/webhooks/stripe`
4. Events to listen for:
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click "Add endpoint"
6. Click on the endpoint, scroll down, copy **Signing secret**: `whsec_test_...`

### Step 4: Update Environment Variables

Edit `.env.local`:

```env
# Add these three lines:
STRIPE_PUBLIC_KEY=pk_test_YOUR_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_test_YOUR_SECRET_HERE

# Keep existing variables:
# DATABASE_URL=...
# NEXTAUTH_SECRET=...
# etc.
```

### Step 5: Create Test Products in Stripe

Option A: Manual in Stripe Dashboard
1. Go to Products → Add Product
2. Create products for each plan (Basic, Professional, Enterprise)
3. For each product:
   - Set price (e.g., $29/month, $99/month, $299/month)
   - Set billing: Monthly
   - Copy Product ID (prod_...)
   - Copy Price ID (price_...)

Option B: Use Stripe CLI (Recommended)
```bash
# Install Stripe CLI from https://stripe.com/docs/stripe-cli
stripe products create --name "Basic Plan" --type service
stripe prices create --product prod_... --unit-amount 2900 --currency usd --recurring '{interval:month,interval_count:1}'
```

### Step 6: Save Product IDs to Database

```sql
-- Update subscription_plans table with Stripe IDs
UPDATE app.subscription_plans 
SET stripe_product_id = 'prod_your_id',
    stripe_price_id = 'price_your_id'
WHERE name = 'Professional';

-- Verify:
SELECT id, name, stripe_product_id, stripe_price_id FROM app.subscription_plans;
```

---

## Phase 3: Test Stripe Integration

### Step 1: Set Up Stripe Webhook Forwarding (Local Testing)

```bash
# Install Stripe CLI if not already installed
# https://stripe.com/docs/stripe-cli

# Start webhook forwarding
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy the signing secret and add to .env.local:
# STRIPE_WEBHOOK_SECRET=whsec_test_...
```

Keep this terminal running throughout testing.

### Step 2: Test Subscription Assignment API

**Manual Test with curl:**
```bash
curl -X POST http://localhost:3000/api/webmaster/subscriptions/assign-plan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "organizationId": "YOUR_ORG_ID",
    "planId": "YOUR_PLAN_ID"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "sub_...",
    "stripeSubscriptionId": "sub_...",
    "status": "active",
    "currentPeriodStart": "2024-01-01",
    "currentPeriodEnd": "2024-02-01"
  }
}
```

**Check Database:**
```sql
SELECT * FROM app.organization_subscriptions 
WHERE organization_id = 'YOUR_ORG_ID'
LIMIT 1;
-- Should show stripe_subscription_id populated
```

### Step 3: Test Webhook Signature Verification

```bash
# In the stripe listen terminal, trigger a test event:
stripe trigger invoice.paid

# Check your app logs - should see:
# ✅ Webhook received and verified
# ✅ Invoice marked as paid
```

### Step 4: Test Multiple Webhook Events

```bash
# In stripe listen terminal:
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger payment_intent.succeeded

# Each should log successfully in your app
```

### Step 5: Test Operator Payments Page

1. Sign in as operator: `operator@strattondefense.com` / `operator123`
2. Click "Billing & Payments" in sidebar
3. Should see:
   - ✅ Current subscription (plan name, cost, status)
   - ✅ Case limit and usage %
   - ✅ Renewal date countdown
   - ✅ Recent invoices table
   - ✅ Usage progress bar

**Check API Response:**
```bash
curl http://localhost:3000/api/operator/payments \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "subscription": {
    "planName": "Professional",
    "status": "active",
    "monthlyCost": 9900,
    "caseLimit": 50,
    "currentUsage": 12,
    "usagePercent": 24,
    "renewalDate": "2024-02-01",
    "renewalDaysRemaining": 30
  },
  "invoices": [
    {
      "id": "inv_...",
      "amount": 9900,
      "status": "paid",
      "date": "2024-01-01"
    }
  ]
}
```

---

## Phase 4: Test Payment Processing (Optional)

### Test with Stripe Test Cards

Use these test cards in payment forms:
- **Visa (Success)**: `4242 4242 4242 4242`
- **Mastercard (Success)**: `5555 5555 5555 4444`
- **Amex (Success)**: `3782 822463 10005`
- **Visa (Decline)**: `4000 0000 0000 0002`
- **Mastercard (Decline)**: `5555 5555 5555 4444`

For all test cards:
- **Expiry**: Any future date (e.g., 12/25)
- **CVC**: Any 3-digit number (e.g., 123)
- **ZIP**: Any 5-digit number (e.g., 12345)

### Test Failed Payment Handling

1. Attempt subscription with decline card: `4000 0000 0000 0002`
2. Should show payment failed in operator dashboard
3. Stripe webhook should trigger `invoice.payment_failed`
4. Database should update subscription status

---

## Troubleshooting

### Issue: "Invalid API Key" when creating subscription
**Solution:**
- Verify `STRIPE_SECRET_KEY` starts with `sk_test_` (test mode)
- Check key is copied correctly from Stripe Dashboard
- Restart dev server after updating `.env.local`

### Issue: Webhook events not triggering
**Solution:**
- Verify `stripe listen` is running in separate terminal
- Check `STRIPE_WEBHOOK_SECRET` matches signing secret in output
- Verify endpoint URL is correct: `http://localhost:3000/api/webhooks/stripe`

### Issue: Signature verification failed
**Solution:**
- Copy signing secret from `stripe listen` output
- Update `.env.local` with exact secret
- Restart dev server

### Issue: "Organization not found"
**Solution:**
- Create test organization in database:
  ```sql
  INSERT INTO app.organizations (name, email)
  VALUES ('Test Firm', 'test@firm.com');
  ```
- Get organization ID from query result
- Use that ID in API calls

### Issue: "Plan not found"
**Solution:**
- Verify plan exists in database:
  ```sql
  SELECT id, name FROM app.subscription_plans;
  ```
- If empty, create test plan:
  ```sql
  INSERT INTO app.subscription_plans (name, monthly_cost, case_limit, description)
  VALUES ('Professional', 9900, 50, 'Professional Plan');
  ```

### Issue: Operator dashboard shows "No active subscription"
**Solution:**
- Verify subscription is created in database:
  ```sql
  SELECT * FROM app.organization_subscriptions 
  WHERE organization_id = 'ORG_ID';
  ```
- If empty, assign plan via webmaster API
- Check subscription status is 'active' (not 'canceled' or 'past_due')

---

## Success Checklist

After completing all phases, verify:

- [x] Webmaster login redirects to `/webmaster`
- [x] Operator login redirects to `/operator`
- [x] Operator sees "Billing & Payments" tab
- [x] Stripe API keys configured
- [x] Webhook endpoint created and verified
- [x] Test products created in Stripe
- [x] Subscription assignment API works
- [x] Webhook events are received and processed
- [x] Operator payments page displays data
- [x] Invoice status updates via webhook

---

## Next Steps

Once testing is complete and all checks pass:

1. **Build Operator Subscription Management**
   - Add upgrade/downgrade form
   - Allow plan changes mid-cycle
   - Calculate prorated charges

2. **Add Payment Method Management**
   - Card management interface
   - Automatic retry logic
   - Payment method selection

3. **Build Billing History Export**
   - CSV/PDF export
   - Date range filtering
   - Detailed line items

4. **Implement Customer Portal**
   - Stripe-hosted billing portal
   - Subscription management
   - Invoice viewing

5. **Production Deployment**
   - Switch to live API keys
   - Update webhook URL to production domain
   - Enable email receipts
   - Set up monitoring/alerts

---

**Testing Guide v1.0**
**Last Updated**: December 2024
