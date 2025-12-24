# Example Integration - Host App

This directory contains example files showing how to integrate billing-kit into your Next.js app.

## File Structure (Copy to Your App)

```
your-app/
├── lib/
│   └── billing/
│       ├── auth-adapter.ts      # Auth adapter implementation
│       ├── db-adapter.ts        # Database adapter implementation
│       └── config.ts            # Billing configuration
│
├── app/
│   ├── api/
│   │   ├── billing/
│   │   │   ├── customer/route.ts       # POST /api/billing/customer
│   │   │   ├── checkout/route.ts       # POST /api/billing/checkout
│   │   │   ├── portal/route.ts         # POST /api/billing/portal
│   │   │   ├── subscription/route.ts   # GET /api/billing/subscription
│   │   │   └── invoices/route.ts       # GET /api/billing/invoices
│   │   │
│   │   └── stripe/
│   │       └── webhook/route.ts         # POST /api/stripe/webhook
│   │
│   └── (pages with UI)
│       ├── billing/
│       │   ├── page.tsx                 # Billing dashboard
│       │   ├── success/page.tsx         # Checkout success
│       │   └── canceled/page.tsx        # Checkout canceled
│       │
│       └── pricing/page.tsx             # Pricing page with subscribe buttons
```

## Integration Steps

### 1. Install Dependencies

```bash
npm install stripe @neondatabase/serverless
```

### 2. Run Migrations

```bash
psql $DATABASE_URL -f packages/billing-kit/src/db/migrations/001-init.sql
```

### 3. Set Environment Variables

Copy `.env.example` from billing-kit and fill in values.

### 4. Create Adapters

See example files in this directory:
- `lib-billing-auth-adapter.ts` - Auth adapter for Next-Auth v5
- `lib-billing-db-adapter.ts` - Database adapter for Neon
- `lib-billing-config.ts` - Shared config loader

### 5. Mount API Routes

Copy route handlers from `api/` directory to your `app/api/` structure.

### 6. Create UI (Optional)

See example UI components in `components/` directory.

## Usage Examples

### Protect API Route

```typescript
// app/api/protected/route.ts
import { requireActiveSubscription } from '@billing-kit/core';
import { authAdapter } from '@/lib/billing/auth-adapter';
import { dbAdapter } from '@/lib/billing/db-adapter';

export async function GET() {
  const user = await authAdapter.requireUser();
  await requireActiveSubscription(dbAdapter, user.id);
  
  return Response.json({ data: 'protected content' });
}
```

### Protect Server Component

```typescript
// app/dashboard/page.tsx
import { requireActiveSubscription } from '@billing-kit/core';
import { auth } from '@/auth';
import { dbAdapter } from '@/lib/billing/db-adapter';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/signin');
  
  await requireActiveSubscription(dbAdapter, session.user.id);
  
  return <div>Protected Dashboard</div>;
}
```

### Subscribe Button (Client Component)

```typescript
'use client';

export function SubscribeButton({ priceId }: { priceId: string }) {
  const [loading, setLoading] = useState(false);
  
  async function handleSubscribe() {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_id: priceId }),
      });
      
      const { url } = await res.json();
      window.location.href = url;
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }
  
  return (
    <button onClick={handleSubscribe} disabled={loading}>
      {loading ? 'Loading...' : 'Subscribe'}
    </button>
  );
}
```

## Testing

See [TESTING.md](../TESTING.md) for comprehensive testing guide.

Quick test:
```bash
# Start webhook forwarding
stripe listen --forward-to localhost:3000/api/stripe/webhook

# In another terminal, trigger test event
stripe trigger checkout.session.completed
```
