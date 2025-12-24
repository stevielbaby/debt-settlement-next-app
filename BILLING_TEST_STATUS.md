# Billing Kit Testing - Status Summary

**Date**: December 23, 2025  
**Status**: ✅ **READY FOR TESTING**

## Docker Environment

### Running Services
- **App Container**: `debt-settlement-next-app-app-1`
  - Status: Running
  - Port: 3000 → 3000
  - URL: http://localhost:3000
  - Image: node:20-alpine
  - Hot Reload: ✅ Enabled

### Quick Access
```bash
# Application
open http://localhost:3000

# Container logs
docker compose logs -f app

# Container status
docker compose ps

# Stop/Start
docker compose down
docker compose up -d
```

## Test Results

### ✅ All Pre-flight Tests Passing (8/8)

| Test | Status | Details |
|------|--------|---------|
| Database Connection | ✓ | Connected successfully |
| Stripe Configuration | ✓ | Test mode active |
| Webhook Secret | ✓ | Configured |
| Required Tables | ✓ | All 5 tables exist |
| Plans Seeded | ✓ | 2 plans found |
| Billing-Kit Modules | ✓ | All 7 exports available |
| Event Handlers | ✓ | 6 handlers ready |
| Stripe Products | ✓ | Starter ($9.99) & Pro ($29.99) |

### Database State

**Statistics:**
- Billing Accounts: 1
- Active Subscriptions: 0
- Total Invoices: 0
- Webhook Events: 9 (all processed ✓)
- Failed Webhooks: 0

**Plans Available:**
1. **Starter Plan** - $9.99/month
   - Product: `prod_TeZBQQDJ7Oj15H`
   - Price: `price_1ShG2vAUkFju08p48WvG1YuE`

2. **Pro Plan** - $29.99/month
   - Product: `prod_TeheIrylGDPHW8`
   - Price: `price_1ShOFBAUkFju08p4q9DGg8f3`

## Available Test Scripts

### Inside Docker Container
```bash
# Run all tests
docker compose exec app npx tsx packages/billing-kit/scripts/run-tests.ts

# Inspect database
docker compose exec app npx tsx packages/billing-kit/scripts/test-database.ts

# Run integration tests (requires webhook forwarding)
docker compose exec app npx tsx packages/billing-kit/scripts/test-integration.ts
```

### From Host Machine
```bash
cd packages/billing-kit

# Run pre-flight tests
npm test

# Inspect database
npm run test:db

# Integration tests
npm run test:integration
```

## Next Testing Steps

### 1. Start Stripe Webhook Forwarding
```bash
# Terminal 1 - Keep running
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**Expected Output:**
```
> Ready! Your webhook signing secret is whsec_...
```

### 2. Trigger Test Webhooks
```bash
# Terminal 2 - Trigger events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.deleted
```

### 3. Watch Processing
```bash
# Terminal 3 - Watch app logs
docker compose logs -f app | grep -i webhook
```

### 4. Verify Database Updates
```bash
# After triggering events
docker compose exec app npx tsx packages/billing-kit/scripts/test-database.ts
```

## Integration Test Scenarios

### Scenario 1: Complete Checkout Flow
1. Create checkout session via API
2. Complete checkout with test card: `4242 4242 4242 4242`
3. Verify subscription created in database
4. Check webhook events processed

### Scenario 2: Subscription Lifecycle
1. Create subscription
2. Update subscription (change plan)
3. Cancel subscription
4. Verify all state changes in database

### Scenario 3: Invoice Handling
1. Trigger successful payment
2. Trigger failed payment
3. Verify invoice records
4. Check payment status updates

### Scenario 4: Webhook Idempotency
1. Send same webhook twice
2. Verify only one record created
3. Check `stripe_events` table for duplicates

## Test Cards (Stripe Test Mode)

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Success |
| `4000 0025 0000 3155` | Requires authentication |
| `4000 0000 0000 9995` | Declined - insufficient funds |
| `4000 0000 0000 0341` | Declined - processing error |

Expiry: Any future date (e.g., `12/34`)  
CVC: Any 3 digits (e.g., `123`)  
ZIP: Any 5 digits (e.g., `12345`)

## Monitoring & Debugging

### Real-time Monitoring
```bash
# App logs
docker compose logs -f app

# Filter for specific keywords
docker compose logs -f app | grep -i "webhook\|billing\|stripe"

# Database watch (run periodically)
watch -n 5 "docker compose exec app npx tsx packages/billing-kit/scripts/test-database.ts"
```

### Debugging Failed Webhooks
```bash
# Check for processing errors
docker compose exec app psql $DATABASE_URL -c "
  SELECT stripe_event_id, type, processing_error, created_at
  FROM stripe_events
  WHERE processed = FALSE
  ORDER BY created_at DESC
  LIMIT 10;
"
```

### Check Subscription Status
```bash
# Query active subscriptions
docker compose exec app psql $DATABASE_URL -c "
  SELECT s.stripe_subscription_id, s.status, s.current_plan_key, ba.email
  FROM subscriptions s
  JOIN billing_accounts ba ON s.billing_account_id = ba.id
  WHERE s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC;
"
```

## API Endpoints to Test

### Billing APIs
- `POST /api/billing/checkout` - Create checkout session
- `POST /api/billing/portal` - Create customer portal
- `GET /api/billing/subscription` - Get subscription
- `GET /api/billing/invoices` - List invoices

### Webhook Endpoint
- `POST /api/stripe/webhook` - Process Stripe webhooks

### Test in Browser
- Navigate to http://localhost:3000
- Test signup/checkout flows
- Access customer portal
- View subscription status

## Success Criteria

### ✅ Environment Setup
- [x] Docker containers running
- [x] Database connected
- [x] Stripe configured
- [x] Plans seeded
- [x] All code modules available

### 🔄 Integration Tests (Next)
- [ ] Webhook forwarding active
- [ ] Checkout session creation works
- [ ] Webhook events process successfully
- [ ] Database updates correctly
- [ ] Subscription lifecycle complete
- [ ] Invoice handling verified
- [ ] Idempotency confirmed

### 📋 Manual Tests (After Integration)
- [ ] UI checkout flow
- [ ] Customer portal access
- [ ] Payment success/failure handling
- [ ] Subscription management
- [ ] Invoice viewing

## Troubleshooting

### Issue: Webhook signature verification fails
**Fix**: Ensure `STRIPE_WEBHOOK_SECRET` matches Stripe CLI output

### Issue: Tests can't connect to database
**Fix**: Verify `DATABASE_URL` is set and accessible

### Issue: Stripe API errors
**Fix**: Check `STRIPE_SECRET_KEY` is valid test mode key

### Issue: Container won't start
**Fix**: `docker compose down && docker compose up -d --force-recreate`

## Documentation References

- [Billing Kit Testing Guide](packages/billing-kit/TESTING.md)
- [Docker Testing Guide](DOCKER_TESTING.md)
- [Main Testing Guide](TESTING_GUIDE.md)
- [Stripe Test Cards](https://stripe.com/docs/testing)

---

**Ready to proceed with integration testing!** 🚀

Start webhook forwarding and trigger test events to complete the testing workflow.
