import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createCheckoutSession, getOrCreateStripeCustomer } from '@/lib/stripe';
import { prisma } from '@/app/lib/db';

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

    // Get organization details for Stripe customer creation
    const organization = await prisma.firm.findUnique({
      where: { id: organizationId },
      select: { name: true, publicEmail: true }
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 400 }
      );
    }

    // Get or create the Stripe customer for this organization
    const stripeCustomer = await getOrCreateStripeCustomer(
      organizationId,
      organization.publicEmail || `admin@${organization.name.toLowerCase().replace(/\s+/g, '')}.com`,
      organization.name
    );

    if (!stripeCustomer?.id) {
      return NextResponse.json(
        { success: false, error: 'Failed to create or retrieve Stripe customer' },
        { status: 500 }
      );
    }

    const stripeCustomerId = stripeCustomer.id;

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
