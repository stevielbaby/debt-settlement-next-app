# Billing Kit - Quick Reference Card

**One-page cheat sheet for common operations**

## 🚀 Installation (5 Minutes)

```bash
# 1. Install deps
npm install stripe @neondatabase/serverless

# 2. Run migrations
psql $DATABASE_URL -f packages/billing-kit/src/db/migrations/001-init.sql

# 3. Set env vars (copy .env.example)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
BILLING_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://...

# 4. Start webhook forwarding
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## 📚 Imports

```typescript
// Core API handlers
import {
  ensureCustomer,
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  listInvoices,
} from '@billing-kit/core';

// Entitlements
import { requireActiveSubscription, checkSubscriptionAccess } from '@billing-kit/core';

// Webhook processing
import { processWebhook, getRawBody } from '@billing-kit/core';

// Config & client
import { loadConfig, createStripeClient } from '@billing-kit/core';

// Types
import type { AuthAdapter, DBAdapter, BillingConfig } from '@billing-kit/core';
```

## 🔧 API Route Patterns

### Ensure Customer
```typescript
// POST /api/billing/customer
const result = await ensureCustomer({ authAdapter, dbAdapter, config });
// Returns: { billing_account_id, stripe_customer_id }
```

### Create Checkout
```typescript
// POST /api/billing/checkout
const result = await createCheckoutSession({
  authAdapter, dbAdapter, config,
  request: { price_id: 'price_123' }
});
// Returns: { url, session_id }
```

### Customer Portal
```typescript
// POST /api/billing/portal
const result = await createPortalSession({ authAdapter, dbAdapter, config });
// Returns: { url }
```

### Get Subscription
```typescript
// GET /api/billing/subscription
const result = await getSubscription({ authAdapter, dbAdapter, config });
// Returns: { subscription, plan }
```

### List Invoices
```typescript
// GET /api/billing/invoices
const result = await listInvoices({ authAdapter, dbAdapter, config, limit: 20 });
// Returns: { invoices, has_more }
```

## 🛡️ Entitlement Gating

```typescript
// Require active subscription (throws if invalid)
await requireActiveSubscription(dbAdapter, userId);

// Check access (returns boolean)
const hasAccess = await checkSubscriptionAccess(dbAdapter, userId);

// Use in API route
export async function GET() {
  const user = await authAdapter.requireUser();
  await requireActiveSubscription(dbAdapter, user.id);
  return Response.json({ data: 'protected' });
}
```

## 🎣 Webhook Handler

```typescript
// POST /api/stripe/webhook
export const runtime = 'nodejs'; // Important!

export async function POST(req: Request) {
  const config = loadConfig();
  const stripe = createStripeClient(config);
  const rawBody = await getRawBody(req);
  const signature = req.headers.get('stripe-signature')!;
  
  const result = await processWebhook({
    rawBody, signature, stripe, db: dbAdapter, config
  });
  
  return Response.json(result);
}
```

## 🔐 Adapter Implementation

### Auth Adapter
```typescript
class MyAuthAdapter implements AuthAdapter {
  async getCurrentUser(): Promise<AuthUser | null> { /* ... */ }
  async requireUser(): Promise<AuthUser> { /* ... */ }
  async isAdmin(userId: string): Promise<boolean> { /* ... */ }
}
```

### DB Adapter
```typescript
class MyDBAdapter implements DBAdapter {
  async query<T>(sql: string, params?: any[]) {
    return { rows: [...], rowCount: n };
  }
}
```

## 🧪 Stripe CLI Commands

```bash
# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_succeeded

# View events
stripe events list --limit 10

# Resend event
stripe events resend evt_123
```

## 🗄️ Database Queries

```sql
-- Check webhook events
SELECT * FROM stripe_events ORDER BY created_at DESC LIMIT 5;

-- Find user's billing account
SELECT * FROM billing_accounts WHERE user_id = 'user_123';

-- Get active subscriptions
SELECT * FROM subscriptions WHERE status IN ('active', 'trialing');

-- Recent invoices
SELECT * FROM invoices ORDER BY created_at DESC LIMIT 10;

-- Failed webhooks
SELECT * FROM stripe_events WHERE processed = FALSE;

-- Plans
SELECT * FROM plans WHERE is_active = TRUE;
```

## 💳 Test Cards

| Card | Result |
|------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0025 0000 3155` | Requires auth |
| `4000 0000 0000 9995` | Declined |

Expiry: Any future date | CVC: Any 3 digits | ZIP: Any 5 digits

## ⚙️ Environment Variables

```bash
# Required
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
BILLING_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://...

# Optional
STRIPE_PORTAL_CONFIGURATION_ID=bpc_...
STRIPE_PRICE_ID_STARTER_MONTHLY=price_...
BILLING_GRACE_PERIOD_ENABLED=false
BILLING_GRACE_PERIOD_DAYS=3
```

## 🐛 Debugging

```typescript
// Enable logging
const logger = {
  info: (msg, meta) => console.log('[BILLING]', msg, meta),
  error: (msg, meta) => console.error('[BILLING]', msg, meta),
  // ...
};
const config = loadConfig(logger);

// Check webhook errors
SELECT stripe_event_id, type, processing_error 
FROM stripe_events WHERE processed = FALSE;

// Verify customer exists
SELECT * FROM billing_accounts WHERE user_id = 'user_123';
```

## 📦 File Structure (Copy to Your App)

```
lib/billing/
├── auth-adapter.ts      # Your AuthAdapter implementation
├── db-adapter.ts        # Your DBAdapter implementation
└── config.ts            # Shared config loader

app/api/
├── billing/
│   ├── customer/route.ts
│   ├── checkout/route.ts
│   ├── portal/route.ts
│   ├── subscription/route.ts
│   └── invoices/route.ts
└── stripe/
    └── webhook/route.ts
```

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| Webhook signature fails | Verify `STRIPE_WEBHOOK_SECRET`, use `getRawBody()` |
| No subscription after checkout | Check `stripe_events` for errors |
| Plans table empty | Run sync utility or seed manually |
| Customer not found | Call `ensureCustomer()` first |

## 📖 Full Documentation

- [README.md](./README.md) - Complete setup guide
- [TESTING.md](./TESTING.md) - Testing with Stripe CLI
- [examples/README.md](./examples/README.md) - Integration examples

## 🎯 Workflow

```
1. User clicks "Subscribe"
2. Frontend calls POST /api/billing/checkout
3. Backend creates Stripe Checkout Session
4. User completes checkout
5. Stripe sends webhook → POST /api/stripe/webhook
6. billing-kit processes event, updates DB
7. User has active subscription
8. API routes use requireActiveSubscription() to gate features
```

---

**Need help?** See TESTING.md for troubleshooting guide
