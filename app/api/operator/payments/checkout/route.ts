import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createCheckoutSession, getOrCreateStripeCustomer } from '@/lib/stripe';
import { prisma } from '@/app/lib/db';

export async function POST(request: NextRequest) {
  try {
    // #region agent log - checkout start
    fetch('http://127.0.0.1:7242/ingest/1b3163b7-f1ae-4e91-bf21-62593b0c9267', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/api/operator/payments/checkout/route.ts:7',
        message: 'Checkout API called',
        data: { timestamp: new Date().toISOString() },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'checkout-debug',
        hypothesisId: 'A,B,C,D,E'
      })
    }).catch(() => {});
    // #endregion

    const session = await auth();

    // #region agent log - session check
    fetch('http://127.0.0.1:7242/ingest/1b3163b7-f1ae-4e91-bf21-62593b0c9267', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/api/operator/payments/checkout/route.ts:17',
        message: 'Session retrieved',
        data: {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
          userRole: session?.user?.role,
          userOrgId: session?.user?.orgId
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'checkout-debug',
        hypothesisId: 'A'
      })
    }).catch(() => {});
    // #endregion

    // @ts-ignore - Extended session properties from auth.d.ts
    if (!session?.user || session.user.role !== 'operator') {
      // #region agent log - auth failure
      fetch('http://127.0.0.1:7242/ingest/1b3163b7-f1ae-4e91-bf21-62593b0c9267', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'app/api/operator/payments/checkout/route.ts:33',
          message: 'Authorization failed',
          data: {
            hasSession: !!session,
            hasUser: !!session?.user,
            actualRole: session?.user?.role,
            expectedRole: 'operator',
            userId: session?.user?.id
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'checkout-debug',
          hypothesisId: 'A,B'
        })
      }).catch(() => {});
      // #endregion

      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // #region agent log - auth success
    fetch('http://127.0.0.1:7242/ingest/1b3163b7-f1ae-4e91-bf21-62593b0c9267', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/api/operator/payments/checkout/route.ts:54',
        message: 'Authorization passed',
        data: {
          userId: session.user.id,
          userRole: session.user.role,
          orgId: session.user.orgId
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'checkout-debug',
        hypothesisId: 'C'
      })
    }).catch(() => {});
    // #endregion

    // @ts-ignore - Extended session properties from auth.d.ts
    const organizationId = session.user.orgId;

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'No organization found' },
        { status: 400 }
      );
    }

    const { priceId } = await request.json();

    // #region agent log - request data
    fetch('http://127.0.0.1:7242/ingest/1b3163b7-f1ae-4e91-bf21-62593b0c9267', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/api/operator/payments/checkout/route.ts:70',
        message: 'Request data parsed',
        data: { priceId: priceId },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'checkout-debug',
        hypothesisId: 'D'
      })
    }).catch(() => {});
    // #endregion

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

    // #region agent log - organization lookup
    fetch('http://127.0.0.1:7242/ingest/1b3163b7-f1ae-4e91-bf21-62593b0c9267', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/api/operator/payments/checkout/route.ts:90',
        message: 'Organization lookup result',
        data: {
          organizationId: organizationId,
          found: !!organization,
          name: organization?.name,
          publicEmail: organization?.publicEmail
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'checkout-debug',
        hypothesisId: 'E,F'
      })
    }).catch(() => {});
    // #endregion

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

    // #region agent log - stripe customer result
    fetch('http://127.0.0.1:7242/ingest/1b3163b7-f1ae-4e91-bf21-62593b0c9267', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/api/operator/payments/checkout/route.ts:115',
        message: 'Stripe customer creation result',
        data: {
          organizationId: organizationId,
          customerId: stripeCustomer?.id,
          email: organization.publicEmail || `admin@${organization.name.toLowerCase().replace(/\s+/g, '')}.com`,
          name: organization.name
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'checkout-debug',
        hypothesisId: 'F,G'
      })
    }).catch(() => {});
    // #endregion

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

    // #region agent log - checkout session created
    fetch('http://127.0.0.1:7242/ingest/1b3163b7-f1ae-4e91-bf21-62593b0c9267', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/api/operator/payments/checkout/route.ts:145',
        message: 'Checkout session created successfully',
        data: {
          sessionId: checkoutSession.id,
          url: checkoutSession.url,
          priceId: priceId,
          customerId: stripeCustomerId
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'checkout-debug',
        hypothesisId: 'G'
      })
    }).catch(() => {});
    // #endregion

    return NextResponse.json({
      success: true,
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });

  } catch (error: any) {
    // #region agent log - checkout error
    fetch('http://127.0.0.1:7242/ingest/1b3163b7-f1ae-4e91-bf21-62593b0c9267', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/api/operator/payments/checkout/route.ts:165',
        message: 'Checkout creation error',
        data: {
          error: error.message,
          stack: error.stack,
          name: error.name
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'checkout-debug',
        hypothesisId: 'H,I,J'
      })
    }).catch(() => {});
    // #endregion

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
