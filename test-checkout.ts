import { createCheckoutSession } from './packages/billing-kit/src/api/create-checkout';
import { dbAdapter } from './lib/billing/db-adapter';
import { getBillingConfig } from './lib/billing/config';

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

async function main() {
  try {
    const result = await createCheckoutSession({
      authAdapter: new MockAuthAdapter(),
      dbAdapter,
      config: getBillingConfig(),
      request: { price_id: 'price_1ShG2vAUkFju08p48WvG1YuE' },
    });

    console.log('✅ Checkout URL:', result.url);
    console.log('✅ Session ID:', result.session_id);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();
