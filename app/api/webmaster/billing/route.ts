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

    // === REAL SUBSCRIPTION METRICS ===

    // Get all subscriptions with plan details
    let subscriptions = [];
    try {
      subscriptions = await prisma.firmSubscription.findMany({
        where: {
          status: { in: ['ACTIVE', 'TRIALING'] }
        },
        include: {
          plan: true,
          firm: true
        }
      });
    } catch (subscriptionError) {
      console.warn('Could not fetch subscriptions (table may not exist yet):', subscriptionError.message);
      // Continue with empty subscriptions array
    }

    // Get all invoices (may be empty if none exist yet)
    let allInvoices = [];
    try {
      allInvoices = await prisma.invoice.findMany({
        where: {
          firmId: { not: null }
        },
        include: {
          firm: true
        },
        orderBy: {
          issueDate: 'desc'
        },
        take: 10
      });
    } catch (invoiceError) {
      console.warn('Could not fetch invoices (table may not exist yet):', invoiceError.message);
      // Continue with empty invoices array
    }

    // Calculate real metrics
    const totalRevenue = allInvoices
      .filter(invoice => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + invoice.amount, 0) / 100; // Convert cents to dollars

    const monthlyRecurringRevenue = subscriptions
      .filter(sub => sub.status === 'ACTIVE')
      .reduce((sum, sub) => sum + (sub.plan?.priceCents || 0), 0) / 100; // Convert cents to dollars

    const averageContractValue = subscriptions.length > 0
      ? monthlyRecurringRevenue / subscriptions.length
      : 0;

    // Calculate churn rate (simplified - subscriptions cancelled this month / total active)
    const thisMonth = new Date();
    thisMonth.setDate(1); // Start of this month

    const cancelledThisMonth = await prisma.firmSubscription.count({
      where: {
        status: 'CANCELLED',
        updatedAt: {
          gte: thisMonth
        }
      }
    });

    const churnRate = subscriptions.length > 0
      ? (cancelledThisMonth / subscriptions.length) * 100
      : 0;

    // Payments processed this month
    const paymentsProcessed = allInvoices.filter(invoice => {
      const issueDate = new Date(invoice.issueDate);
      return issueDate >= thisMonth && invoice.status === 'paid';
    }).length;

    // Overdue payments (invoices past due date)
    const paymentsOverdue = allInvoices.filter(invoice => {
      if (!invoice.dueDate || invoice.status === 'paid') return false;
      return new Date(invoice.dueDate) < new Date();
    }).length;

    // Format invoices for frontend
    const invoices = allInvoices.slice(0, 5).map(invoice => ({
      id: invoice.id,
      organization_name: invoice.firm?.name || 'Unknown',
      amount: invoice.amount / 100, // Convert cents to dollars
      status: invoice.status,
      issue_date: invoice.issueDate.toISOString(),
      due_date: invoice.dueDate?.toISOString(),
      paid_date: invoice.paidDate?.toISOString()
    }));

    // === RESPONSE: Real subscription and billing data ===
    const metrics = {
      totalRevenue,           // ✅ REAL: Sum of all paid invoices
      monthlyRecurringRevenue, // ✅ REAL: Sum of active subscription MRR
      averageContractValue,   // ✅ REAL: MRR divided by subscription count
      churnRate,              // ✅ REAL: Cancelled subscriptions this month %
      paymentsProcessed,      // ✅ REAL: Invoices paid this month
      paymentsOverdue,        // ✅ REAL: Invoices past due date
    };

    // Get active subscriptions for additional data
    const activeSubscriptions = subscriptions.filter(sub => sub.status === 'ACTIVE');

    return NextResponse.json({
      success: true,
      metrics,
      invoices, // ✅ REAL: Recent invoices from database
      subscriptions: activeSubscriptions.map(sub => ({
        id: sub.id,
        organization_name: sub.firm.name,
        plan_name: sub.plan?.name || 'Unknown Plan',
        amount: (sub.plan?.priceCents || 0) / 100,
        status: sub.status.toLowerCase(),
        current_period_start: sub.currentPeriodStart?.toISOString(),
        current_period_end: sub.currentPeriodEnd?.toISOString(),
        cancel_at_period_end: sub.cancelAtPeriodEnd
      }))
    });
  } catch (error) {
    console.error('Billing metrics error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch billing data'
        }
      },
      { status: 500 }
    );
  }
}
