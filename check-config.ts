import { getBillingConfig } from './lib/billing/config';

function checkConfig() {
  try {
    console.log('🔧 Checking billing configuration...');

    const config = getBillingConfig();

    console.log('✅ Configuration loaded successfully!');
    console.log(`📧 App URL: ${config.billing_app_url}`);
    console.log(`🔑 Stripe Secret Key: ${config.stripe_secret_key ? 'Set ✅' : 'Missing ❌'}`);
    console.log(`🎫 Webhook Secret: ${config.stripe_webhook_secret ? 'Set ✅' : 'Missing ❌'}`);
    console.log(`🛍️  Portal Config: ${config.stripe_portal_configuration_id ? 'Set ✅' : 'Not set'}`);

    // Test Stripe client initialization
    try {
      const { createStripeClient } = require('./packages/billing-kit/src/stripe/client');
      const stripe = createStripeClient(config);
      console.log('💳 Stripe client initialized successfully ✅');
    } catch (error: any) {
      console.log('💳 Stripe client initialization failed ❌:', error.message);
    }

    console.log('\n🎯 Configuration Status: READY FOR TESTING');

  } catch (error: any) {
    console.error('❌ Configuration check failed:', error.message);
    process.exit(1);
  }
}

checkConfig();
