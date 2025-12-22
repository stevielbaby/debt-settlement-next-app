# 🚀 Vercel Deployment Guide

Complete step-by-step guide to deploy your Debt Settlement Next App to Vercel with Stripe integration.

**Time to deploy**: ~30-45 minutes  
**Difficulty**: Easy  
**Prerequisites**: GitHub account, Stripe account, Neon PostgreSQL account

---

## Phase 1: Prepare Your Database (5 minutes)

### 1. Create Neon PostgreSQL Database

1. Go to https://console.neon.tech
2. Click **"Create project"** (or use existing project)
3. Choose **"PostgreSQL"** and your region (e.g., us-east-1)
4. Create the project
5. Go to **"Connection string"** and copy the full URL (looks like: `postgresql://user:password@db.neon.tech/database_name`)

### 2. Store Your Connection String

Save it temporarily - you'll add it to Vercel in a few minutes.

---

## Phase 2: Generate Production Secrets (3 minutes)

Generate two secure random secrets using your terminal:

```bash
# Generate NEXTAUTH_SECRET (for session encryption)
openssl rand -base64 32

# Generate ENCRYPTION_KEY (for token encryption)
openssl rand -base64 32
```

Save both outputs - you'll need them for Vercel.

---

## Phase 3: Configure Stripe for Production (10 minutes)

### 1. Switch to Live Keys

1. Go to https://dashboard.stripe.com
2. Click **"Developers"** (top-right corner)
3. Click **"API Keys"**
4. **Toggle off "Test mode"** at the top
5. Copy these two values:
   - **Publishable key** (starts with `pk_live_`)
   - **Secret key** (starts with `sk_live_`)

### 2. Configure Webhook Endpoint

1. In Stripe Dashboard, click **"Developers"** > **"Webhooks"**
2. Find your existing webhook or click **"Add endpoint"**
3. Change the URL to:
   ```
   https://yourdomain.vercel.app/api/webhooks/stripe
   ```
   (Replace `yourdomain` with your actual Vercel domain)

4. Select these events:
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

5. Click **"Add endpoint"**
6. Click on your endpoint and copy the **"Signing secret"** (starts with `whsec_live_`)

---

## Phase 4: Configure Google OAuth (Optional - 5 minutes)

If you're using calendar features, update Google OAuth:

1. Go to https://console.cloud.google.com
2. Select your project
3. Go to **"APIs & Services"** > **"Credentials"**
4. Find your OAuth 2.0 Client ID
5. Click **"Edit"**
6. Add to **"Authorized redirect URIs"**:
   ```
   https://yourdomain.vercel.app/api/auth/google/callback
   ```
7. Click **"Save"**

---

## Phase 5: Deploy to Vercel (5 minutes)

### 1. Connect GitHub to Vercel

1. Go to https://vercel.com
2. Click **"New Project"**
3. Click **"Continue with GitHub"** (or sign up if needed)
4. Select your repository
5. Click **"Import"**

### 2. Configure Environment Variables

On the "Configure Project" page:

Click **"Environment Variables"** and add all 8 variables:

| Variable | Value | From |
|----------|-------|------|
| `DATABASE_URL` | Your Neon connection string | Neon Dashboard |
| `NEXTAUTH_SECRET` | Generated value (openssl rand -base64 32) | Your terminal |
| `NEXTAUTH_URL` | `https://yourdomain.vercel.app` | Vercel auto-generates |
| `STRIPE_PUBLIC_KEY` | `pk_live_...` | Stripe Dashboard |
| `STRIPE_SECRET_KEY` | `sk_live_...` | Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | `whsec_live_...` | Stripe Webhooks page |
| `ENCRYPTION_KEY` | Generated value (openssl rand -base64 32) | Your terminal |
| `NODE_ENV` | `production` | Static value |

### 3. Deploy

Click **"Deploy"**

Wait ~2-3 minutes for deployment to complete.

---

## Phase 6: Verify Deployment (5 minutes)

### 1. Test Your Site

