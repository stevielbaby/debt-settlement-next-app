# 🏗️ System Architecture Overview

## Complete System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     STRATTON DEFENSE SYSTEM                      │
│                   Phase 5 - Stripe Integration                   │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                          USER LAYER                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Webmaster                          Operator                     │
│  (webmaster@...)                    (operator@...)               │
│        │                                  │                      │
│        ▼                                  ▼                      │
│  /webmaster                          /operator                  │
│  (Dashboard)                         (Case Queue)               │
│        │                                  │                      │
│        └──────────────────┬───────────────┘                     │
│                          │                                      │
│                  New Tab Added:                                │
│          "Billing & Payments" → /operator/payments             │
│                                                                │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION LAYER                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  /auth/signin                                                   │
│    ├─ Credentials form                                          │
│    ├─ Quick-start buttons (for testing)                         │
│    │   ├─ 🔧 Webmaster Dashboard                              │
│    │   └─ 📋 Try Operator Account                             │
│    │                                                            │
│    ▼ Submit                                                     │
│  ┌─────────────────────────────┐                               │
│  │  auth.ts (authorize)        │                               │
│  │  ├─ Check credentials       │                               │
│  │  ├─ Verify password         │                               │
│  │  ├─ Get user role           │                               │
│  │  └─ Create session          │                               │
│  └────────────┬────────────────┘                               │
│               │                                                │
│    ┌──────────▼──────────┐                                     │
│    │ /api/auth/user-role │  (NEW)                              │
│    │ GET endpoint        │                                     │
│    │ Returns role for    │                                     │
│    │ post-login redirect │                                     │
│    └──────────┬──────────┘                                     │
│               │                                                │
│    ┌──────────┴─────────┬──────────┐                          │
│    │                    │          │                          │
│    ▼                    ▼          ▼                          │
│ webmaster→        operator→      client→                     │
│ /webmaster        /operator      /dashboard                 │
│                                                              │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                       API LAYER                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Webmaster APIs                    Operator APIs               │
│  ┌──────────────────────┐         ┌──────────────────────┐    │
│  │ POST /api/webmaster/ │         │ GET /api/operator/   │    │
│  │ subscriptions/       │         │ payments             │    │
│  │ assign-plan          │         │                      │    │
│  │                      │         │ Returns:             │    │
│  │ ├─ organizationId    │         │ ├─ subscription info │    │
│  │ ├─ planId            │         │ ├─ usage stats       │    │
│  │ │                    │         │ └─ recent invoices   │    │
│  │ ▼                    │         │                      │    │
│  │ 1. Get plan          │         │ Uses DB queries:     │    │
│  │ 2. Get/create Stripe │         │ ├─ subscription data │    │
│  │    customer          │         │ ├─ invoice data      │    │
│  │ 3. Create Stripe sub │         │ └─ usage metrics     │    │
│  │ 4. Save to DB        │         │                      │    │
│  │ 5. Return details    │         │ Calls:               │    │
│  │                      │         │ └─ lib/stripe-db.ts  │    │
│  │ Calls:               │         │                      │    │
│  │ ├─ lib/stripe.ts     │         │                      │    │
│  │ └─ lib/stripe-db.ts  │         │                      │    │
│  └──────────────────────┘         └──────────────────────┘    │
│                                                                │
│  Webhook API (NEW)                                             │
│  ┌─────────────────────────────────────┐                      │
│  │ POST /api/webhooks/stripe           │                      │
│  │                                     │                      │
│  │ Receives from Stripe:               │                      │
│  │ ├─ invoice.paid                     │                      │
│  │ ├─ invoice.payment_failed           │                      │
│  │ ├─ customer.subscription.updated    │                      │
│  │ ├─ customer.subscription.deleted    │                      │
│  │ ├─ payment_intent.succeeded         │                      │
│  │ └─ payment_intent.payment_failed    │                      │
│  │                                     │                      │
│  │ Verifies signature + Updates DB     │                      │
│  │                                     │                      │
│  │ Calls:                              │                      │
│  │ ├─ lib/stripe.ts (verify)           │                      │
│  │ └─ lib/stripe-db.ts (update)        │                      │
│  └─────────────────────────────────────┘                      │
│                                                                │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                       LIBRARY LAYER                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  lib/stripe.ts                   lib/stripe-db.ts             │
│  (Stripe SDK Wrapper)            (Database Integration)        │
│                                                                │
│  Functions:                      Functions:                   │
│  ├─ createStripeCustomer()       ├─ saveStripeCustomerId()   │
│  ├─ getOrCreateStripeCustomer() ├─ getStripeCustomerId()    │
│  ├─ createSubscription()         ├─ saveStripeSubscription() │
│  ├─ updateSubscription()         ├─ getStripeSubscription() │
│  ├─ cancelSubscription()         ├─ savePlanStripeIds()     │
│  ├─ getActiveSubscription()      ├─ getPlanStripePriceId()  │
│  ├─ createStripePrice()          ├─ saveStripeInvoice()     │
│  ├─ createStripeProduct()        ├─ updateInvoiceStatus()   │
│  ├─ listCustomerInvoices()       └─ getAllPlanStripeIds()   │
│  ├─ getUpcomingInvoice()                                     │
│  ├─ createPaymentIntent()                                    │
│  ├─ getSubscriptionStatus()                                  │
│  └─ getWebhookEvent()                                        │
│                                                                │
│  All with:                       All with:                    │
│  ├─ Error handling               ├─ Parameterized queries    │
│  ├─ Logging                      ├─ NULL handling            │
│  └─ Type safety                  └─ Transaction support      │
│                                                                │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                       UI LAYER                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  /operator/payments (NEW)                                       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Operator Billing & Payments Dashboard                    │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                                                           │  │
│  │  Subscription Card:                                     │  │
│  │  ├─ Plan name (e.g., "Professional")                   │  │
│  │  ├─ Status badge (active/past_due/canceled)            │  │
│  │  ├─ Monthly cost ($99/month)                           │  │
│  │  └─ Renews in X days                                   │  │
│  │                                                           │  │
│  │  Usage Card:                                            │  │
│  │  ├─ Current usage: 12/50 cases (24%)                   │  │
│  │  ├─ Progress bar [████░░░░░░░░░] (color-coded)         │  │
│  │  └─ ⚠️ Alert if > 90% usage                            │  │
│  │                                                           │  │
│  │  Invoices Table:                                        │  │
│  │  ├─ Amount | Status | Date                              │  │
│  │  ├─ $99.00 | Paid   | 2024-01-01                       │  │
│  │  └─ ... (recent 12 invoices)                            │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Fetches data from: /api/operator/payments                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────┐   ┌──────────────────────┐   │
│  │  Stripe (Payments Service)   │   │  Database (Postgres) │   │
│  │                              │   │                      │   │
│  │  ├─ Customers               │   │  Tables:             │   │
│  │  ├─ Subscriptions          │   │  ├─ users            │   │
│  │  ├─ Products & Prices      │   │  ├─ organizations    │   │
│  │  ├─ Invoices               │   │  ├─ organization_sub │   │
│  │  ├─ Payment Intents        │   │  ├─ subscription_    │   │
│  │  └─ Webhooks               │   │  │   plans           │   │
│  │                              │   │  ├─ invoices        │   │
│  │  Test Mode (with test keys) │   │  └─ usage_metrics   │   │
│  │  └─ Uses test cards         │   │                      │   │
│  └──────┬───────────────────────┘   └──────┬──────────────┘   │
│         │                                  │                   │
│         │ CREATE/READ              READ/WRITE/UPDATE          │
│         │ SUBSCRIPTIONS            DATA                       │
│         │                                  │                   │
│         └──────────────┬────────────────────┘                  │
│                       │                                        │
│              Bidirectional Sync                               │
│              (via webhooks & APIs)                            │
│                                                                │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    DATA FLOW DIAGRAM                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Webmaster Workflow:                                           │
│  1. Webmaster logs in                                          │
│  2. Redirects to /webmaster                                    │
│  3. Clicks "Assign Plan" button                                │
│  4. POST /api/webmaster/subscriptions/assign-plan              │
│     ├─ Creates Stripe customer                                │
│     ├─ Creates Stripe subscription                            │
│     └─ Saves to database                                      │
│  5. Subscription created!                                      │
│                                                                │
│  Operator Workflow:                                            │
│  1. Operator logs in                                           │
│  2. Redirects to /operator                                     │
│  3. Clicks "Billing & Payments" tab                            │
│  4. GET /api/operator/payments                                 │
│     ├─ Queries organization subscription                      │
│     ├─ Queries invoices                                       │
│     └─ Calculates usage %                                     │
│  5. Displays subscription + billing info                       │
│                                                                │
│  Stripe Webhook Workflow:                                      │
│  1. Stripe sends event (e.g., invoice.paid)                   │
│  2. POST /api/webhooks/stripe                                  │
│     ├─ Verifies signature                                     │
│     ├─ Parses event                                           │
│     └─ Updates database                                       │
│  3. Operator sees updated status                              │
│                                                                │
└──────────────────────────────────────────────────────────────────┘
```

---

## Component Interaction Map

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              auth.ts (Core Auth System)                    │
│              ├─ Credentials provider                       │
│              ├─ JWT callbacks                              │
│              └─ Session management                         │
│                    │                                       │
│    ┌───────────────┼───────────────┐                      │
│    │               │               │                      │
│    ▼               ▼               ▼                      │
│  signin        /api/auth/      Other routes              │
│  page          user-role        (protected)               │
│    │               │               │                      │
│    └───────────────┼───────────────┘                      │
│                    │                                       │
│          ┌─────────▼─────────┐                           │
│          │  Role-based       │                           │
│          │  Redirects        │                           │
│          └─────────┬─────────┘                           │
│                    │                                       │
│    ┌───────────────┼───────────────┐                      │
│    │               │               │                      │
│    ▼               ▼               ▼                      │
│  /webmaster   /operator        /dashboard                │
│               │                                           │
│               ▼                                           │
│        /operator/payments (NEW)                          │
│               │                                           │
│               ├─ Calls /api/operator/payments (NEW)       │
│               │                                           │
│               └─ Calls lib/stripe-db.ts functions        │
│                  ├─ getStripeCustomerId()                │
│                  ├─ getStripeSubscription()              │
│                  └─ getInvoices()                        │
│                                                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│          Stripe Integration Entry Points                  │
│                                                             │
│  Webmaster:                                               │
│  /api/webmaster/subscriptions/assign-plan                │
│         │                                                  │
│         ├─ lib/stripe.ts                                 │
│         │  ├─ createStripeCustomer()                     │
│         │  └─ createSubscription()                       │
│         │                                                  │
│         └─ lib/stripe-db.ts                              │
│            ├─ saveStripeCustomerId()                     │
│            └─ saveStripeSubscription()                   │
│                                                             │
│  Operator:                                                │
│  /api/operator/payments                                   │
│         │                                                  │
│         └─ lib/stripe-db.ts                              │
│            ├─ getStripeCustomerId()                      │
│            └─ getStripeSubscription()                    │
│                                                             │
│  Webhook:                                                 │
│  /api/webhooks/stripe                                     │
│         │                                                  │
│         ├─ lib/stripe.ts                                 │
│         │  └─ getWebhookEvent() (verify signature)       │
│         │                                                  │
│         └─ lib/stripe-db.ts                              │
│            ├─ updateInvoiceStatus()                      │
│            └─ saveStripeSubscription()                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

```
Existing Tables (with NEW columns marked):

