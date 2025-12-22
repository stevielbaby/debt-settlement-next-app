# Phase 5: Webmaster Dashboard

## Overview

The Webmaster Dashboard is a comprehensive control panel for managing all aspects of the SaaS platform. It provides webmaster-level access to organizations, subscriptions, billing, and usage metrics across all client firms.

**Architecture**: Modular design within the main Next.js app that can be easily extracted into a separate microapp later.

## Features Built

### 1. **Dashboard Overview** (`/webmaster`)
- System-wide metrics display:
  - Total organizations count
  - Active subscriptions count
  - Monthly recurring revenue (MRR)
  - Organizations near usage limit (90%+)
  - Total API requests this month
  - Total storage usage in GB
- Refresh button to reload metrics
- Quick action cards linking to main management areas
- Responsive grid layout with color-coded metrics

**API**: `GET /api/webmaster/dashboard`

### 2. **Organizations Management** (`/webmaster/organizations`)
- List all organizations with:
  - Name, email, subscription plan
  - Subscription status (active, trialing, past_due, canceled)
  - Monthly case limit and current usage
  - Progress bar showing usage percentage
  - Creation date
- Search by organization name or email
- Color-coded usage indicators (green < 70%, orange 70-90%, red > 90%)
- View and edit buttons for each organization
- Create new organization button
- Stats summary showing total orgs, active subscriptions, at-risk counts

**APIs**: 
- `GET /api/webmaster/organizations` - List all organizations
- `POST /api/webmaster/organizations` - Create new organization
- `GET /api/webmaster/organizations/[id]` - Organization detail with users
- `PATCH /api/webmaster/organizations/[id]` - Update organization info

### 3. **Organization Detail Page** (`/webmaster/organizations/[id]`)
- Organization information (ID, created date, contact details)
- Subscription details (plan name, status)
- Current month usage with progress bar
- List of all users in organization with roles
- Quick actions: Edit, Manage Subscription, Suspend
- Support information panel

### 4. **Subscriptions Management** (`/webmaster/subscriptions`)
Two tabs:

**Subscription Plans Tab**:
- Display all available subscription plans
- Plan name, description, price, monthly case limit
- List of included features with checkmarks
- Status indication (active/inactive)

**Organization Subscriptions Tab**:
- Table of all organization subscriptions
- Organization name, assigned plan, status
- Current billing period (start and end dates)
- Color-coded status badges

**APIs**:
- `GET /api/webmaster/plans` - List all subscription plans
- `GET /api/webmaster/subscriptions` - List all org subscriptions

### 5. **Billing Dashboard** (`/webmaster/billing`)
Key metrics:
- Total revenue (sum of all paid invoices)
- Monthly recurring revenue (MRR)
- Average contract value (ACV)
- Churn rate (% of subscriptions canceled in last 30 days)
- Payments processed this month
- Payments overdue (with red alert if > 0)

Recent invoices table:
- Organization name, amount, status
- Issue date and due date
- Color-coded payment status (paid=green, pending=yellow, overdue=red)

**API**: `GET /api/webmaster/billing`

### 6. **Usage Metrics Dashboard** (`/webmaster/usage`)
Real-time monitoring:
- Total requests this month
- Active organizations
- Organizations near limit (70-90%)
- Organizations over limit (90%+)

**Filter buttons**: View all, healthy (< 70%), warning (70-90%), critical (> 90%)

Usage table:
- Organization name, metric type
- Current usage / monthly limit
- Visual progress bar
- Status badge (Healthy/Warning/Critical)

Top consumers section:
- Top 5 organizations by usage this month
- Usage count for each

**API**: `GET /api/webmaster/usage`

## File Structure

```
app/webmaster/
├── layout.tsx                 # Protected layout with sidebar navigation
├── page.tsx                   # Dashboard overview
├── organizations/
│   ├── page.tsx              # Organizations list
│   ├── [id]/
│   │   ├── page.tsx          # Organization detail
│   │   └── edit/
│   │       └── page.tsx      # (to be created) Edit organization
│   └── new/
│       └── page.tsx          # (to be created) Create organization
├── subscriptions/
│   └── page.tsx              # Subscriptions management (plans & org subs)
├── billing/
│   └── page.tsx              # Billing dashboard
└── usage/
    └── page.tsx              # Usage metrics

app/api/webmaster/
├── dashboard/
│   └── route.ts              # GET dashboard metrics
├── organizations/
│   ├── route.ts              # GET list, POST create org
│   └── [id]/
│       └── route.ts          # GET detail, PATCH update org
├── plans/
│   └── route.ts              # GET subscription plans
├── subscriptions/
│   └── route.ts              # GET org subscriptions
├── billing/
│   └── route.ts              # GET billing metrics & invoices
└── usage/
    └── route.ts              # GET usage metrics
```