1. Go to your Vercel project URL (e.g., https://yourdomain.vercel.app)
2. Click **"Sign in"** button
3. Try the **"Webmaster"** login → Should redirect to dashboard ✓
4. Go back, try **"Operator"** login → Should show Billing & Payments tab ✓

### 2. Test Stripe Webhook

1. Go to Stripe Dashboard > **"Developers"** > **"Webhooks"**
2. Find your production endpoint
3. Click **"Send test event"**
4. Select **"invoice.paid"**
5. Click **"Send test event"**
6. Wait 10 seconds, refresh page
7. You should see **"Signed"** status (green checkmark) ✓

### 3. Monitor Logs

In Vercel Dashboard:
1. Go to your project
2. Click **"Deployments"** tab
3. Click on your deployment
4. Go to **"Logs"** tab
5. Look for any errors (should be none)

---

## Troubleshooting

### "Invalid API Key" Error

**Cause**: Stripe keys not set correctly

**Fix**:
1. Go to Vercel Project Settings > Environment Variables
2. Verify `STRIPE_SECRET_KEY` starts with `sk_live_`
3. Verify `STRIPE_PUBLIC_KEY` starts with `pk_live_`
4. Click **"Redeploy"** button

### Webhook Events Not Being Received

**Cause**: Webhook URL in Stripe doesn't match deployment URL

**Fix**:
1. In Stripe Dashboard, go to **"Developers"** > **"Webhooks"**
2. Edit your endpoint
3. Change URL to match your Vercel domain exactly
4. Test again with "Send test event"

### "Database Connection Error"

**Cause**: DATABASE_URL not set or invalid

**Fix**:
1. Go to Neon Console
2. Copy your connection string again (make sure it includes password)
3. Update in Vercel > Project Settings > Environment Variables
4. Click **"Redeploy"**

### Page Shows 404

**Cause**: Not authenticated or wrong role

**Fix**:
1. Make sure you're signed in with the correct role
2. Try clearing browser cookies and signing in again
3. Check browser console for auth errors (F12 > Console tab)

---

## Running Database Migrations (If Needed)

If you need to run database migrations on your production database:

### Option 1: Using Neon Dashboard
1. Go to https://console.neon.tech
2. Select your project
3. Go to **"SQL Editor"**
4. Copy-paste migration SQL and execute

### Option 2: Using psql CLI
```bash
# Install psql if you don't have it (macOS)
brew install postgresql

# Connect to your database
psql "your-database-connection-string"

# Run migrations (copy-paste from migrations folder)
\i scripts/migrations/001_add_lead_conversion.sql
```

---

## Monitoring & Maintenance

### View Logs
```
In Vercel Dashboard → Deployments → Your Deployment → Logs
```

### Monitor Errors
```
In Vercel Dashboard → Monitoring → Issues
```

### Check Stripe Activity
```
In Stripe Dashboard → Activity → Events
```

### Database Health
```
In Neon Dashboard → Monitoring
```

---

## Rollback to Previous Deployment

If something goes wrong:

1. Go to Vercel Dashboard
2. Click **"Deployments"**
3. Find the previous working deployment
4. Click the three dots menu
5. Select **"Promote to Production"**

Your previous version is now live again.

---

## Performance Tips

1. **Database optimization** - Add indexes if queries are slow
2. **API caching** - Consider adding cache headers to API responses
3. **Image optimization** - Vercel handles this automatically
4. **Bundle analysis** - Run `npm run build` locally to check bundle size

---

## Security Checklist

Before going live with production data:

- [ ] All environment variables set in Vercel
- [ ] `NEXTAUTH_SECRET` is a strong random value
- [ ] `ENCRYPTION_KEY` is a strong random value
- [ ] Using `sk_live_` (not `sk_test_`) for Stripe
- [ ] Stripe webhook configured for production URL
- [ ] Google OAuth authorized URIs updated (if using)
- [ ] Database backups enabled in Neon
- [ ] Error tracking configured (optional: Sentry)

---

## Next Steps

After successful deployment:

1. **Test thoroughly** - Run through your complete user flows
2. **Monitor logs** - Watch for errors in Vercel for first 24 hours
3. **Process real transactions** - Start with small test before ramping up
4. **Set up alerts** - Configure notifications for errors
5. **Plan updates** - Push code changes to GitHub, Vercel auto-deploys

---

## FAQ

**Q: Can I use a custom domain?**  
A: Yes! Go to Vercel Project Settings > Domains and add your custom domain. Update NEXTAUTH_URL accordingly.

**Q: How do I rollback?**  
A: Go to Deployments > Previous version > Promote to Production

**Q: Will my data be lost?**  
A: No! Your Neon database is separate from the deployed app.

**Q: How much does this cost?**  
A: Vercel free tier handles most traffic. Stripe charges % of transactions only.

**Q: Can I test webhooks without real transactions?**  
A: Yes! Use Stripe Dashboard "Send test event" feature in Webhooks page.

**Q: Do I need to use Docker?**  
A: No! Vercel builds directly from your source code. Docker files are optional.

---

## Deployment Checklist

Before clicking "Deploy":

- [ ] GitHub repo is up to date
- [ ] All local changes committed and pushed
- [ ] `.env.local` NOT committed (should be in `.gitignore`)
- [ ] Database connection string ready (Neon)
- [ ] Stripe keys ready (live mode)
- [ ] Secrets generated (NEXTAUTH_SECRET, ENCRYPTION_KEY)
- [ ] Vercel account created
- [ ] GitHub connected to Vercel

After clicking "Deploy":

- [ ] Wait for deployment to complete (green checkmark)
- [ ] Test login flows
- [ ] Test Stripe webhook
- [ ] Check logs for errors
- [ ] Monitor for 24 hours

---

## Success! 🎉

Your app is now live at `https://yourdomain.vercel.app`

You now have:
- ✅ Production database (Neon PostgreSQL)
- ✅ Live deployment (Vercel)
- ✅ Production Stripe integration
- ✅ Webhook endpoints working
- ✅ Automatic deployments on every git push

---

**Document Version**: 1.0  
**Last Updated**: December 2025  
**Status**: Ready to Deploy
