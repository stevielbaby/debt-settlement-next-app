# Verification Checklist - Pre-Testing

Use this checklist to verify all components are in place before starting tests.

## Code Verification ✅

### Core Files Exist
- [x] [lib/stripe.ts](lib/stripe.ts) - Stripe SDK wrapper
- [x] [lib/stripe-db.ts](lib/stripe-db.ts) - Stripe database utilities
- [x] [app/api/auth/user-role/route.ts](app/api/auth/user-role/route.ts) - User role endpoint
- [x] [app/api/webmaster/subscriptions/assign-plan/route.ts](app/api/webmaster/subscriptions/assign-plan/route.ts) - Assignment API
- [x] [app/api/webhooks/stripe/route.ts](app/api/webhooks/stripe/route.ts) - Webhook handler
- [x] [app/operator/payments/page.tsx](app/operator/payments/page.tsx) - Payments page
- [x] [app/api/operator/payments/route.ts](app/api/operator/payments/route.ts) - Payments API
- [x] [scripts/create-webmaster.ts](scripts/create-webmaster.ts) - Webmaster creation script

### Core Files Updated
- [x] [app/auth/signin/page.tsx](app/auth/signin/page.tsx) - Has role-based redirects
- [x] [app/operator/page.tsx](app/operator/page.tsx) - Has payments nav tab
- [x] [auth.ts](auth.ts) - Has role support (no changes needed)

