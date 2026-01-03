/**
 * GET /api/operator/payments
 * Get subscription and invoice information for an organization
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { getAllPlanStripeIds } from "@/lib/stripe-db";
import { getActiveSubscription, listCustomerInvoices } from "@/lib/stripe";
import { getStripeCustomerId } from "@/lib/stripe-db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    // @ts-ignore - Extended session properties from auth.d.ts
    if (!session?.user || !session.user.orgId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // @ts-ignore - Extended session properties from auth.d.ts
    const organizationId = session.user.orgId;
    console.log('🏢 Organization ID from session:', organizationId);
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    // Get Stripe customer ID for this organization
    const stripeCustomerId = await getStripeCustomerId(organizationId);
    console.log('💳 Stripe customer ID lookup:', { organizationId, stripeCustomerId });

    let subscription = null;
    let invoices: any[] = [];

    if (stripeCustomerId) {
      try {
        // Get real subscription data from Stripe (always fresh for accuracy)
        const stripeSubscription = await getActiveSubscription(stripeCustomerId);

        if (stripeSubscription) {
          console.log('🔄 Syncing subscription data from Stripe to database...');
          console.log('   Stripe status:', stripeSubscription.status);
          console.log('   Database will be updated to:', stripeSubscription.status.toUpperCase());

          // Check if subscription exists first
          const existingSub = await prisma.firmSubscription.findUnique({
            where: { firmId: organizationId }
          });
          console.log('   Existing subscription in DB:', existingSub ? `status=${existingSub.status}` : 'none');

          // Always sync latest Stripe data with local database for accurate status
          let syncedSubscription;
          try {
            if (existingSub) {
              console.log('   Updating existing subscription...');
              syncedSubscription = await prisma.firmSubscription.update({
                where: { firmId: organizationId },
                data: {
                  stripeSubscriptionId: stripeSubscription.id,
                  stripePriceId: stripeSubscription.items.data[0]?.price.id,
                  status: stripeSubscription.status.toUpperCase() as any,
                  cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end || false,
                  currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
                  currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
                  updatedAt: new Date()
                },
                include: {
                  plan: true
                }
              });
            } else {
              console.log('   Creating new subscription...');
              syncedSubscription = await prisma.firmSubscription.create({
                data: {
                  firmId: organizationId,
                  stripeSubscriptionId: stripeSubscription.id,
                  stripePriceId: stripeSubscription.items.data[0]?.price.id,
                  status: stripeSubscription.status.toUpperCase() as any,
                  currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
                  currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000)
                },
                include: {
                  plan: true
                }
              });
            }

            console.log('✅ Database sync complete. New status:', syncedSubscription.status);
          } catch (dbError) {
            console.error('❌ Database sync failed:', dbError);
            // Continue with Stripe data even if DB update fails
            syncedSubscription = existingSub || {
              status: stripeSubscription.status.toUpperCase(),
              stripeSubscriptionId: stripeSubscription.id,
              stripePriceId: stripeSubscription.items.data[0]?.price.id,
              currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
              currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
              cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end || false,
              plan: null
            };
          }

          // Verify the update worked
          const verifySub = await prisma.firmSubscription.findUnique({
            where: { firmId: organizationId }
          });
          console.log('   Verification - DB now shows status:', verifySub?.status);

          subscription = syncedSubscription;

          // Get invoices from Stripe
          try {
            const stripeInvoices = await listCustomerInvoices(stripeCustomerId, 12);
            invoices = stripeInvoices.map(invoice => ({
              id: invoice.id,
              amount: invoice.amount_due,
              status: invoice.status,
              date: new Date(invoice.created * 1000).toISOString(),
              dueDate: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : undefined,
              paidDate: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000).toISOString() : undefined
            }));
          } catch (invoiceError) {
            console.error("Error fetching invoices:", invoiceError);
            // Continue without invoices
          }
        }
        // If no active subscription from Stripe, don't fall back to database
        // The database might contain stale/canceled subscription data
      } catch (stripeError) {
        console.error("Error fetching Stripe subscription:", stripeError);
        // Only fall back to local database for actual API errors (not for no active subscriptions)
        // For now, we'll treat API errors as no subscription available
        console.warn("Stripe API error - treating as no active subscription");
      }
    } else {
      // No Stripe customer - check local database
      subscription = await prisma.firmSubscription.findFirst({
        where: { firmId: organizationId },
        include: {
          plan: true
        }
      });
    }

    if (!subscription) {
      // No subscription - return available plans for purchase
      try {
        const availablePlans = await getAllPlanStripeIds();
        return NextResponse.json({
          success: true,
          subscription: null,
          invoices: [],
          availablePlans: availablePlans,
          message: "No active subscription found"
        });
      } catch (error) {
        console.error("Error fetching available plans:", error);
        return NextResponse.json({
          success: true,
          subscription: null,
          invoices: [],
          availablePlans: [],
          message: "No active subscription found"
        });
      }
    }

    const today = new Date();
    const daysUntilRenewal = subscription.currentPeriodEnd
      ? Math.ceil((subscription.currentPeriodEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // TODO: Calculate actual usage from metrics (Phase 3C)
    const currentUsage = 0;
    const monthlyLimit = 100; // TODO: Add to plan model
    const usagePercentage = (currentUsage / monthlyLimit) * 100;

    const formattedSubscription = {
      id: subscription.stripeSubscriptionId,
      planName: subscription.plan?.name || 'Unknown Plan',
      status: subscription.status.toLowerCase(), // Convert to lowercase for frontend
      amount: subscription.plan?.priceCents || 0,
      currentPeriodStart: subscription.currentPeriodStart?.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
      daysUntilRenewal: Math.max(0, daysUntilRenewal),
      caseLimit: monthlyLimit,
      currentUsage: currentUsage,
      usagePercentage: Math.min(100, usagePercentage),
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    };

    return NextResponse.json({
      success: true,
      subscription: formattedSubscription,
      invoices: invoices, // Already formatted from Stripe
    });
  } catch (error) {
    console.error("Get operator payments error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch payment information" },
      { status: 500 }
    );
  }
}
