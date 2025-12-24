# Billing Kit

**Reusable, drop-in Stripe Billing package for Next.js (App Router) + Neon Postgres + Vercel**

A backend-first, production-grade billing module that can be added to any Next.js app on the same stack by copying a folder, running DB migrations, setting env vars, and wiring auth.

## Features

- ✅ **Backend-First**: API handlers, webhook processing, database projections
- ✅ **Adapter-Based**: No hardcoded dependencies on auth or database libraries
- ✅ **Webhook-Driven**: Stripe webhooks are the source of truth; DB is a projection/cache
- ✅ **Serverless-Safe**: Optimized for Vercel with Neon pooled connections
- ✅ **Subscription Management**: Create checkouts, manage subscriptions, customer portal
- ✅ **Entitlement Gating**: `requireActiveSubscription()` for protecting paid features
- ✅ **Idempotent Webhooks**: Race-safe event processing with deduplication
- ✅ **TypeScript**: Fully typed with production-grade error handling

## Installation

### 1. Copy Package to Your App

```bash
# Option A: Copy folder
cp -r packages/billing-kit /path/to/your-app/packages/

# Option B: Install as internal package (monorepo)
# Add to package.json:
# "dependencies": { "@billing-kit/core": "workspace:*" }
```

### 2. Install Dependencies

```bash
npm install stripe @neondatabase/serverless
```

### 3. Run Database Migrations

```bash
# Using psql
psql $DATABASE_URL -f packages/billing-kit/src/db/migrations/001-init.sql

# OR using Neon SQL Editor (copy SQL contents to console)
```

Verify tables:
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND (tablename LIKE '%billing%' OR tablename = 'plans' OR tablename LIKE 'stripe_%');
```

### 4. Set Environment Variables

Add to `.env.local` (local) and Vercel dashboard (production):

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App URL (for checkout redirects)
BILLING_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Plan Price IDs (optional, for convenience)
STRIPE_PRICE_ID_STARTER_MONTHLY=price_...
STRIPE_PRICE_ID_PRO_MONTHLY=price_...

# Optional: Customer Portal Configuration
STRIPE_PORTAL_CONFIGURATION_ID=bpc_...

# Optional: Grace Period
BILLING_GRACE_PERIOD_ENABLED=false
BILLING_GRACE_PERIOD_DAYS=3
```

### 5. Create Adapters

#### Auth Adapter (Next-Auth v5 Example)

Create `lib/billing/auth-adapter.ts`:

```typescript
import { NextAuthAdapter } from '@billing-kit/core/adapters/examples/next-auth-v5';

export const authAdapter = new NextAuthAdapter();
```

#### DB Adapter (Neon Example)

Create `lib/billing/db-adapter.ts`:

```typescript
import { NeonAdapter } from '@billing-kit/core/adapters/examples/neon';

export const dbAdapter = new NeonAdapter(process.env.DATABASE_URL);
```

### 6. Mount API Routes

Create Next.js App Router route handlers:

#### `app/api/billing/customer/route.ts`

```typescript
import { ensureCustomer } from '@billing-kit/core';
import { authAdapter } from '@/lib/billing/auth-adapter';
import { dbAdapter } from '@/lib/billing/db-adapter';
import { loadConfig } from '@billing-kit/core';

export async function POST() {
  const config = loadConfig();
  const result = await ensureCustomer({ authAdapter, dbAdapter, config });
  return Response.json(result);
}
```

#### `app/api/billing/checkout/route.ts`

```typescript
import { createCheckoutSession } from '@billing-kit/core';
import { authAdapter } from '@/lib/billing/auth-adapter';
import { dbAdapter } from '@/lib/billing/db-adapter';
import { loadConfig } from '@billing-kit/core';

export async function POST(req: Request) {
  const config = loadConfig();
  const body = await req.json();
  
  const result = await createCheckoutSession({
    authAdapter,
    dbAdapter,
    config,
    request: { price_id: body.price_id },
  });
  
  return Response.json(result);
}
```

#### `app/api/billing/portal/route.ts`

```typescript
import { createPortalSession } from '@billing-kit/core';
import { authAdapter } from '@/lib/billing/auth-adapter';
import { dbAdapter } from '@/lib/billing/db-adapter';
import { loadConfig } from '@billing-kit/core';

export async function POST() {
  const config = loadConfig();
  const result = await createPortalSession({ authAdapter, dbAdapter, config });
  return Response.json(result);
}
```

#### `app/api/billing/subscription/route.ts`

```typescript
import { getSubscription } from '@billing-kit/core';
import { authAdapter } from '@/lib/billing/auth-adapter';
import { dbAdapter } from '@/lib/billing/db-adapter';
import { loadConfig } from '@billing-kit/core';

export async function GET() {
  const config = loadConfig();
  const result = await getSubscription({ authAdapter, dbAdapter, config });
  return Response.json(result);
}
```

#### `app/api/stripe/webhook/route.ts`

**CRITICAL**: Disable Next.js body parsing for webhook signature verification:

```typescript
import { processWebhook, getRawBody } from '@billing-kit/core';
import { createStripeClient } from '@billing-kit/core';
import { dbAdapter } from '@/lib/billing/db-adapter';
import { loadConfig } from '@billing-kit/core';

// Disable body parsing (required for Stripe signature verification)
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const config = loadConfig();
  const stripe = createStripeClient(config);
  
  // Get raw body
  const rawBody = await getRawBody(req);
  
  // Get signature from headers
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return Response.json({ error: 'Missing signature' }, { status: 400 });
  }
  
  try {
    const result = await processWebhook({
      rawBody,
      signature,
      stripe,
      db: dbAdapter,
      config,
    });
    
    return Response.json(result);
  } catch (error: any) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 400 });
  }
}
```

