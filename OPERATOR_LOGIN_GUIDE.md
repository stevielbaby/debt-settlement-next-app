# Operator Login Flow - Test Guide

## Fixed Issues

### 1. ✅ Password Hash Fixed
- **Problem**: The operator password hash was invalid (didn't match "operator123")
- **Solution**: Generated correct bcrypt hash: `$2b$10$gtBp8b5TmLiFWMiiD6QD2OU6tc5Kp9qs.Zj3tVa0cOucw6JRut1hW`
- **Updated**: `/app/api/setup/create-operator/route.ts`

### 2. ✅ Operator Button Navigation
- **Problem**: Operator button went directly to `/operator` (would fail auth or need existing session)
- **Solution**: Now links to `/auth/signin?callbackUrl=/operator`
- **Updated**: 
  - Desktop navbar button
  - Mobile navbar button

### 3. ✅ "Try Operator Account" Button
- **Problem**: Button just filled form fields, didn't auto-submit
- **Solution**: Button now auto-fills AND auto-submits the form
- **Updated**: `/app/auth/signin/page.tsx`

### 4. ✅ Error Handling
- **Added**: Better error messages in signin form
- **Added**: Console logging for debugging
- **Updated**: `/app/auth/signin/page.tsx`

## Complete Login Flow

### Test Path 1: Using Navbar Button
```
1. Go to http://localhost:3000 (home page)
2. Click "Operator" button (orange bordered button in top right)
3. Redirects to: http://localhost:3000/auth/signin?callbackUrl=/operator
4. Page shows signin form with:
   - Email input field
   - Password input field
   - "Access System" button
   - "Try Operator Account" button
5. Click "Try Operator Account" button
   - Auto-fills: operator@strattondefense.com
   - Auto-fills: operator123
   - Auto-submits the form
6. Form posts to credentials provider with:
   - email: operator@strattondefense.com
   - password: operator123
7. Credentials provider (auth.ts):
   - Queries app.users from Neon database
   - Finds user by email
   - Compares password with bcrypt.compare()
   - Creates JWT session with user id, role, orgId
8. Redirects to: http://localhost:3000/operator
9. ✅ Operator dashboard loads with case queue

### Test Path 2: Direct Signin Page
```
1. Go to http://localhost:3000/auth/signin
2. Can manually enter:
   - Email: operator@strattondefense.com
   - Password: operator123
3. Or click "Try Operator Account" to auto-fill
4. Click "Access System"
5. Same auth flow as above
6. Redirects to: / (or custom callbackUrl if provided)
```

## Credentials

- **Email**: operator@strattondefense.com
- **Password**: operator123
- **Role**: operator
- **Organization**: Test Operator Firm (or Stratton Defense)

## Database Verification

The operator user is created/verified in Neon via:
```bash
POST /api/setup/create-operator
```

Response:
```json
{
  "success": true,
  "message": "Operator setup complete",
  "operator": {
    "email": "operator@strattondefense.com",
    "role": "operator"
  },
  "credentials": {
    "email": "operator@strattondefense.com",
    "password": "operator123"
  }
}
```

## What Happens After Login

1. Session created with JWT token containing:
   - `user.id` - User ID from database
   - `user.email` - operator@strattondefense.com
   - `user.role` - operator
   - `user.orgId` - Organization ID

2. Middleware allows access to `/operator` routes:
   - `/operator` - Case queue list
   - `/operator/cases/1` - Case detail view
   - `/operator/cases/1/notes` - Case notes

3. API endpoints protected:
   - `GET /api/operator/cases` - List cases
   - `PATCH /api/operator/cases` - Update case status/priority
   - `GET /api/operator/cases/notes` - Get notes for case
   - `POST /api/operator/cases/notes` - Add note to case

4. All data is organization-scoped (filtered by user.orgId)

## To Fully Reset/Test

```bash
# Recreate operator user with latest password hash
curl -X POST http://localhost:3000/api/setup/create-operator

# Then test the signin flow
# 1. Click Operator button on home page
# 2. Click "Try Operator Account" button
# 3. Verify redirect to /operator dashboard
```

## Troubleshooting

### If you see "Invalid email or password"
1. Verify operator user was created: `curl -X POST http://localhost:3000/api/setup/create-operator`
2. Check browser console (F12) for error messages
3. Verify DATABASE_URL has correct Neon connection string

### If page doesn't redirect after signin
1. Check console for JS errors
2. Verify callbackUrl parameter is set in signin URL
3. Check that auth session was created (should see authjs cookies)

### If operator dashboard loads but shows no cases
1. This is expected - dashboard will show "Loading cases..." then "0 results"
2. Cases are fetched from `/api/operator/cases`
3. Dashboard falls back to sample data if no cases in database
