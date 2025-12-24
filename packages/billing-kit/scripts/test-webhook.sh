#!/bin/bash

# ==============================================================================
# Helper script to test Stripe webhook locally
# Requires Stripe CLI: brew install stripe/stripe-cli/stripe
# ==============================================================================

set -e

echo "🔧 Billing Kit - Webhook Test Helper"
echo "===================================="
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI not found. Install with:"
    echo "   brew install stripe/stripe-cli/stripe"
    exit 1
fi

echo "✅ Stripe CLI found"
echo ""

# Check if already logged in
if ! stripe config --list &> /dev/null; then
    echo "🔐 Logging in to Stripe..."
    stripe login
fi

echo "✅ Stripe authenticated"
echo ""

# Get webhook endpoint from user or use default
read -p "Enter webhook endpoint (default: localhost:3000/api/stripe/webhook): " WEBHOOK_ENDPOINT
WEBHOOK_ENDPOINT=${WEBHOOK_ENDPOINT:-localhost:3000/api/stripe/webhook}

echo ""
echo "📡 Starting webhook forwarding..."
echo "   Endpoint: $WEBHOOK_ENDPOINT"
echo ""
echo "💡 Copy the webhook signing secret (whsec_...) to your .env.local"
echo "   as STRIPE_WEBHOOK_SECRET"
echo ""
echo "🧪 Test events you can trigger in another terminal:"
echo "   stripe trigger checkout.session.completed"
echo "   stripe trigger customer.subscription.created"
echo "   stripe trigger customer.subscription.updated"
echo "   stripe trigger invoice.payment_succeeded"
echo ""
echo "Press Ctrl+C to stop"
echo "===================="
echo ""

# Start listening
stripe listen --forward-to "$WEBHOOK_ENDPOINT"
