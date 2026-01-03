import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { cancelSubscription } from '@/lib/stripe';
import { prisma } from '@/app/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // @ts-ignore - Extended session properties from auth.d.ts
    if (!session?.user || session.user.role !== 'webmaster') {
      return NextResponse.json(
        { success: false, error: 'Webmaster access required' },
        { status: 401 }
      );
    }

    const { subscriptionId, cancelType = 'end_of_period' } = await request.json();

    if (!subscriptionId) {
      return NextResponse.json(
        { success: false, error: 'Subscription ID is required' },
        { status: 400 }
      );
    }

    // Find the subscription in the database
    const subscription = await prisma.firmSubscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
      include: { firm: true }
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Cancel the subscription
    const immediate = cancelType === 'immediate';
    const cancelledSubscription = await cancelSubscription(subscriptionId, immediate);

    // Update local database
    await prisma.firmSubscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: !immediate,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: cancelledSubscription.id,
        status: cancelledSubscription.status,
        cancel_at_period_end: cancelledSubscription.cancel_at_period_end,
        current_period_end: cancelledSubscription.current_period_end,
        organization_name: subscription.firm.name
      }
    });

  } catch (error: any) {
    console.error('Webmaster subscription cancellation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to cancel subscription'
      },
      { status: 500 }
    );
  }
}
