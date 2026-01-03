import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createCheckoutSession } from '@/lib/stripe';
import { getStripeCustomerId } from '@/lib/stripe-db';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // @ts-ignore - Extended session properties from auth.d.ts
    if (!session?.user || session.user.role !== 'operator') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // @ts-ignore - Extended session properties from auth.d.ts
    const organizationId = session.user.orgId;

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'No organization found' },
        { status: 400 }
      );
    }

    const { priceId } = await request.json();

    if (!priceId) {
      return NextResponse.json(
        { success: false, error: 'Price ID is required' },
        { status: 400 }
      );
    }

    // Get the Stripe customer ID for this organization
    const stripeCustomerId = await getStripeCustomerId(organizationId);

    if (!stripeCustomerId) {
      return NextResponse.json(
        { success: false, error: 'No Stripe customer found for this organization' },
        { status: 400 }
      );
    }

    // Create the checkout session
    const checkoutSession = await createCheckoutSession(
      priceId,
      stripeCustomerId,
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/operator/payments?success=true`,
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/operator/payments?canceled=true`,
      {
        organizationId,
        userId: session.user.id,
      }
    );

    return NextResponse.json({
      success: true,
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });

  } catch (error: any) {
    console.error('Checkout creation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create checkout session'
      },
      { status: 500 }
    );
  }
}
