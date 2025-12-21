# Debt Settlement Legal Intake Platform

A Next.js application for managing client intake, case submissions, and consultation scheduling with Google Calendar integration.

## Features

- **Client Intake Forms**: Secure case review and evaluation forms
- **Google Calendar Integration**: Automated consultation scheduling with calendar sync
- **Case Management**: Admin dashboard for reviewing submissions and managing appointments
- **Priority Dashboard**: Client-facing dashboard with appointment booking
- **Database Integration**: PostgreSQL database (Neon) for data persistence

## Tech Stack

- **Framework**: Next.js 16.1.0 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL (Neon)
- **Authentication**: Google OAuth 2.0 for Calendar integration
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 20.9.0 or higher
- PostgreSQL database (Neon recommended)
- Google Cloud Project with OAuth 2.0 credentials

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd next-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
# Database Connection
DATABASE_URL=postgresql://user:password@host:5432/database

# Google OAuth Configuration (optional - can be set via setup wizard)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Encryption Key (must be at least 32 characters)
ENCRYPTION_KEY=your-32-character-encryption-key-here
```

4. Set up the database:
Run the database schema migrations to create required tables (see `database-schema.sql` in parent directory for reference).

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Initial Setup

1. Navigate to `/admin/setup-wizard` to configure Google Calendar integration
2. Complete the OAuth setup wizard with your Google Cloud credentials
3. Configure calendar settings at `/admin/calendar-settings`

## Project Structure

```
next-app/
├── app/
│   ├── api/              # API routes
│   ├── components/       # React components
│   ├── lib/              # Utility functions
│   └── [pages]/          # Next.js pages
├── scripts/              # Helper scripts
└── public/               # Static assets
```

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string (required)
- `ENCRYPTION_KEY`: Key for encrypting sensitive data (required, min 32 chars)
- `GOOGLE_CLIENT_ID`: Google OAuth client ID (optional if using setup wizard)
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret (optional if using setup wizard)
- `GOOGLE_REDIRECT_URI`: OAuth redirect URI (optional, defaults to callback URL)

## Database Schema

The application uses the following main tables:
- `leads`: Client intake submissions
- `bookings`: Scheduled appointments
- `google_connections`: OAuth tokens for Google Calendar
- `calendar_settings`: Calendar configuration
- `setup_config`: Encrypted OAuth credentials
- `users`: Admin user accounts

## Deployment

This application is designed to be deployed on Vercel. See [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for details.

## License

Private - All rights reserved
