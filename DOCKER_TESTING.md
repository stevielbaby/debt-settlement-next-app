# Docker Testing Guide

## Status: ✅ App Running in Docker

Your application is successfully running in Docker:
- **Container**: `debt-settlement-next-app-app-1`
- **URL**: http://localhost:3000
- **Status**: Running
- **Image**: node:20-alpine

## Quick Commands

### Container Management
```bash
# Start containers
npm run docker:dev
# or
docker compose up -d

# Stop containers
npm run docker:down
# or
docker compose down

# View logs
npm run docker:logs
# or
docker compose logs -f app

# Restart containers
docker compose restart

# Check status
docker compose ps
```

### Access Application
```bash
# Open in browser
open http://localhost:3000

# Test from command line
curl http://localhost:3000

# Test API endpoints
curl http://localhost:3000/api/auth/user-role
```

## Running Billing Kit Tests in Docker

### Option 1: Run Tests Inside Container
```bash
# Execute commands inside the running container
docker compose exec app npm run --prefix packages/billing-kit test

# Or run specific test scripts
docker compose exec app tsx packages/billing-kit/scripts/run-tests.ts
docker compose exec app tsx packages/billing-kit/scripts/test-database.ts
```

### Option 2: Run Tests from Host Machine
Since your `.env.local` is mounted, you can also run tests from your host:
```bash
cd packages/billing-kit
npm test
npm run test:db
```

## Stripe Webhook Testing with Docker

### Start Stripe CLI Webhook Forwarding (Separate Terminal)
```bash
# Forward webhooks to Docker container
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Or use the helper script
cd packages/billing-kit
./scripts/test-webhook.sh
```

### Trigger Test Events
```bash
# In another terminal, trigger test webhook events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
```

### Watch Container Logs for Webhook Processing
```bash
# Watch app logs in real-time
docker compose logs -f app | grep -i webhook
```

## Docker Compose Services

### Main App Service
- **Service Name**: `app`
- **Ports**: 3000:3000
- **Environment**: Development
- **Hot Reload**: ✅ Enabled (volume mounted)
- **Node Modules**: Cached in volume

### Stripe CLI Service (Optional)
To start the Stripe CLI service:
```bash
# Start with Stripe profile
docker compose --profile stripe up -d

# This will start both app and stripe-cli
# Webhook forwarding will be automatic
```

## Troubleshooting

### Container Not Starting
```bash
# Check logs for errors
docker compose logs app

# Remove and recreate
docker compose down
docker compose up -d --force-recreate
```

### Port Already in Use
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Restart Docker
docker compose up -d
```

### Environment Variables Not Loading
```bash
# Verify .env.local exists
ls -la .env.local

# Check if it's mounted in container
docker compose exec app printenv | grep STRIPE

# Restart container to reload env vars
docker compose restart app
```

### Database Connection Issues
```bash
# Test database connection from container
docker compose exec app tsx -e "
  import { neon } from '@neondatabase/serverless';
  const sql = neon(process.env.DATABASE_URL);
  const result = await sql\`SELECT NOW()\`;
  console.log('Database connected:', result[0].now);
"
```

### Code Changes Not Reflecting
```bash
# Verify volume is mounted
docker compose exec app ls -la /app

# Force reload
docker compose restart app

# Or rebuild if needed
docker compose up -d --build
```

## Testing Workflow

### 1. Start Environment
```bash
docker compose up -d
```

### 2. Run Pre-flight Tests
```bash
docker compose exec app tsx packages/billing-kit/scripts/run-tests.ts
```

### 3. Start Stripe Webhook Forwarding
```bash
# In separate terminal
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### 4. Run Integration Tests
```bash
docker compose exec app tsx packages/billing-kit/scripts/test-integration.ts
```

### 5. Inspect Database
```bash
docker compose exec app tsx packages/billing-kit/scripts/test-database.ts
```

### 6. Manual Testing
- Navigate to http://localhost:3000
- Test user flows
- Monitor logs: `docker compose logs -f app`

## Performance Notes

- **First Start**: Takes ~20-30 seconds (npm install)
- **Hot Reload**: ~2-3 seconds for code changes
- **Subsequent Starts**: ~5 seconds (node_modules cached)

## Next Steps

1. ✅ App running in Docker
2. Run billing kit tests: `docker compose exec app tsx packages/billing-kit/scripts/run-tests.ts`
3. Start webhook forwarding: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. Run integration tests
5. Test UI flows at http://localhost:3000
