# Testing the Webmaster Dashboard

## Prerequisites

1. **Node.js**: Requires v20.9.0 or higher
   ```bash
   # Check current version
   node --version
   
   # If too old, upgrade with nvm or similar
   nvm install 20
   nvm use 20
   ```

2. **Database**: Neon PostgreSQL must be connected and running
   - Ensure `DATABASE_URL` is set in `.env.local`
   - All required tables must exist (see database schema)

3. **Test Webmaster User**: Create in database or use existing
   ```sql
   INSERT INTO app.users (email, password_hash, role, organization_id)
   VALUES ('webmaster@strattondefense.com', '$2b$10$...', 'webmaster', NULL);
   ```

## Running the Development Server

```bash
# Start development server
npm run dev

# Server should run on http://localhost:3000
```

## Accessing the Webmaster Dashboard

1. **Navigate to login**: http://localhost:3000/auth/signin
2. **Enter credentials**:
   - Email: `webmaster@strattondefense.com`
   - Password: (your test password)
3. **Redirect to dashboard**: Should automatically redirect to `/webmaster`
4. **Or navigate directly**: http://localhost:3000/webmaster

## Testing Each Feature

### Dashboard Overview (`/webmaster`)
- [ ] Page loads and displays 6 metric cards
- [ ] All metrics show correct values (or 0 if no data)
- [ ] Quick action cards are clickable
- [ ] Refresh button reloads metrics without page navigation
- [ ] Icons are visible and properly colored

### Organizations (`/webmaster/organizations`)
- [ ] List displays all organizations
- [ ] Search filter works by name and email
- [ ] Status badges show correct colors
- [ ] Usage progress bars render correctly
- [ ] "New Organization" button opens create form (when implemented)
- [ ] View and edit icons are clickable
- [ ] Stats summary at bottom shows correct counts

### Organization Detail (`/webmaster/organizations/[id]`)
- [ ] Organization information displays correctly
- [ ] Subscription details show plan and status
- [ ] Usage progress bar shows current usage
- [ ] Users list displays all org users with roles
- [ ] Quick action buttons are present
- [ ] Back button returns to organizations list

### Subscriptions (`/webmaster/subscriptions`)
- [ ] Plan tab displays all subscription plans
- [ ] Plan cards show name, price, limit, features
- [ ] Org subscriptions tab shows all subscriptions
- [ ] Status badges are color-coded correctly
- [ ] Tab switching works smoothly
- [ ] Refresh button updates data

### Billing (`/webmaster/billing`)
- [ ] Dashboard metrics display (may show 0 if no invoices)
- [ ] Colors indicate status (red for overdue)
- [ ] Invoice table displays recent invoices
- [ ] Status badges color-coded (paid=green, etc)
- [ ] Date formatting is correct
- [ ] Refresh button works

### Usage (`/webmaster/usage`)
- [ ] Stats cards display correct counts
- [ ] Filter buttons work (all, ok, warning, critical)
- [ ] Usage table shows organizations with metrics
- [ ] Progress bars visualize percentage correctly
- [ ] Status badges update with filter
- [ ] Top consumers section shows if data exists
- [ ] Percentages calculate correctly

## Debugging

### Check Logs
```bash
# Terminal where npm run dev is running
# Look for any error messages
```

### Check Network Tab (Browser DevTools)
1. Open F12 → Network tab
2. Click on API calls to see request/response
3. Check status codes (should be 200 for success)
4. Look for error messages in response JSON

### Common Issues

**Issue**: "Unauthorized" error when accessing `/webmaster`
- **Solution**: Verify user has `role = 'webmaster'` in database
- **Check**: `SELECT * FROM app.users WHERE email = 'webmaster@...';`

**Issue**: Metrics showing as 0 or missing data
- **Solution**: May be expected if no data exists yet
- **Create test data**: Insert organizations, subscriptions, usage records manually

**Issue**: Page loads but no data displays
- **Solution**: Check browser console for JavaScript errors
- **Check**: API endpoint responses in Network tab

**Issue**: Sidebar navigation not working
- **Solution**: Verify links in layout component match page paths
- **Check**: Console for 404 errors on route navigation

## Load Testing Data (Optional)

Create sample data for dashboard testing:

```sql
-- Add test organization
INSERT INTO app.organizations (name, email) 
VALUES ('Test Law Firm', 'test@lawfirm.com');

-- Add subscription plan
INSERT INTO app.subscription_plans (name, description, price, monthly_limit, features)
VALUES ('Pro', 'Professional plan', 299, 100, ARRAY['Feature 1', 'Feature 2']);

-- Assign subscription
INSERT INTO app.organization_subscriptions (organization_id, plan_id, status)
VALUES (1, 1, 'active');

-- Add usage data
INSERT INTO app.usage_metrics (organization_id, metric_name, current_month_count, month_year)
VALUES (1, 'case_created', 45, to_char(CURRENT_DATE, 'YYYY-MM'));
```

## Performance Benchmarks

Expected load times (on local machine):
- Dashboard: < 500ms
- Organizations list: < 1s (may vary with org count)
- Organization detail: < 500ms
- Subscriptions: < 500ms
- Billing: < 1s
- Usage metrics: < 1s (may vary with usage data volume)

## Browser Compatibility

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Mobile responsive:
- iPad (tablet view)
- iPhone 12+ (mobile view)

## Deployment Checklist

Before deploying to production:

- [ ] Node.js updated to v20+
- [ ] All environment variables configured
- [ ] Database credentials secure
- [ ] Auth secret is strong and unique
- [ ] API endpoints are protected (webmaster role check)
- [ ] All metrics queries are optimized
- [ ] Error handling tested
- [ ] Security headers configured
- [ ] Rate limiting implemented (optional)
- [ ] Logging set up for monitoring
- [ ] Backup and restore procedures tested

## Support

For issues or questions:
1. Check WEBMASTER_DASHBOARD.md for feature documentation
2. Review database schema for required tables
3. Check middleware.ts for authorization logic
4. Review API endpoint implementations for query details
5. Check browser console for client-side errors
