/**
 * Debug script to test subscription status API
 */

async function debugSubscriptionStatus() {
  console.log('🧪 Testing subscription status API...\n');

  try {
    // Test without auth first
    console.log('1. Testing without authentication...');
    const response1 = await fetch('http://localhost:3000/api/operator/billing/subscription-status');
    console.log('   Status:', response1.status);
    if (response1.status === 401) {
      console.log('   ✅ Correctly returns 401 when not authenticated');
    } else {
      const data1 = await response1.json();
      console.log('   Response:', data1);
    }

    // Test with auth (this would require a session cookie)
    console.log('\n2. Note: To test with auth, you need to be logged in as operator');
    console.log('   Visit: http://localhost:3000/operator/billing/select-plan');
    console.log('   Check browser console for API call results');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

debugSubscriptionStatus();
