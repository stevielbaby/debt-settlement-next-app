/**
 * POST /api/webmaster/subscriptions/assign-plan
 * Assign a subscription plan to an organization
 * Only accessible by webmaster role
 * PHASE 3B: Basic Stripe integration implemented
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { createStripeCustomer, createSubscription } from "@/lib/stripe";
import { saveStripeCustomerId, saveStripeSubscription } from "@/lib/stripe-db";

export async function POST(request: Request) {
  try {
    const session = await auth();
    // @ts-ignore - Extended session properties from auth.d.ts
    if (!session?.user || session.user.role !== "webmaster") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Webmaster access required'
          }
        },
        { status: 401 }
      );
    }

    const { organizationId, priceId } = await request.json();

    if (!organizationId || !priceId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: organizationId and priceId'
          }
        },
        { status: 400 }
      );
    }

    // Get organization details
    const org = await prisma.firm.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        publicEmail: true,
      }
    });

    if (!org) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ORGANIZATION_NOT_FOUND',
            message: 'Organization not found'
          }
        },
        { status: 404 }
      );
    }

    // Note: We now work directly with Stripe price IDs
    // No database lookup needed - priceId comes from Stripe

    // Check if organization already has an active subscription
    const existingSubscription = await prisma.firmSubscription.findFirst({
      where: {
        firmId: organizationId,
        status: { in: ['TRIALING', 'ACTIVE'] }
      }
    });

    if (existingSubscription) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SUBSCRIPTION_EXISTS',
            message: 'Organization already has an active subscription'
          }
        },
        { status: 409 }
      );
    }

    // Create or get Stripe customer
    let stripeCustomerId = await prisma.firm.findUnique({
      where: { id: organizationId },
      select: { stripeCustomerId: true }
    }).then(result => result?.stripeCustomerId);

    if (!stripeCustomerId) {
      // Create new Stripe customer
      const customer = await createStripeCustomer(
        organizationId,
        org.publicEmail || `admin@${organizationId}.com`,
        org.name,
        { price_id: priceId }
      );
      stripeCustomerId = customer.id;

      // Save customer ID to database
      await saveStripeCustomerId(organizationId, stripeCustomerId);
    }

    // Create Stripe subscription
    const subscription = await createSubscription(
      stripeCustomerId,
      priceId,
      {
        organization_id: organizationId,
        price_id: priceId,
      }
    );

    // Save subscription to database
    const sub = subscription as any; // Cast to access Stripe properties
    await saveStripeSubscription(
      organizationId,
      sub.id,
      priceId,
      '', // No plan ID since we're Stripe-first
      sub.status,
      new Date(sub.current_period_start * 1000),
      new Date(sub.current_period_end * 1000)
    );

    // Get the created subscription from database
    const dbSubscription = await prisma.firmSubscription.findFirst({
      where: { firmId: organizationId },
      include: { plan: true }
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: dbSubscription?.id,
        status: dbSubscription?.status,
        planName: 'Stripe Plan', // Will be resolved from Stripe data in UI
        amount: 0, // Will be resolved from Stripe data in UI
        stripeSubscriptionId: dbSubscription?.stripeSubscriptionId,
        clientSecret: (sub.latest_invoice as any)?.payment_intent?.client_secret,
      },
      message: 'Subscription created successfully'
    });

  } catch (error: any) {
    console.error("Assign subscription error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to assign subscription'
        }
      },
      { status: 500 }
    );
  }
}
