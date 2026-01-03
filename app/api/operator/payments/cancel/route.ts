import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { cancelSubscription } from '@/lib/stripe';
import { prisma } from '@/app/lib/db';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  console.log('🔐 ===== OPERATOR CANCEL REQUEST =====');
  try {
    console.log('🔑 Fetching session...');
    const session = await auth();
    console.log('📊 Session result:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      role: session?.user?.role,
      orgId: session?.user?.orgId,
      userId: session?.user?.id
    });

    // @ts-ignore - Extended session properties from auth.d.ts
    if (!session?.user || session.user.role !== 'operator') {
      console.error('❌ Authorization failed:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        role: session?.user?.role,
        expectedRole: 'operator',
        userId: session?.user?.id
      });
      return NextResponse.json(
        { success: false, error: 'Unauthorized - invalid role' },
        { status: 401 }
      );
    }

    // @ts-ignore - Extended session properties from auth.d.ts
    const organizationId = session.user.orgId;
    console.log('✅ Authorization passed, orgId:', organizationId);

    if (!organizationId) {
      console.error('❌ No organization ID in session');
      return NextResponse.json(
        { success: false, error: 'Unauthorized - no organization' },
        { status: 401 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'No organization found' },
        { status: 400 }
      );
    }

    const requestBody = await request.json();
    const { subscriptionId, cancelType = 'end_of_period' } = requestBody;
    console.log('📦 Request payload:', { subscriptionId, cancelType });

    if (!subscriptionId) {
      console.error('❌ No subscription ID provided');
      return NextResponse.json(
        { success: false, error: 'Subscription ID is required' },
        { status: 400 }
      );
    }

    // Verify the subscription belongs to this organization
    console.log('🔍 Looking up subscription:', { subscriptionId, organizationId });

    // First check if the subscription exists at all
    const anySubscription = await prisma.firmSubscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
      include: { firm: true }
    });
    console.log('📊 Subscription exists in database:', {
      found: !!anySubscription,
      subscriptionId: anySubscription?.stripeSubscriptionId,
      firmId: anySubscription?.firmId,
      firmName: anySubscription?.firm?.name,
      organizationId
    });

    const subscription = await prisma.firmSubscription.findFirst({
      where: {
        stripeSubscriptionId: subscriptionId,
        firmId: organizationId
      }
    });

    console.log('📊 Organization-specific lookup result:', {
      found: !!subscription,
      subscriptionId: subscription?.stripeSubscriptionId,
      firmId: subscription?.firmId,
      organizationId,
      accessGranted: !!subscription
    });

    if (!subscription) {
      console.error('❌ Subscription not found or access denied:', {
        subscriptionExists: !!anySubscription,
        belongsToOperatorOrg: anySubscription?.firmId === organizationId
      });
      return NextResponse.json(
        { success: false, error: 'Subscription not found or access denied' },
        { status: 404 }
      );
    }

    console.log('✅ Subscription access verified');

    // STATE-AWARE CANCELLATION LOGIC
    // Fetch current subscription state from Stripe (authoritative source)
    console.log('🔍 Fetching current subscription state from Stripe...');
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    console.log('📊 Stripe subscription state:', {
      status: stripeSubscription.status,
      cancel_at_period_end: stripeSubscription.cancel_at_period_end
    });

    // Determine current state
    const isActive = stripeSubscription.status === 'active';
    const isCancelling = stripeSubscription.cancel_at_period_end === true;
    const isCancelled = stripeSubscription.status === 'canceled';

    console.log('🎯 Subscription state analysis:', { isActive, isCancelling, isCancelled });

    // Handle already cancelled subscriptions
    if (isCancelled) {
      console.log('✅ Subscription already cancelled - returning success');
      return NextResponse.json({
        success: true,
        message: 'Subscription is already cancelled',
        subscription: {
          id: stripeSubscription.id,
          status: stripeSubscription.status,
          cancel_at_period_end: stripeSubscription.cancel_at_period_end,
          current_period_end: stripeSubscription.current_period_end
        }
      });
    }

    // Handle cancellation requests based on current state and requested action
    if (cancelType === 'end_of_period') {
      if (isCancelling) {
        // Already cancelling at period end - treat as success
        console.log('✅ Already set to cancel at period end - returning success');
        return NextResponse.json({
          success: true,
          message: 'Subscription is already set to cancel at period end',
          subscription: {
            id: stripeSubscription.id,
            status: stripeSubscription.status,
            cancel_at_period_end: stripeSubscription.cancel_at_period_end,
            current_period_end: stripeSubscription.current_period_end
          }
        });
      } else {
        // Set to cancel at period end
        console.log('📝 Setting subscription to cancel at period end...');
        const updatedSub = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true
        });

        // Update local database
        await prisma.firmSubscription.update({
          where: { id: subscription.id },
          data: {
            cancelAtPeriodEnd: true,
            updatedAt: new Date()
          }
        });

        console.log('✅ Successfully set to cancel at period end');
        return NextResponse.json({
          success: true,
          subscription: {
            id: updatedSub.id,
            status: updatedSub.status,
            cancel_at_period_end: updatedSub.cancel_at_period_end,
            current_period_end: updatedSub.current_period_end
          }
        });
      }
    } else if (cancelType === 'immediate') {
      // Always allow immediate cancellation (operator can override admin's cancel-at-period-end)
      console.log('🚨 Cancelling subscription immediately...');
      const cancelledSub = await stripe.subscriptions.cancel(subscriptionId);

      // Update local database
      await prisma.firmSubscription.update({
        where: { id: subscription.id },
        data: {
          status: 'CANCELED',
          cancelAtPeriodEnd: false,
          updatedAt: new Date()
        }
      });

      console.log('✅ Successfully cancelled subscription immediately');
      return NextResponse.json({
        success: true,
        subscription: {
          id: cancelledSub.id,
          status: cancelledSub.status,
          cancel_at_period_end: cancelledSub.cancel_at_period_end,
          current_period_end: cancelledSub.current_period_end
        }
      });
    }

    // Fallback - should not reach here
    console.error('❌ Unexpected cancellation request state');
    return NextResponse.json(
      { success: false, error: 'Invalid cancellation request' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Subscription cancellation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to cancel subscription'
      },
      { status: 500 }
    );
  }
}