## Stripe Dashboard Setup

### 1. Create Products and Prices

1. Go to Stripe Dashboard → **Products**
2. Create products (e.g., "Starter Plan", "Pro Plan")
3. Add prices with recurring billing (monthly/yearly)
4. Copy Price IDs (e.g., `price_1abc...`) to `.env`

### 2. Configure Customer Portal

1. Go to **Settings** → **Billing** → **Customer Portal**
2. Enable portal and customize settings (cancellation, plan changes)
3. Copy Configuration ID to `STRIPE_PORTAL_CONFIGURATION_ID` (optional)

### 3. Create Webhook Endpoint

#### Local Development (Stripe CLI)

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy webhook secret (whsec_...) to STRIPE_WEBHOOK_SECRET
```

#### Production (Vercel)

1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. URL: `https://your-app.vercel.app/api/stripe/webhook`
3. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy **Signing secret** to `STRIPE_WEBHOOK_SECRET` in Vercel env vars

## Seeding Plans

### Option 1: Manual SQL Insert

```sql
INSERT INTO plans (key, name, stripe_product_id, stripe_price_id, interval, unit_amount)
VALUES 
  ('starter_monthly', 'Starter Plan', 'prod_abc', 'price_123', 'month', 999),
  ('pro_monthly', 'Pro Plan', 'prod_def', 'price_456', 'month', 2999);
```

### Option 2: Sync Utility (Recommended)

```typescript
import { syncPlansFromStripe } from '@billing-kit/core';
import { dbAdapter } from '@/lib/billing/db-adapter';

await syncPlansFromStripe({ db: dbAdapter });
```

## Usage Examples

### Protect API Routes with Entitlements

```typescript
// app/api/protected-feature/route.ts
import { requireActiveSubscription } from '@billing-kit/core';
import { authAdapter } from '@/lib/billing/auth-adapter';
import { dbAdapter } from '@/lib/billing/db-adapter';

export async function GET() {
  const user = await authAdapter.requireUser();
  
  // Require active subscription
  await requireActiveSubscription(dbAdapter, user.id);
  
  // User has valid subscription, proceed
  return Response.json({ data: 'protected content' });
}
```

### Client-Side: Subscribe Button

```typescript
'use client';

async function handleSubscribe() {
  // Create checkout session
  const res = await fetch('/api/billing/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ price_id: 'price_1abc...' }),
  });
  
  const { url } = await res.json();
  
  // Redirect to Stripe Checkout
  window.location.href = url;
}
```

### Client-Side: Customer Portal

```typescript
async function openPortal() {
  const res = await fetch('/api/billing/portal', { method: 'POST' });
  const { url } = await res.json();
  window.location.href = url;
}
```

## Testing

See [TESTING.md](./TESTING.md) for comprehensive testing guide including:
- Stripe CLI webhook forwarding
- Test card numbers
- Webhook verification
- Common issues and solutions

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Host App (Next.js)                  │
├─────────────────────────────────────────────────────────┤
│  Auth Adapter  │  DB Adapter  │  API Routes  │  UI     │
└────────┬────────┴──────┬──────┴──────┬───────┴─────────┘
         │               │              │
         └───────────────┼──────────────┘
                         │
         ┌───────────────▼───────────────┐
         │      Billing Kit Core         │
         ├───────────────────────────────┤
         │ • Stripe Client & Webhooks    │
         │ • Database Queries            │
         │ • Entitlement Gates           │
         │ • API Handlers                │
         └───────────┬───────────────────┘
                     │
         ┌───────────▼───────────────────┐
         │  Neon Postgres (Projections)  │
         │  • billing_accounts           │
         │  • plans                      │
         │  • subscriptions              │
         │  • invoices                   │
         │  • stripe_events              │
         └───────────────────────────────┘
```

**Webhook Flow:**
1. Stripe sends webhook → `/api/stripe/webhook`
2. Verify signature with `STRIPE_WEBHOOK_SECRET`
3. Insert event into `stripe_events` (idempotency check)
4. Dispatch to handler (e.g., `customer.subscription.updated`)
5. Upsert projections (`subscriptions`, `invoices`)
6. Mark event as processed

## Common Pitfalls

### 1. Webhook Signature Verification Fails

**Cause:** Next.js parsed the body, breaking signature verification.

**Solution:** Use `getRawBody()` helper and ensure route doesn't parse JSON automatically.

### 2. Stripe Events Processed Multiple Times

**Cause:** Missing idempotency check.

**Solution:** billing-kit handles this via `stripe_events` table (ON CONFLICT).

### 3. Vercel Function Timeout on Webhook

**Cause:** Long-running webhook processing.

**Solution:** billing-kit uses Neon's serverless driver (no connection pooling overhead). Keep handlers fast.

### 4. `DATABASE_URL` Not Set

**Cause:** Missing env var.

**Solution:** Set in `.env.local` and Vercel dashboard.

### 5. Plans Not Found

**Cause:** `plans` table is empty.

**Solution:** Run sync utility or seed manually.

## License

MIT

## Support

For issues or questions, see [TESTING.md](./TESTING.md) or open an issue in your host app repo.
