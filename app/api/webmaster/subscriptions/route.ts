import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();
    // @ts-ignore - Extended session properties from auth.d.ts
    if (!session?.user || session.user.role !== 'webmaster') {
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

    // Phase 3B: Return subscription data (plans resolved from Stripe)
    const subscriptions = await prisma.firmSubscription.findMany({
      include: {
        firm: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedSubscriptions = subscriptions.map(sub => ({
      id: sub.id,
      organizationId: sub.firm.id,
      organizationName: sub.firm.name,
      planName: 'Stripe Plan', // Will be resolved from Stripe in UI
      status: sub.status,
      amount: 0, // Will be resolved from Stripe in UI
      interval: 'month', // Will be resolved from Stripe in UI
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      stripeSubscriptionId: sub.stripeSubscriptionId,
      createdAt: sub.createdAt,
    }));

    return NextResponse.json({
      success: true,
      subscriptions: formattedSubscriptions,
    });
  } catch (error) {
    console.error('Subscriptions fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch subscriptions'
        }
      },
      { status: 500 }
    );
  }
}
