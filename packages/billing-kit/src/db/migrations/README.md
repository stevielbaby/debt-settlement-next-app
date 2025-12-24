# Database Migrations

This directory contains SQL migrations for the billing-kit database schema.

## Migration Order

Run migrations in numerical order:

1. **001-init.sql** - Initial schema with all core tables

## Running Migrations

### Option 1: Direct psql execution

```bash
psql $DATABASE_URL -f packages/billing-kit/src/db/migrations/001-init.sql
```

### Option 2: Neon SQL Editor

Copy the contents of `001-init.sql` and execute in the Neon console SQL editor.

### Option 3: Custom migration runner

If your host app has a migration system, copy the SQL into your app's migration structure.

## Schema Overview

- **billing_accounts** - Maps app users to Stripe customers
- **plans** - Subscription plan catalog (seed manually or use sync utility)
- **subscriptions** - Subscription projections (updated via webhooks)
- **invoices** - Invoice projections (updated via webhooks)
- **stripe_events** - Webhook idempotency tracking

## After Migration

1. Verify tables exist:
   ```sql
   SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
   AND tablename LIKE '%billing%' OR tablename = 'plans' OR tablename LIKE 'stripe_%';
   ```

2. Seed plans (see sync utility in `src/utils/sync-plans.ts`)

3. Test with a webhook event to ensure projections are created correctly
