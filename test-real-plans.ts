import { createCheckoutSession } from './packages/billing-kit/src/api/create-checkout';
import { dbAdapter } from './lib/billing/db-adapter';
import { getBillingConfig } from './lib/billing/config';

// Mock auth adapter for testing
class MockAuthAdapter {
  async getCurrentUser() {
    return {
      id: 'fb842963-fd6d-426e-9a66-4452256949d6',
      email: 'test@example.com',
      name: 'Test User',
    };
  }
  async requireUser() { return this.getCurrentUser(); }
  async isAdmin() { return false; }
}

async function testRealPlans() {
  const config = getBillingConfig();
  const mockAuth = new MockAuthAdapter();

  console.log('🧪 Testing with YOUR actual plans from .env...\n');

  try {
    // Use the actual plan ID from your .env file
    const actualPriceId = process.env.STRIPE_PRICE_ID_STARTER_MONTHLY;

    if (!actualPriceId) {
      console.log('❌ STRIPE_PRICE_ID_STARTER_MONTHLY not found in .env');
      return;
    }

    console.log(`💰 Using your actual plan: ${actualPriceId}`);
    console.log('   (This corresponds to: Web Hosting + Maintenance - $99/month)\n');

    // Test checkout with your real plan
    console.log('🛒 Creating checkout session with your real plan...');
    const checkoutResult = await createCheckoutSession({
      authAdapter: mockAuth,
      dbAdapter,
      config,
      request: {
        price_id: actualPriceId, // Your actual plan from .env
      },
    });

    console.log('✅ Checkout session created successfully!');
    console.log('🔗 Checkout URL:', checkoutResult.url);
    console.log('🆔 Session ID:', checkoutResult.session_id);

    console.log('\n🎯 Ready to test with real payment!');
    console.log('📋 Test Instructions:');
    console.log('   1. Open the URL above in your browser');
    console.log('   2. Use test card: 4242 4242 4242 4242');
    console.log('   3. Complete payment for $99 Web Hosting plan');
    console.log('   4. Should redirect to success page');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testRealPlans();
