# Phase 5 - Stripe Integration Implementation Checklist

## Overview
This checklist tracks implementation of webmaster login redirects, Stripe integration, and operator payment features as outlined by the user.

**Goal**: Enable webmaster to manage subscriptions → operators see their billing → full Stripe integration

---

## Phase 1: Webmaster Login Redirect ✅ COMPLETE

### Infrastructure
- [x] Auth system with role-based user support
- [x] Signin page with email/password form
- [x] User role API endpoint (`/api/auth/user-role`)
- [x] Role-based redirect logic in signin form
- [x] Quick-start buttons for testing

### Test User Accounts
- [x] Create webmaster user script (`scripts/create-webmaster.ts`)
- [x] Webmaster credentials: `webmaster@strattondefense.com` / `webmaster123`
- [x] Operator credentials already exist: `operator@strattondefense.com` / `operator123`

### Routes & Pages
- [x] `/auth/signin` - Login page with redirects
- [x] `/webmaster` - Webmaster dashboard (protected)
- [x] `/operator` - Operator dashboard (protected)
- [x] `/api/auth/user-role` - Role detection endpoint

### Status: ✅ Ready to Test
**Test Command**: 
```bash
npm run dev  # Start dev server
# Then go to http://localhost:3000/auth/signin
# Click "🔧 Webmaster Dashboard" button
```

---

## Phase 2: Stripe Integration Infrastructure ✅ COMPLETE

### Stripe SDK Setup
- [x] Add `stripe` npm package
- [x] Create Stripe wrapper library (`lib/stripe.ts`)
  - [x] `createStripeCustomer()` - Create customer in Stripe
  - [x] `getOrCreateStripeCustomer()` - Get or create customer
  - [x] `createSubscription()` - Create subscription
  - [x] `updateSubscription()` - Update subscription
  - [x] `cancelSubscription()` - Cancel subscription
  - [x] `getActiveSubscription()` - Get current subscription
  - [x] `createStripePrice()` - Create pricing
  - [x] `createStripeProduct()` - Create product
  - [x] `listCustomerInvoices()` - Get invoice list
  - [x] `getWebhookEvent()` - Verify webhook signature
  - [x] Error handling and logging

### Database Integration
- [x] Create Stripe DB utilities (`lib/stripe-db.ts`)
  - [x] `saveStripeCustomerId()` - Store Stripe customer ID
  - [x] `getStripeCustomerId()` - Retrieve customer ID
  - [x] `saveStripeSubscription()` - Store subscription data
  - [x] `getStripeSubscription()` - Retrieve subscription
  - [x] `savePlanStripeIds()` - Store product/price IDs
  - [x] `getPlanStripePriceId()` - Get price ID for plan
  - [x] `saveStripeInvoice()` - Store invoice data
  - [x] Invoice status updates

### API Endpoints
- [x] `POST /api/webmaster/subscriptions/assign-plan` - Webmaster assigns plan to organization
  - [x] Create/get Stripe customer
  - [x] Create Stripe subscription
  - [x] Save subscription to database
  - [x] Return subscription details
- [x] `POST /api/webhooks/stripe` - Receive and process Stripe events
  - [x] Verify webhook signature
  - [x] Handle `invoice.paid`
  - [x] Handle `invoice.payment_failed`
  - [x] Handle `customer.subscription.updated`
  - [x] Handle `customer.subscription.deleted`
  - [x] Handle payment intent events
  - [x] Idempotent event processing

### Environment Configuration
- [x] Create `STRIPE_SETUP.md` guide
- [x] Document required environment variables
- [x] Instructions for getting Stripe API keys
- [x] Webhook configuration guide

### Status: ✅ Ready to Test
**Required Setup**:
```bash
# 1. Get Stripe test API keys from https://dashboard.stripe.com
# 2. Add to .env.local:
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
# 3. Restart dev server: npm run dev
```

---

## Phase 3: Stripe Testing & Configuration ⏳ IN PROGRESS

### Stripe Account Setup
- [ ] Create Stripe test account (free at stripe.com)
- [ ] Get test API keys (Publishable & Secret)
- [ ] Create webhook endpoint
- [ ] Get webhook signing secret
- [ ] Create test products for each plan
- [ ] Create test prices for each plan

### Local Testing Setup
- [ ] Install Stripe CLI
- [ ] Configure webhook forwarding with `stripe listen`
- [ ] Update `.env.local` with test keys

### Test Phase 1: Webmaster Login
- [ ] Test webmaster login redirect to `/webmaster`
- [ ] Test operator login redirect to `/operator`
- [ ] Verify session contains user role