┌─────────────────────────┐
│ users                   │
├─────────────────────────┤
│ id                      │
│ email                   │
│ password_hash           │
│ role (webmaster/op)     │
│ org_id                  │
│ created_at              │
│ last_login_at           │
└─────────────────────────┘
         │
         │ org_id
         ▼
┌─────────────────────────┐
│ organizations       ◄────── NEW COLUMN:
├─────────────────────────┤   stripe_customer_id
│ id                      │
│ name                    │
│ email                   │
│ stripe_customer_id ◄─ NEW
│ created_at              │
└─────────────────────────┘
         │
         │ org_id
         ▼
┌──────────────────────────────────┐
│ organization_subscriptions  ◄────── NEW COLUMNS:
├──────────────────────────────────┤  stripe_subscription_id
│ id                               │  stripe_price_id
│ organization_id                  │
│ plan_id                          │
│ status (active/past_due/etc)     │
│ current_period_start             │
│ current_period_end               │
│ stripe_subscription_id       ◄─ NEW
│ stripe_price_id              ◄─ NEW
│ created_at                       │
│ updated_at                       │
└──────────────────────────────────┘
         │         │
         │         └─────────┐
         │                   │
         ▼                   ▼
┌─────────────────────┐ ┌─────────────────┐
│ subscription_plans  │ │ invoices    ◄───── NEW:
├─────────────────────┤ ├─────────────────┤ stripe_invoice_id
│ id                  │ │ id              │
│ name                │ │ org_id          │
│ description         │ │ amount          │
│ monthly_cost        │ │ status          │
│ case_limit          │ │ invoice_date    │
│ stripe_product_id◄─ NEW
│ stripe_price_id  ◄─ NEW
│ created_at          │ │ stripe_invoice_id◄─ NEW
└─────────────────────┘ │ paid_date       │
                        │ due_date        │
                        └─────────────────┘
