import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import Stripe from 'stripe';

async function testStripeKey() {
  console.log('Testing Stripe key directly...');
  console.log('STRIPE_SECRET_KEY available:', !!process.env.STRIPE_SECRET_KEY);
  console.log('Key length:', process.env.STRIPE_SECRET_KEY?.length);
  console.log('Key starts with:', process.env.STRIPE_SECRET_KEY?.substring(0, 20));
  console.log('Key ends with:', process.env.STRIPE_SECRET_KEY?.substring(process.env.STRIPE_SECRET_KEY.length - 20));

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('No STRIPE_SECRET_KEY found');
    process.exit(1);
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });

    console.log('Testing API call...');
    // Try to list customers (should work with any valid key)
    const customers = await stripe.customers.list({ limit: 1 });
    console.log('✅ Stripe API call successful! Found', customers.data.length, 'customers');
  } catch (error: any) {
    console.error('❌ Stripe API call failed:', error.message);
    console.error('Error type:', error.type);
    console.error('Error code:', error.code);
  }
}

testStripeKey();