### Test Phase 2: Create Test Data
- [ ] Create test organization in database
- [ ] Create test subscription plans with Stripe IDs
- [ ] Verify Stripe product/price IDs are stored

### Test Phase 3: Subscription Assignment
- [ ] Test `POST /api/webmaster/subscriptions/assign-plan` API
- [ ] Verify Stripe customer created
- [ ] Verify Stripe subscription created
- [ ] Verify database records created
- [ ] Verify API returns subscription details

### Test Phase 4: Webhook Events
- [ ] Test `invoice.paid` event handling
- [ ] Test `invoice.payment_failed` event handling
- [ ] Test `customer.subscription.updated` event
- [ ] Test `customer.subscription.deleted` event
- [ ] Verify webhook signature verification works
- [ ] Verify idempotent processing (duplicate events handled)

### Test Phase 5: Test Cards
- [ ] Test successful payment with `4242 4242 4242 4242`
- [ ] Test failed payment with `4000 0000 0000 0002`
- [ ] Verify invoice status updates correctly

### Status: ⏳ Blocked on Stripe Setup
**Next**: Get Stripe API keys and configure `.env.local`

---

## Phase 4: Operator Payment Visibility ✅ COMPLETE

### Operator Payments Page
- [x] Create `/operator/payments` page
  - [x] Client component with responsive layout
  - [x] Display current subscription (plan, cost, status)
  - [x] Display case limit and current usage %
  - [x] Display renewal countdown in days
  - [x] Monthly usage progress bar (color-coded)
  - [x] Usage warning at 90%+
  - [x] Recent invoices table with status badges
  - [x] Help/contact section

### Operator Payments API
- [x] Create `GET /api/operator/payments` endpoint
  - [x] Get operator's organization subscription
  - [x] Calculate usage percentage and days to renewal
  - [x] Return recent invoices (12 most recent)
  - [x] Return all required payment data
  - [x] Error handling for no subscription

### Navigation Updates
- [x] Add "Billing & Payments" tab to operator dashboard
- [x] Add CreditCard icon to navigation
- [x] Link to `/operator/payments`
- [x] Responsive navigation styling

### Status: ✅ Ready to Test
**Test Command**:
```bash
# 1. Sign in as operator
# 2. Click "Billing & Payments" in sidebar
# 3. Should display subscription, usage, and invoices
```

---

## Phase 5: Operator Subscription Management ⏳ NOT STARTED

### Operator Plan Management
- [ ] Create plan selection/upgrade form on `/operator/payments`
- [ ] Display available plans with pricing
- [ ] Calculate prorated charges for mid-cycle changes
- [ ] Handle plan upgrade (immediate charge)
- [ ] Handle plan downgrade (credit to account)
- [ ] Display confirmation dialog before change
- [ ] Show change history/audit log

### Operator Payment Methods
- [ ] Create payment method management page
- [ ] Display current payment method (last 4 digits)
- [ ] Add "Update Payment Method" button
- [ ] Integrate Stripe payment element
- [ ] Handle card update/deletion
- [ ] Display saved payment methods

### Operator Billing History
- [ ] Create billing history table on `/operator/payments`
- [ ] Show all invoices with details
- [ ] Filter by date range
- [ ] Export as CSV/PDF
- [ ] Download individual invoices
- [ ] Resend invoice option

### Payment Retry Logic
- [ ] Implement automatic retry schedule
- [ ] Display payment failure notifications
- [ ] Allow manual retry from dashboard
- [ ] Escalation to admin after 3 failures

### Status: ⏳ Pending Phase 4 Test Success
**Trigger**: When Stripe integration tests pass

---

## Database Requirements

### Tables That Need Stripe Columns

```sql
-- Check existing columns:
ALTER TABLE app.organizations 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

ALTER TABLE app.organization_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255);

ALTER TABLE app.subscription_plans 
ADD COLUMN IF NOT EXISTS stripe_product_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255);

ALTER TABLE app.invoices 
ADD COLUMN IF NOT EXISTS stripe_invoice_id VARCHAR(255);
```

### Verify Schema:
```sql
-- Should show all tables and columns
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'app' 
ORDER BY table_name;
```

---

## Environment Variables Required

### Development (.env.local)
```env
# Existing variables (keep as is)
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

# New Stripe variables (add these)
STRIPE_PUBLIC_KEY=pk_test_YOUR_KEY
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET
STRIPE_WEBHOOK_SECRET=whsec_test_YOUR_SECRET
```

