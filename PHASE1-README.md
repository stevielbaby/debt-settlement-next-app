# Phase 1: Authentication & Database Foundation ✅

## What's Been Implemented

### 1. Database Schema
- **Multi-tenant architecture** with organization-scoped data
- **Row-Level Security (RLS)** policies for automatic data isolation
- **Core tables**: Organizations, Users, Cases, Notes, Documents, Subscriptions, Usage Metrics
- **Audit logging** table for security tracking

### 2. Authentication System
- **Auth.js v5** integration with Next.js App Router
- **JWT-based sessions** with role and orgId in token
- **Credential provider** with bcrypt password hashing
- **Three roles**: Webmaster, Operator, Client

### 3. Route Protection
- **Middleware** for role-based access control
- **Protected routes**:
  - `/webmaster/*` - Webmaster only
  - `/operator/*` - Operator + Webmaster
  - `/client/*` - Client + Webmaster
- Public routes remain accessible

### 4. Auth UI
- **Sign-in page** matching site aesthetic
- **Error handling** page
- Litigation-forward design language

---

## Setup Instructions

### 1. Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

Required variables:
- `DATABASE_URL` - Your Neon PostgreSQL connection string
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `NEXTAUTH_URL` - `http://localhost:3000` for dev

### 2. Initialize Database

Run the migration script:

```bash
npm run db:init
```

This will:
- Create all tables with RLS policies
- Insert base subscription plan
- Create webmaster account (admin@strattondefense.com / admin123)

⚠️ **CHANGE THE DEFAULT PASSWORD IMMEDIATELY**

### 3. Test Authentication

1. Start the dev server: `npm run dev`
2. Visit: `http://localhost:3000/auth/signin`
3. Login with: `admin@strattondefense.com` / `admin123`
4. You should be redirected to the home page (webmaster role active)

---

## Database Schema Overview

### Users Table
- Supports 3 roles: `webmaster`, `operator`, `client`
- Webmasters have `org_id = NULL`
- Operators/Clients must have an `org_id`

### Cases Table
- Stores intake form data
- Links to organization (tenant boundary)
- Optional `client_id` (set when client account created)

### RLS Policies
- **Operators**: Can only see their organization's data
- **Clients**: Can only see their specific case
- **Webmaster**: Bypasses all RLS restrictions

---

## Next Steps (Phase 2)

- [ ] Create Operator dashboard layout
- [ ] Build case list view with filtering
- [ ] Implement case detail page
- [ ] Add case status management
- [ ] Create organization profile page

---

## File Structure

```
/app
  /api/auth/[...nextauth]  - Auth.js API routes
  /auth
    /signin               - Login page
    /error                - Auth error page
/scripts
  [Prisma-managed]       - Database schema via prisma/schema.prisma
  [Prisma migrations]    - Database migrations via prisma/migrations/
auth.ts                  - Auth.js configuration
auth.d.ts                - TypeScript types
middleware.ts            - Route protection
```

---

## Security Notes

1. All passwords are hashed with bcrypt
2. JWTs contain minimal data (id, role, orgId)
3. RLS policies enforce data isolation at database level
4. Sessions expire after 30 days
5. Failed login attempts are logged

---

## Troubleshooting

**Migration fails**: Check DATABASE_URL is correct and Neon database is accessible

**Can't login**: Ensure database was initialized and webmaster user exists

**RLS blocking queries**: Verify JWT contains correct role and orgId

**Next.js middleware not running**: Check `middleware.ts` matcher config
