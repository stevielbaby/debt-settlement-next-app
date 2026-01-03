const { listStripeProducts } = require('./lib/stripe.ts');

async function testStripe() {
  try {
    console.log('Testing Stripe connection...');
    const products = await listStripeProducts();
    console.log('Success! Found', products.length, 'products');
    if (products.length > 0) {
      console.log('Sample product:', products[0].name);
    }
  } catch (error) {
    console.log('Error:', error.message);
    console.log('Error type:', error.type);
    console.log('Error code:', error.code);
    console.log('Error statusCode:', error.statusCode);
  }
}

testStripe();
