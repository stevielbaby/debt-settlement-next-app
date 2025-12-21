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

**For Local Development:**
- Node.js 20.9.0 or higher
- PostgreSQL database (Neon recommended)
- Google Cloud Project with OAuth 2.0 credentials

**For Docker Development:**
- Docker Desktop (includes Docker Compose) - [Install Docker Desktop](https://www.docker.com/products/docker-desktop/)
- PostgreSQL database (Neon recommended)
- Google Cloud Project with OAuth 2.0 credentials

**Installing Docker:**
- **macOS**: Download and install [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
- **Windows**: Download and install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
- **Linux**: Install Docker Engine and Docker Compose plugin:
  ```bash
  # Ubuntu/Debian
  sudo apt-get update
  sudo apt-get install docker.io docker-compose-plugin
  sudo systemctl start docker
  sudo systemctl enable docker
  ```

### Installation

#### Option 1: Docker (Recommended)

Docker provides a consistent environment and automatically fixes Node.js version and native module issues.

1. Clone the repository:
```bash
git clone <your-repo-url>
cd debt-settlement-next-app
```

2. Set up environment variables:
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

3. Run the development server with Docker:
```bash
# Using npm script
npm run docker:dev

# Or using docker-compose directly
docker-compose up
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

The Docker setup automatically:
- Uses Node.js 20.9.0+ (meets Next.js requirements)
- Resolves lightningcss native module issues (uses Linux packages)
- Provides a clean, isolated environment
- Enables hot reload for development

#### Option 2: Local Development

1. Clone the repository:
```bash
git clone <your-repo-url>
cd debt-settlement-next-app
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

## Docker Commands

### Development

```bash
# Start development server
npm run docker:dev
# or (newer Docker versions)
docker compose up
# or (older Docker versions)
docker-compose up

# Start in detached mode
docker compose up -d
# or
docker-compose up -d

# View logs
npm run docker:logs
# or
docker compose logs -f
# or
docker-compose logs -f

# Stop containers
npm run docker:down
# or
docker compose down
# or
docker-compose down
```

### Production

```bash
# Build production image
npm run docker:build
# or
docker build -t debt-settlement-app .

# Run production container
npm run docker:prod
# or (newer Docker versions)
docker compose -f docker-compose.prod.yml up -d
# or (older Docker versions)
docker-compose -f docker-compose.prod.yml up -d

# View production logs
docker compose -f docker-compose.prod.yml logs -f
# or
docker-compose -f docker-compose.prod.yml logs -f

# Stop production container
docker compose -f docker-compose.prod.yml down
# or
docker-compose -f docker-compose.prod.yml down
```

### Troubleshooting

**Issue: Port 3000 already in use**
```bash
# Change port in docker-compose.yml
ports:
  - "3001:3000"  # Use port 3001 on host
```

**Issue: Environment variables not loading**
- Ensure `.env.local` or `.env` file exists in the project root
- Check that variables are properly formatted (no spaces around `=`)
- Restart containers: `docker-compose down && docker-compose up`

**Issue: lightningcss errors**
- Docker automatically uses Linux native modules, eliminating darwin architecture issues
- If errors persist, rebuild: `docker compose down && docker compose build --no-cache && docker compose up`
- Or with older Docker: `docker-compose down && docker-compose build --no-cache && docker-compose up`

**Issue: "docker-compose: command not found"**
- Install Docker Desktop which includes Docker Compose
- On newer Docker installations, use `docker compose` (with space) instead of `docker-compose` (with hyphen)
- The npm scripts automatically try both formats: `npm run docker:dev`

**Issue: Hot reload not working**
- Ensure volumes are properly mounted in `docker-compose.yml`
- Check file permissions on your host system
- Restart the container

## Deployment

### Docker Deployment

Build and deploy the Docker image to your preferred container platform:

```bash
# Build production image
docker build -t debt-settlement-app .

# Tag for registry
docker tag debt-settlement-app your-registry/debt-settlement-app:latest

# Push to registry
docker push your-registry/debt-settlement-app:latest
```

### Vercel Deployment

This application can also be deployed on Vercel. See [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for details.

**Note:** When deploying to Vercel, the lightningcss patch will still be applied, but Vercel's build environment handles native modules automatically.

## License

Private - All rights reserved