```

---

## Security Architecture

```
┌────────────────────────────────────┐
│  Authentication Security           │
├────────────────────────────────────┤
│                                    │
│  Password Security:                │
│  User Password → bcrypt hash       │
│                 (stored in DB)      │
│                                    │
│  Session Security:                 │
│  JWT Token + NEXTAUTH_SECRET       │
│  30-day expiration                │
│  Encrypted in cookie              │
│                                    │
│  API Security:                     │
│  Role-based access control        │
│  ├─ Webmaster-only endpoints      │
│  ├─ Operator-only endpoints       │
│  └─ Public endpoints              │
│                                    │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│  Stripe Security                   │
├────────────────────────────────────┤
│                                    │
│  API Key Security:                 │
│  Secret Key → .env.local (secret)  │
│  Public Key → client-side (safe)   │
│                                    │
│  Webhook Security:                 │
│  Stripe-Signature header           │
│  Verified with WEBHOOK_SECRET      │
│  Prevents spoofing                │
│  HMAC-SHA256 verification         │
│                                    │
│  Data Security:                    │
│  Credit cards never stored         │
│  Using Stripe Payment Methods      │
│  Customer IDs isolated per org     │
│                                    │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│  Database Security                 │
├────────────────────────────────────┤
│                                    │
│  SQL Injection Prevention:         │
│  All queries parameterized        │
│  No string concatenation          │
│                                    │
│  Access Control:                   │
│  Operators see own org data only   │
│  Webmaster see assigned orgs       │
│  No cross-org data leakage        │
│                                    │
│  Audit Trail:                      │
│  All events logged                │
│  Webhook events tracked           │
│  Changes timestamped              │
│                                    │
└────────────────────────────────────┘
```

---

## Deployment Architecture

```
Development:
│
├─ npm run dev
│  ├─ Local Next.js server (port 3000)
│  ├─ Stripe test keys (pk_test_, sk_test_)
│  └─ Local webhook testing with stripe-cli
│
Production:
│
├─ Deployed Next.js app
│  ├─ Environment variables updated
│  ├─ Stripe live keys (pk_live_, sk_live_)
│  └─ Webhook URL: https://yourdomain.com/api/webhooks/stripe
│
├─ Database
│  ├─ Neon PostgreSQL
│  ├─ All migrations applied
│  └─ Stripe columns populated
│
└─ Stripe Configuration
   ├─ Live API keys
   ├─ Products created
   ├─ Prices set
   └─ Webhook endpoint live
```

---

## Monitoring & Logging

```
Development Console:
├─ API requests logged
├─ Stripe operations logged
├─ Webhook events logged
└─ Errors with full stack trace

Production Logging:
├─ Structured logs (JSON)
├─ Timestamp + severity
├─ Request/response data
├─ Error tracking (Sentry)
└─ Audit trail (database)

Stripe Dashboard:
├─ Live transaction view
├─ Webhook event history
├─ Failed payment tracking
├─ Revenue reporting
└─ Customer analytics
```

---

## This Architecture Provides

✅ **Scalability**: Handles 100+ organizations  
✅ **Security**: PCI DSS compliant (Stripe)  
✅ **Reliability**: Webhook signature verification  
✅ **Auditability**: All events logged  
✅ **Flexibility**: Easy to add payment methods  
✅ **Maintainability**: Well-documented code  
✅ **Testability**: Stripe test mode included  
✅ **Performance**: Optimized queries  

---

**Version**: 1.0  
**Last Updated**: December 2024  
**Status**: Production-Ready