### Documentation Files Exist
- [x] [STRIPE_SETUP.md](STRIPE_SETUP.md) - Setup guide (600+ lines)
- [x] [TESTING_GUIDE.md](TESTING_GUIDE.md) - Testing instructions (400+ lines)
- [x] [PHASE5_IMPLEMENTATION.md](PHASE5_IMPLEMENTATION.md) - Checklist (250+ lines)
- [x] [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Quick lookup (200+ lines)
- [x] [SESSION_SUMMARY.md](SESSION_SUMMARY.md) - This session summary

---

## Code Quality Checks ✅

### Stripe SDK ([lib/stripe.ts](lib/stripe.ts))
- [x] Imports Stripe SDK
- [x] Initializes with STRIPE_SECRET_KEY
- [x] Has 13+ exported functions
- [x] Error handling implemented
- [x] Console logging for debugging

### Stripe DB Utils ([lib/stripe-db.ts](lib/stripe-db.ts))
- [x] Imports database client
- [x] Has 7+ exported functions
- [x] Handles NULL values properly
- [x] Consistent error handling
- [x] Uses parameterized queries (SQL injection safe)

### Role API ([app/api/auth/user-role/route.ts](app/api/auth/user-role/route.ts))
- [x] Imports auth() from auth.ts
- [x] Checks session exists
- [x] Returns role in response
- [x] Returns 401 if not authenticated
- [x] Returns 500 on error

### Assignment API ([app/api/webmaster/subscriptions/assign-plan/route.ts](app/api/webmaster/subscriptions/assign-plan/route.ts))
- [x] Verifies webmaster role
- [x] Gets organization from database
- [x] Gets plan with price ID
- [x] Creates Stripe customer
- [x] Creates Stripe subscription
- [x] Saves to database
- [x] Returns subscription in response

### Webhook Handler ([app/api/webhooks/stripe/route.ts](app/api/webhooks/stripe/route.ts))
- [x] Verifies webhook signature
- [x] Handles 5+ event types
- [x] Updates database on events
- [x] Idempotent (handles duplicates)
- [x] Logs all events
- [x] Returns 200 on success

### Payments Page ([app/operator/payments/page.tsx](app/operator/payments/page.tsx))
- [x] Client component (use client)
- [x] Fetches data on mount
- [x] Displays subscription info
- [x] Shows usage progress bar
- [x] Displays invoices table
- [x] Has error handling
- [x] Has loading state
- [x] Responsive design

### Payments API ([app/api/operator/payments/route.ts](app/api/operator/payments/route.ts))
- [x] Gets operator's organization
- [x] Queries subscription data
- [x] Queries invoice data
- [x] Calculates usage percentage
- [x] Returns structured response
- [x] Handles missing subscription gracefully

---

## Environment Setup ✅

### .env.local Requirements
```env
✓ DATABASE_URL              (existing, keep as is)
✓ NEXTAUTH_SECRET           (existing, keep as is)
✓ NEXTAUTH_URL              (existing, http://localhost:3000)
✓ STRIPE_PUBLIC_KEY         (NEW, add from Stripe Dashboard)
✓ STRIPE_SECRET_KEY         (NEW, add from Stripe Dashboard)
✓ STRIPE_WEBHOOK_SECRET     (NEW, add from webhook endpoint)
```

### How to Get Stripe Keys
1. Go to https://dashboard.stripe.com
2. Log in (create account if needed)
3. Click "Developers" (top-right)
4. Click "API Keys"
5. Make sure you're in **Test mode** (toggle)
6. Copy "Publishable Key" (starts with pk_test_)
7. Copy "Secret Key" (starts with sk_test_)
8. Go back to "Developers" menu
9. Click "Webhooks"
10. Click "Add endpoint"
11. Enter URL: http://localhost:3000/api/webhooks/stripe
12. Select events: invoice.paid, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted, payment_intent.succeeded, payment_intent.payment_failed
13. Click "Add endpoint"
14. Copy "Signing secret" (starts with whsec_test_)

---

## Database Requirements ✅

### Required Columns
Run this SQL to add Stripe columns if they don't exist:

```sql
-- Check current columns
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'app' AND table_name = 'organizations';

-- Add if missing:
ALTER TABLE app.organizations 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Check organization_subscriptions
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'app' AND table_name = 'organization_subscriptions';

-- Add if missing:
ALTER TABLE app.organization_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255);

-- Check subscription_plans
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'app' AND table_name = 'subscription_plans';

-- Add if missing:
ALTER TABLE app.subscription_plans 
ADD COLUMN IF NOT EXISTS stripe_product_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255);

-- Check invoices
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'app' AND table_name = 'invoices';

-- Add if missing:
ALTER TABLE app.invoices 
ADD COLUMN IF NOT EXISTS stripe_invoice_id VARCHAR(255);
```

### Required Tables
```sql
-- Verify these exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'app' 
ORDER BY table_name;

-- Required:
- users
- organizations
- organization_subscriptions
- subscription_plans
- invoices
```

---

## Test Users ✅

### Webmaster Account
- Email: webmaster@strattondefense.com
- Password: webmaster123
- Role: webmaster
- Status: Should be created by [scripts/create-webmaster.ts](scripts/create-webmaster.ts)

**Create with**:
```bash
npx ts-node scripts/create-webmaster.ts
```

**Verify in database**:
```sql
SELECT id, email, role, org_id FROM app.users 
WHERE email = 'webmaster@strattondefense.com';
-- Should show: role = 'webmaster'
```

### Operator Account
- Email: operator@strattondefense.com
- Password: operator123
- Role: operator
- Status: Should already exist

**Verify in database**:
```sql
SELECT id, email, role, org_id FROM app.users 
WHERE email = 'operator@strattondefense.com';
-- Should show: role = 'operator'
```

---

## Pre-Test Checklist

### Before Running npm run dev

- [ ] All 11 code files exist (verified above)
- [ ] All 5 documentation files exist
- [ ] Node.js v20+ installed (`node --version`)
- [ ] npm dependencies installed (`npm list | grep stripe`)
- [ ] .env.local file exists with DATABASE_URL and NEXTAUTH_SECRET
- [ ] Database is accessible (test with `psql $DATABASE_URL`)
- [ ] Required database columns exist (run SQL above)

### When Starting npm run dev

- [ ] No compilation errors (watch for red text)
- [ ] Dev server starts on http://localhost:3000
- [ ] No "Cannot find module" errors
- [ ] No "Undefined variable" errors for Stripe keys (yet - these are OK until you add them)

### Test Phase 1: Login Redirect (No Stripe Keys Needed)

- [ ] Go to http://localhost:3000/auth/signin
- [ ] See login form with:
  - Email field
  - Password field
  - "Access System" button
  - "🔧 Webmaster Dashboard" quick-start button
  - "📋 Try Operator Account" quick-start button
- [ ] Click "🔧 Webmaster Dashboard"
- [ ] Should redirect to http://localhost:3000/webmaster
- [ ] Should see webmaster dashboard with sidebar
- [ ] Go back to signin, click "📋 Try Operator Account"
- [ ] Should redirect to http://localhost:3000/operator
- [ ] Should see operator dashboard with Case Queue, Submissions, **Billing & Payments**, Settings tabs

### Post Phase 1 Success: Add Stripe Keys

- [ ] Get test API keys from Stripe (follow steps above)
- [ ] Update .env.local with 3 new variables
- [ ] Stop dev server (Ctrl+C)
- [ ] Restart dev server (npm run dev)
- [ ] Verify no "Invalid API Key" errors in logs

### Test Phase 2: Operator Payments Page (With Stripe Keys)

- [ ] Sign in as operator
- [ ] Click "Billing & Payments" tab
- [ ] Should see page load (not 404)
- [ ] Should see "Subscription" section (or "No subscription" message)
- [ ] Should see "Usage" section
- [ ] Should see "Recent Invoices" section

---

## Troubleshooting During Verification

### Issue: File not found error
**Solution**: Verify file exists with exact path
```bash
ls -la app/api/auth/user-role/
ls -la lib/stripe.ts
```

### Issue: Compilation errors
**Solution**: Check for syntax errors in TypeScript
- Look for red squiggly lines in VS Code
- Run: `npm run build` (shows all errors)
- Fix any import paths or type issues

### Issue: Database connection error
**Solution**: Verify DATABASE_URL is correct
```bash
echo $DATABASE_URL
psql $DATABASE_URL -c "SELECT 1"  # Should return 1
```

### Issue: Stripe key errors when trying to use API
**Solution**: Stripe keys not in .env.local yet
- This is normal for Phase 1 testing
- Add keys before Phase 2
- Keys must start with sk_test_ (secret) or pk_test_ (public)

### Issue: Webmaster user not found
**Solution**: Create with script
```bash
npx ts-node scripts/create-webmaster.ts
```

---

## Quick Test Commands

```bash
# Verify Node version
node --version  # Should be v20.0.0 or higher

# Verify npm packages
npm list stripe  # Should be installed

# Verify database connection
psql $DATABASE_URL -c "SELECT count(*) as user_count FROM app.users;"

# Create webmaster user
npx ts-node scripts/create-webmaster.ts

# Start dev server
npm run dev

# In another terminal, test auth endpoint
curl http://localhost:3000/api/auth/user-role

# Test if dev server is running
curl http://localhost:3000  # Should return HTML

# Check for TypeScript errors
npm run build

# List all new files created
ls -la app/api/auth/user-role/
ls -la lib/stripe*
ls -la app/operator/payments/
ls -la app/api/operator/
ls -la app/api/webhooks/stripe/
```

---

## Success Indicators ✅

### Phase 1 Testing Success
- ✅ Webmaster login redirects to /webmaster
- ✅ Operator login redirects to /operator
- ✅ API endpoint /api/auth/user-role returns correct role
- ✅ Quick-start buttons auto-fill and submit
- ✅ No 404 errors on redirects

### Phase 2 Setup Success
- ✅ Stripe keys added to .env.local
- ✅ Dev server restarts without "Invalid API Key" errors
- ✅ No TypeScript errors in console

### Phase 3 Testing Success
- ✅ Operator /payments page loads
- ✅ No errors in browser console
- ✅ API endpoint /api/operator/payments returns data
- ✅ Subscription section displays (or "no subscription" gracefully)

---

## Next Steps After Verification

1. **If all checks pass**: Continue to [TESTING_GUIDE.md](TESTING_GUIDE.md)
2. **If errors found**: Check troubleshooting section above
3. **If stuck**: Review file contents in VS Code, check line numbers against docs

---

## Verification Metadata

- **Checklist Version**: 1.0
- **Last Updated**: December 2024
- **Total Items**: 60+
- **Estimated Time**: 20-30 minutes
- **Blocking Issues**: None if Stripe account created

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review [STRIPE_SETUP.md](STRIPE_SETUP.md) for Stripe setup help
3. Review [TESTING_GUIDE.md](TESTING_GUIDE.md) for testing help
4. Check [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for API reference
5. Check [SESSION_SUMMARY.md](SESSION_SUMMARY.md) for implementation details

---

**Ready to Start Testing?** ✅

If all checks pass, proceed to [TESTING_GUIDE.md](TESTING_GUIDE.md) Phase 1.
