# Billing Kit

Reusable, drop-in Stripe Billing package for Next.js (App Router) + Neon Postgres + Vercel.

## Quick Links

- 📖 [Full Documentation](./README.md)
- 🧪 [Testing Guide](./TESTING.md)
- ⚙️ [Environment Variables](./.env.example)
- 🔌 [Adapters](./src/adapters/README.md)
- 🗄️ [Database Migrations](./src/db/migrations/README.md)

## What's Included

- ✅ **Backend-First Billing**: API handlers, webhook processing, DB projections
- ✅ **Adapter-Based**: Zero dependencies on auth/DB libraries (bring your own)
- ✅ **Production-Grade**: Error handling, logging, idempotency, type safety
- ✅ **Serverless-Optimized**: Works on Vercel with Neon Postgres
- ✅ **Entitlement Gating**: `requireActiveSubscription()` for paid features

## Installation (Quick Start)

```bash
# 1. Install dependencies
npm install stripe @neondatabase/serverless

# 2. Run migrations
psql $DATABASE_URL -f packages/billing-kit/src/db/migrations/001-init.sql

# 3. Copy .env.example and fill in values
cp packages/billing-kit/.env.example .env.local

# 4. Create adapters (see README.md)
# 5. Mount API routes (see README.md)
# 6. Test with Stripe CLI
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## File Structure

```
billing-kit/
├── README.md              # Full documentation
├── TESTING.md             # Testing guide with Stripe CLI
├── .env.example           # Environment variables template
├── package.json           # NPM package config
├── tsconfig.json          # TypeScript config
│
├── src/
│   ├── index.ts           # Main export (use this in host app)
│   ├── types.ts           # All TypeScript types
│   ├── errors.ts          # Custom error classes
│   ├── config.ts          # Configuration loader
│   │
│   ├── adapters/          # Adapter interfaces (NO dependencies)
│   │   ├── auth-adapter.ts       # Auth interface
│   │   ├── db-adapter.ts         # Database interface
│   │   ├── examples/
│   │   │   ├── next-auth-v5.ts   # Next-Auth v5 example
│   │   │   └── neon.ts           # Neon Postgres example
│   │   └── README.md
│   │
│   ├── db/                # Database layer
│   │   ├── queries.ts            # All DB operations
│   │   └── migrations/
│   │       ├── 001-init.sql      # Initial schema
│   │       └── README.md
│   │
│   ├── stripe/            # Stripe integration
│   │   ├── client.ts             # Stripe SDK wrapper
│   │   ├── webhook.ts            # Webhook engine
│   │   └── handlers/             # Event handlers
│   │       ├── checkout.session.completed.ts
│   │       ├── customer.subscription.created.ts
│   │       ├── customer.subscription.updated.ts
│   │       ├── customer.subscription.deleted.ts
│   │       ├── invoice.payment_succeeded.ts
│   │       └── invoice.payment_failed.ts
│   │
│   ├── api/               # API handlers (mount in Next.js routes)
│   │   ├── ensure-customer.ts    # POST /api/billing/customer
│   │   ├── create-checkout.ts    # POST /api/billing/checkout
│   │   ├── create-portal.ts      # POST /api/billing/portal
│   │   ├── get-subscription.ts   # GET /api/billing/subscription
│   │   └── list-invoices.ts      # GET /api/billing/invoices
│   │
│   ├── entitlements/      # Access control
│   │   ├── gate.ts               # requireActiveSubscription()
│   │   └── policy.ts             # Entitlement rules
│   │
│   └── utils/             # Optional utilities
│       └── sync-plans.ts         # Sync plans from Stripe
```

## Core Concepts

### 1. Adapters (Zero Dependencies)

billing-kit **never** imports auth or database libraries. Instead:

```typescript
// Host app provides adapters
import { ensureCustomer } from '@billing-kit/core';
import { authAdapter } from '@/lib/billing/auth-adapter';  // Your implementation
import { dbAdapter } from '@/lib/billing/db-adapter';      // Your implementation

await ensureCustomer({ authAdapter, dbAdapter, config });
```

### 2. Webhook-Driven (Source of Truth)

Stripe webhooks update database projections:

```
Stripe Event → Webhook → Handler → DB Upsert → Cache Updated
```

### 3. Idempotent Processing

All webhooks are idempotent via `stripe_events` table:

```sql
INSERT INTO stripe_events (stripe_event_id, ...)
ON CONFLICT (stripe_event_id) DO NOTHING;
```

### 4. Entitlement Gating

Protect features with one function:

```typescript
await requireActiveSubscription(db, userId);
// Throws SubscriptionError if no valid subscription
```

## Integration Pattern

```typescript
// app/api/billing/checkout/route.ts
import { createCheckoutSession, loadConfig } from '@billing-kit/core';
import { authAdapter } from '@/lib/billing/auth-adapter';
import { dbAdapter } from '@/lib/billing/db-adapter';

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

## Next Steps

1. Read [README.md](./README.md) for full installation guide
2. Follow [TESTING.md](./TESTING.md) to test locally with Stripe CLI
3. Review [src/adapters/README.md](./src/adapters/README.md) for adapter setup
4. Check [.env.example](./.env.example) for required env vars
5. Deploy to Vercel and configure production webhooks

## Support

- 📚 Stripe Docs: https://stripe.com/docs/billing
- 🔧 Stripe CLI: https://stripe.com/docs/stripe-cli
- 💬 Neon Docs: https://neon.tech/docs

## License

MIT