### Production (.env.production)
```env
# Same as above but with live keys (pk_live_, sk_live_, whsec_live_)
STRIPE_PUBLIC_KEY=pk_live_YOUR_KEY
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET
STRIPE_WEBHOOK_SECRET=whsec_live_YOUR_SECRET
```

---

## Testing Checklist

### Phase 1 Testing
- [ ] Run: `npm run dev`
- [ ] Go to `http://localhost:3000/auth/signin`
- [ ] Click webmaster quick-start button
- [ ] Verify redirects to `/webmaster`
- [ ] Verify session has role='webmaster'
- [ ] Test operator button → should redirect to `/operator`

### Phase 2 Testing
- [ ] Get Stripe test keys from https://dashboard.stripe.com
- [ ] Update `.env.local` with keys
- [ ] Restart dev server
- [ ] Test API endpoints return 200
- [ ] Verify no "Invalid API Key" errors

### Phase 3 Testing
- [ ] Create Stripe test products
- [ ] Test subscription assignment API
- [ ] Test webhook event processing
- [ ] Verify database updates
- [ ] Test with test card numbers

### Phase 4 Testing
- [ ] Sign in as operator
- [ ] Navigate to `/operator/payments`
- [ ] Verify page loads without errors
- [ ] Verify subscription data displays correctly
- [ ] Verify invoices display

---

## Progress Summary

| Phase | Task | Status | Blocker |
|-------|------|--------|---------|
| 1 | Webmaster login redirect | ✅ DONE | None |
| 1 | User role API | ✅ DONE | None |
| 1 | Test user creation | ✅ DONE | None |
| 2 | Stripe SDK wrapper | ✅ DONE | None |
| 2 | Stripe DB utilities | ✅ DONE | None |
| 2 | Subscription assignment API | ✅ DONE | None |
| 2 | Webhook handler | ✅ DONE | None |
| 3 | Get Stripe API keys | ⏳ PENDING | User action: Create Stripe account |
| 3 | Configure .env.local | ⏳ PENDING | User action: Add Stripe keys |
| 3 | Create test products | ⏳ PENDING | Phase 3 start |
| 3 | Test all integrations | ⏳ PENDING | Phase 3 start |
| 4 | Operator payments page | ✅ DONE | None |
| 4 | Payments API endpoint | ✅ DONE | None |
| 4 | Navigation update | ✅ DONE | None |
| 4 | Test payments page | ⏳ PENDING | Phase 3 success |
| 5 | Operator plan upgrade/downgrade | ⏳ NOT STARTED | Phase 4 success |
| 5 | Payment method management | ⏳ NOT STARTED | Phase 4 success |
| 5 | Billing history export | ⏳ NOT STARTED | Phase 4 success |

---

## Current Status: Phase 3 Ready

All Phase 1, 2, and 4 infrastructure is **COMPLETE** and **CODE-READY**.

**Immediate Next Steps**:
1. ✅ Test webmaster login redirect (code ready)
2. ⏳ Get Stripe test API keys
3. ⏳ Configure `.env.local`
4. ⏳ Test Stripe integration
5. ⏳ Test operator payments page
6. ⏳ Build operator subscription management

**Blocking Item**: Need Stripe test account and API keys

---

## Documentation Files Created

- [x] [STRIPE_SETUP.md](./STRIPE_SETUP.md) - Complete Stripe setup guide
- [x] [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Step-by-step testing instructions
- [x] [PHASE5_IMPLEMENTATION.md](./PHASE5_IMPLEMENTATION.md) - This checklist

---

## Code Files Created This Session

### New Files (7 total)
1. `lib/stripe.ts` - Stripe SDK wrapper (220 lines)
2. `lib/stripe-db.ts` - Stripe database utilities (280 lines)
3. `app/api/auth/user-role/route.ts` - User role API (25 lines)
4. `app/api/webmaster/subscriptions/assign-plan/route.ts` - Subscription assignment API (80 lines)
5. `app/api/webhooks/stripe/route.ts` - Webhook handler (120 lines)
6. `app/operator/payments/page.tsx` - Operator payments UI (250 lines)
7. `app/api/operator/payments/route.ts` - Payments API endpoint (80 lines)
8. `scripts/create-webmaster.ts` - Webmaster user creation script (50 lines)

### Files Updated (2 total)
1. `app/auth/signin/page.tsx` - Added role-based redirect logic and quick-start buttons
2. `app/operator/page.tsx` - Added payments navigation tab

### Total Code Added: ~1,200 lines

---

**Last Updated**: December 2024
**Maintained By**: Development Team
**Version**: 1.0
