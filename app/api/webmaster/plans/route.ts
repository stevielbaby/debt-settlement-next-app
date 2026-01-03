import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { listStripeProducts, listStripePrices } from '@/lib/stripe';

export async function GET() {
  try {
    const session = await auth();
    // @ts-ignore - Extended session properties from auth.d.ts
    if (!session?.user || session.user.role !== 'webmaster') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Phase 3B: Return real plan data from Stripe (truth source)
    console.log('Fetching plans from Stripe...');
    console.log('STRIPE_SECRET_KEY available:', !!process.env.STRIPE_SECRET_KEY);
    console.log('STRIPE_SECRET_KEY length:', process.env.STRIPE_SECRET_KEY?.length);

    let products, prices;
    try {
      console.log('Calling listStripeProducts...');
      products = await listStripeProducts();
      console.log('Products result:', Array.isArray(products), products?.length);

      console.log('Calling listStripePrices...');
      prices = await listStripePrices();
      console.log('Prices result:', Array.isArray(prices), prices?.length);

      console.log(`Found ${products?.length || 0} products and ${prices?.length || 0} prices`);
    } catch (stripeError) {
      console.error('Stripe API error details:', stripeError);
      console.error('Error type:', typeof stripeError);
      console.error('Error message:', stripeError?.message);
      console.error('Error code:', stripeError?.code);
      console.error('Error statusCode:', stripeError?.statusCode);

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'STRIPE_ERROR',
            message: 'Failed to fetch plans from Stripe',
            details: stripeError instanceof Error ? stripeError.message : String(stripeError),
            type: stripeError?.type,
            statusCode: stripeError?.statusCode
          }
        },
        { status: 500 }
      );
    }

    // Match products to their prices and format
    const formattedPlans = products
      .map(product => {
        const price = prices.find(p => p.product === product.id);
        if (!price) {
          console.log(`Skipping product ${product.name} - no price found`);
          return null; // Skip products without prices
        }

        const formatted = {
          id: price.id,
          name: product.name,
          description: product.description || '',
          price: price.unit_amount || 0,
          interval: price.recurring?.interval || 'month',
          priceDisplay: price.unit_amount
            ? `$${(price.unit_amount / 100).toFixed(2)}/${price.recurring?.interval || 'month'}`
            : 'Contact for pricing'
        };

        console.log(`Formatted plan: ${formatted.name} - ${formatted.priceDisplay}`);
        return formatted;
      })
      .filter(Boolean) // Remove null entries
      .sort((a, b) => (a?.price || 0) - (b?.price || 0)); // Sort by price

    console.log(`Returning ${formattedPlans.length} formatted plans`);

    // Temporary: Add debug info for troubleshooting
    const debugInfo = {
      stripeConnection: 'working',
      productsFound: products.length,
      pricesFound: prices.length,
      plansFormatted: formattedPlans.length,
      sampleProduct: products[0]?.name || 'none',
      samplePrice: prices[0]?.id || 'none'
    };

    return NextResponse.json({
      success: true,
      plans: formattedPlans,
      _debug: debugInfo, // Remove this after debugging
    });
  } catch (error) {
    console.error('Plans fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await auth();
    // @ts-ignore - Extended session properties from auth.d.ts
    if (!session?.user || session.user.role !== 'webmaster') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Be honest: plan creation is not implemented
    return NextResponse.json(
      {
        success: false,
        error: 'Plan creation is not implemented',
        message: 'Subscription plan management is not yet available in this deployment.'
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('Plan creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create plan' },
      { status: 500 }
    );
  }
}