## Authentication & Authorization

All webmaster routes and APIs are protected by:

1. **Middleware** (`middleware.ts`):
   - Routes starting with `/webmaster` require `role === 'webmaster'`
   - Redirects to `/auth/error` if unauthorized
   - Redirects to `/auth/signin` if not authenticated

2. **Route Handler Auth** (each API):
   - Checks `session?.user.role === 'webmaster'`
   - Returns 401 Unauthorized if not webmaster
   - Returns 403 Forbidden for role violations

3. **Client-Side Auth** (each page):
   - Server component checks session and redirects if not webmaster
   - Auth guard prevents unauthorized access

## Database Queries

All endpoints use Neon PostgreSQL with these key tables:

- `app.organizations` - Client firms
- `app.organization_subscriptions` - Subscription assignments
- `app.subscription_plans` - Available plans
- `app.usage_metrics` - Monthly usage tracking
- `app.invoices` - Billing records
- `app.users` - All users in system

## UI Design

- **Color scheme**: Dark theme (zinc-900/800 backgrounds)
- **Accent color**: Orange-600 for buttons and active states
- **Typography**: Serif font for headers (font-serif), uppercase tracking
- **Components**: 
  - Metric cards with icons and color-coded values
  - Data tables with hover effects
  - Progress bars for usage visualization
  - Status badges (green/orange/red)
  - Filter buttons and refresh controls

## API Response Format

All endpoints return standardized JSON:

**Success**:
```json
{
  "success": true,
  "data": {...} or "metrics": {...} or "organizations": [...]
}
```

**Error**:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Next Steps to Complete Phase 5

### High Priority
1. Create `/webmaster/organizations/new` - Form to create organizations
2. Create `/webmaster/organizations/[id]/edit` - Form to edit organization details
3. Add plan assignment UI in subscriptions page
4. Build invoice detail view in billing dashboard

### Medium Priority
5. Add export functionality (CSV exports of metrics, invoices)
6. Add date range filtering for metrics
7. Create alerts for at-risk organizations (90%+ usage)
8. Add organization suspension/deletion confirmation

### Low Priority
9. Advanced analytics dashboard with trends
10. Custom report generation
11. Email notifications for billing events
12. Integration with Stripe webhooks for real-time billing updates

## Modular Extraction Plan

To extract this into a separate microapp in the future:

1. Copy `/app/webmaster/*` → new-app/app/webmaster/
2. Copy `/app/api/webmaster/*` → new-app/app/api/webmaster/
3. Copy `auth.ts`, `auth.d.ts`, `middleware.ts` → new-app/
4. Copy `/lib/db.ts` → new-app/lib/
5. Update `DATABASE_URL` environment variable to same Neon instance
6. Deploy separately on different port/domain
7. Webmaster app can now serve multiple SaaS instances with separate databases

## Testing Checklist

- [ ] Navigate to `/webmaster` - should redirect to login if not authenticated
- [ ] Login as webmaster user - should see dashboard
- [ ] Dashboard metrics load correctly
- [ ] Organizations list displays all orgs with correct status
- [ ] Search filter works on organizations page
- [ ] Organization detail page shows correct user list
- [ ] Subscriptions tab shows plans correctly
- [ ] Billing dashboard displays metrics and invoices
- [ ] Usage page filters work (all, ok, warning, critical)
- [ ] All refresh buttons reload data correctly
- [ ] Responsive design works on mobile/tablet

## Environment Variables Required

```env
DATABASE_URL=postgresql://user:password@host/database
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

## Performance Notes

- All queries include proper pagination/limits
- Usage metrics are calculated from monthly aggregates
- Invoice list limited to 20 most recent
- Top consumers limited to 5 organizations
- All endpoints are read-heavy (safe for webmaster access)

---

**Status**: Phase 5 Webmaster Dashboard - MVP Complete ✅
**Features Implemented**: 6/6 core features
**API Endpoints**: 8 endpoints
**Pages**: 6 pages (layout, dashboard, orgs list, org detail, subscriptions, billing, usage)
