# Adapters

Adapters are the bridge between billing-kit and your host application.

## Required Adapters

### 1. Auth Adapter

Provides user identity to billing-kit without depending on a specific auth library.

**Interface:** `AuthAdapter` (see [auth-adapter.ts](./auth-adapter.ts))

**Methods:**
- `getCurrentUser(): Promise<AuthUser | null>` - Get current authenticated user
- `requireUser(): Promise<AuthUser>` - Require authentication (throws if not authenticated)
- `isAdmin?(userId): Promise<boolean>` - Optional admin check

### 2. Database Adapter

Provides database access to billing-kit without depending on a specific database driver.

**Interface:** `DBAdapter` (see [db-adapter.ts](./db-adapter.ts))

**Methods:**
- `query<T>(sql, params): Promise<{ rows: T[], rowCount: number }>` - Execute parameterized query
- `transaction?(callback): Promise<T>` - Optional transaction support

## Example Implementations

### Next-Auth v5 (Your Stack)

See [examples/next-auth-v5.ts](./examples/next-auth-v5.ts)

```typescript
import { NextAuthAdapter } from '@billing-kit/core/adapters/examples/next-auth-v5';

const authAdapter = new NextAuthAdapter();
```

### Neon Postgres (Your Stack)

See [examples/neon.ts](./examples/neon.ts)

```typescript
import { NeonAdapter } from '@billing-kit/core/adapters/examples/neon';

const dbAdapter = new NeonAdapter(process.env.DATABASE_URL);
```

## Usage in Host App

```typescript
// app/api/billing/checkout/route.ts
import { createCheckoutSession } from '@billing-kit/core';
import { nextAuthAdapter } from '@/lib/billing/auth-adapter';
import { neonAdapter } from '@/lib/billing/db-adapter';

export async function POST(req: Request) {
  const user = await nextAuthAdapter.requireUser();
  const body = await req.json();

  const result = await createCheckoutSession({
    authAdapter: nextAuthAdapter,
    dbAdapter: neonAdapter,
    userId: user.id,
    priceId: body.price_id,
  });

  return Response.json(result);
}
```

## Custom Adapters

If you're not using Next-Auth v5 or Neon, implement the adapter interfaces for your stack:

1. Copy the interface files
2. Implement the required methods
3. Pass your custom adapters to billing-kit functions

**Example with Clerk + Prisma:**

```typescript
// Custom Clerk adapter
class ClerkAdapter implements AuthAdapter {
  async getCurrentUser() {
    const { userId } = auth();
    if (!userId) return null;
    const user = await currentUser();
    return { id: userId, email: user.emailAddresses[0].emailAddress, name: user.fullName };
  }
  
  async requireUser() {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Unauthorized');
    return user;
  }
}

// Custom Prisma adapter
class PrismaAdapter implements DBAdapter {
  async query(sql: string, params?: any[]) {
    const result = await prisma.$queryRawUnsafe(sql, ...params);
    return { rows: result, rowCount: result.length };
  }
}
```
