import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  console.log('🚀 ===== BILLING API REQUEST START =====');
  try {
    console.log('🔐 Checking authentication...');
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

    // #region agent log - check all subscriptions in database
    fetch('http://127.0.0.1:7242/ingest/1b3163b7-f1ae-4e91-bf21-62593b0c9267', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/api/webmaster/billing/route.ts:all-subscriptions-check',
        message: 'Checking all subscriptions in database',
        data: {},
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'database-debug',
        hypothesisId: 'DBQ5'
      })
    }).catch(() => {});
    // #endregion

    try {
      const allSubscriptions = await prisma.firmSubscription.findMany({
        include: {
          plan: true,
          firm: true
        }
      });

      // #region agent log - all subscriptions result
      fetch('http://127.0.0.1:7242/ingest/1b3163b7-f1ae-4e91-bf21-62593b0c9267', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'app/api/webmaster/billing/route.ts:all-subscriptions-result',
          message: 'All subscriptions in database',
          data: {
            total: allSubscriptions.length,
            subscriptions: allSubscriptions.map(s => ({
              id: s.id,
              status: s.status,
              stripePriceId: s.stripePriceId,
              firmId: s.firmId,
              planName: s.plan?.name,
              createdAt: s.createdAt
            }))
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'database-debug',
          hypothesisId: 'DBQ5'
        })
      }).catch(() => {});
      // #endregion
    } catch (error) {
      // #region agent log - all subscriptions error
      fetch('http://127.0.0.1:7242/ingest/1b3163b7-f1ae-4e91-bf21-62593b0c9267', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'app/api/webmaster/billing/route.ts:all-subscriptions-error',
          message: 'Error checking all subscriptions',
          data: { error: error.message },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'database-debug',
          hypothesisId: 'DBQ5'
        })
      }).catch(() => {});
      // #endregion
    }

    // Get all subscriptions with plan details
    // #region agent log - billing database query
    fetch('http://127.0.0.1:7242/ingest/1b3163b7-f1ae-4e91-bf21-62593b0c9267', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/api/webmaster/billing/route.ts:database-query',
        message: 'Executing billing subscriptions query',
        data: { statusFilter: ['ACTIVE', 'TRIALING'] },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'database-debug',
        hypothesisId: 'DBQ3,DBQ4'
      })
    }).catch(() => {});
    // #endregion

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

      // #region agent log - billing query result
      fetch('http://127.0.0.1:7242/ingest/1b3163b7-f1ae-4e91-bf21-62593b0c9267', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'app/api/webmaster/billing/route.ts:query-result',
          message: 'Billing subscriptions query result',
          data: {
            found: subscriptions.length,
            subscriptions: subscriptions.map(s => ({
              id: s.id,
              status: s.status,
              stripePriceId: s.stripePriceId,
              firmId: s.firmId,
              planName: s.plan?.name,
              planId: s.plan?.id
            }))
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'database-debug',
          hypothesisId: 'DBQ3,DBQ4'
        })
      }).catch(() => {});
      // #endregion

    } catch (subscriptionError) {
      console.warn('Could not fetch subscriptions (table may not exist yet):', subscriptionError.message);
      // Continue with empty subscriptions array
    }

    // #region agent log - billing subscriptions found
    fetch('http://127.0.0.1:7242/ingest/1b3163b7-f1ae-4e91-bf21-62593b0c9267', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/api/webmaster/billing/route.ts:subscriptions-query',
        message: 'Billing API subscription query results',
        data: {
          subscriptionCount: subscriptions.length,
          subscriptionStatuses: subscriptions.map(s => ({
            id: s.id,
            status: s.status,
            planName: s.plan?.name
          }))
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'webhook-debug',
        hypothesisId: 'DB1,DB2,DB4'
      })
    }).catch(() => {});
    // #endregion

    // Get all invoices (may be empty if none exist yet)
    let allInvoices = [];
    try {
      allInvoices = await prisma.invoice.findMany({
        include: {
          firm: true
        },
        orderBy: {
          issueDate: 'desc'
        },
        take: 10
      });

      // Filter out invoices without firmId in JavaScript since Prisma null handling can be tricky
      allInvoices = allInvoices.filter(invoice => invoice.firmId !== null);
    } catch (invoiceError) {
      console.warn('Could not fetch invoices (table may not exist yet):', invoiceError.message);
      // Continue with empty invoices array
    }

    // Calculate real metrics with detailed error logging
    console.log('🔢 Starting metrics calculation...');
    console.log('📊 Subscriptions count:', subscriptions.length);
    console.log('📄 Invoices count:', allInvoices.length);

    let totalRevenue, monthlyRecurringRevenue, averageContractValue, churnRate, paymentsProcessed, paymentsOverdue;

    try {
      console.log('💰 Calculating total revenue...');
      totalRevenue = allInvoices
        .filter(invoice => {
          const isPaid = invoice.status === 'paid';
          console.log(`📄 Invoice ${invoice.id}: status=${invoice.status}, amount=${invoice.amount}, isPaid=${isPaid}`);
          return isPaid;
        })
        .reduce((sum, invoice) => {
          const amount = invoice.amount || 0;
          console.log(`💰 Adding invoice ${invoice.id}: amount=${amount}`);
          return sum + amount;
        }, 0) / 100; // Convert cents to dollars

      console.log('💰 Total revenue calculated:', totalRevenue);

      console.log('💵 Calculating MRR...');
      const activeSubscriptionsFiltered = subscriptions.filter(sub => {
        const isActive = sub.status === 'ACTIVE';
        console.log(`📊 Subscription ${sub.id}: status=${sub.status}, isActive=${isActive}`);
        return isActive;
      });

      monthlyRecurringRevenue = activeSubscriptionsFiltered
        .reduce((sum, sub) => {
          const price = sub.plan?.priceCents || 0;
          console.log(`💵 Adding subscription ${sub.id}: plan=${sub.plan?.name}, price=${price}`);
          return sum + price;
        }, 0) / 100; // Convert cents to dollars

      console.log('💵 MRR calculated:', monthlyRecurringRevenue);

      averageContractValue = subscriptions.length > 0
        ? monthlyRecurringRevenue / subscriptions.length
        : 0;

      console.log('📈 ACV calculated:', averageContractValue);

      // Calculate churn rate with error handling
      console.log('📉 Calculating churn rate...');
      const thisMonth = new Date();
      thisMonth.setDate(1); // Start of this month
      console.log('📅 This month start:', thisMonth);

      const cancelledThisMonth = await prisma.firmSubscription.count({
        where: {
          status: 'CANCELED',
          updatedAt: {
            gte: thisMonth
          }
        }
      });
      console.log('📉 Cancelled this month:', cancelledThisMonth);

      churnRate = subscriptions.length > 0
        ? (cancelledThisMonth / subscriptions.length) * 100
        : 0;

      console.log('📊 Churn rate calculated:', churnRate);

      // Calculate payments metrics with error handling
      console.log('💳 Calculating payment metrics...');
      paymentsProcessed = allInvoices.filter(invoice => {
        try {
          if (!invoice.issueDate) {
            console.log(`⚠️ Invoice ${invoice.id} has no issue date`);
            return false;
          }
          const issueDate = new Date(invoice.issueDate);
          const isThisMonth = issueDate >= thisMonth;
          const isPaid = invoice.status === 'paid';
          console.log(`💳 Invoice ${invoice.id}: issueDate=${issueDate}, isThisMonth=${isThisMonth}, isPaid=${isPaid}`);
          return isThisMonth && isPaid;
        } catch (dateError) {
          console.error(`❌ Date error for invoice ${invoice.id}:`, dateError);
          return false;
        }
      }).length;

      paymentsOverdue = allInvoices.filter(invoice => {
        try {
          if (!invoice.dueDate || invoice.status === 'paid') {
            console.log(`⚠️ Invoice ${invoice.id} has no due date or is already paid`);
            return false;
          }
          const dueDate = new Date(invoice.dueDate);
          const now = new Date();
          const isOverdue = dueDate < now;
          console.log(`⚠️ Invoice ${invoice.id}: dueDate=${dueDate}, now=${now}, isOverdue=${isOverdue}`);
          return isOverdue;
        } catch (dateError) {
          console.error(`❌ Due date error for invoice ${invoice.id}:`, dateError);
          return false;
        }
      }).length;

      console.log('✅ Payments processed:', paymentsProcessed);
      console.log('⚠️ Payments overdue:', paymentsOverdue);

    } catch (metricsError) {
      console.error('❌ Metrics calculation error:', metricsError);
      console.error('❌ Error stack:', metricsError.stack);
      throw new Error(`Metrics calculation failed: ${metricsError.message}`);
    }

    // Format invoices for frontend with error handling
    console.log('📄 Formatting invoices...');
    let invoices;
    try {
      invoices = allInvoices.slice(0, 5).map(invoice => {
        try {
          const formatted = {
            id: invoice.id,
            organization_name: invoice.firm?.name || 'Unknown',
            amount: (invoice.amount || 0) / 100, // Convert cents to dollars
            status: invoice.status || 'unknown',
            issue_date: invoice.issueDate?.toISOString() || new Date().toISOString(),
            due_date: invoice.dueDate?.toISOString(),
            paid_date: invoice.paidDate?.toISOString()
          };
          console.log(`📄 Formatted invoice ${invoice.id}:`, formatted);
          return formatted;
        } catch (formatError) {
          console.error(`❌ Invoice formatting error for ${invoice.id}:`, formatError);
          return {
            id: invoice.id || 'unknown',
            organization_name: 'Error',
            amount: 0,
            status: 'error',
            issue_date: new Date().toISOString(),
            due_date: undefined,
            paid_date: undefined
          };
        }
      });
      console.log('✅ Invoices formatted, count:', invoices.length);
    } catch (invoiceError) {
      console.error('❌ Invoice formatting error:', invoiceError);
      throw new Error(`Invoice formatting failed: ${invoiceError.message}`);
    }

    // Create finalMetrics object (avoiding variable name conflict)
    console.log('📊 Creating final metrics object...');
    const finalMetrics = {
      totalRevenue,
      monthlyRecurringRevenue,
      averageContractValue,
      churnRate,
      paymentsProcessed,
      paymentsOverdue,
    };
    console.log('📊 Final metrics:', finalMetrics);

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

    console.log('✅ Preparing successful response...');
    const responseData = {
      success: true,
      metrics: finalMetrics,
      invoices, // ✅ REAL: Recent invoices from database
      subscriptions: activeSubscriptions.map(sub => ({
        id: sub.id,
        stripeSubscriptionId: sub.stripeSubscriptionId, // ✅ ADD THIS - needed for cancellation
        organization_name: sub.firm.name,
        plan_name: sub.plan?.name || 'Unknown Plan',
        amount: (sub.plan?.priceCents || 0) / 100,
        status: sub.status.toLowerCase(),
        current_period_start: sub.currentPeriodStart?.toISOString(),
        current_period_end: sub.currentPeriodEnd?.toISOString(),
        cancel_at_period_end: sub.cancelAtPeriodEnd
      }))
    };

    console.log('✅ Response prepared:', {
      success: responseData.success,
      metrics: Object.keys(responseData.metrics),
      invoicesCount: responseData.invoices.length,
      subscriptionsCount: responseData.subscriptions.length
    });

    console.log('🎉 ===== BILLING API REQUEST SUCCESS =====');
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('💥 CRITICAL: Billing API error:', error);
    console.error('💥 Error message:', error.message);
    console.error('💥 Error name:', error.name);
    console.error('💥 Error stack:', error.stack);

    // Log additional context
    console.error('💥 Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'), // First 5 lines of stack
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch billing data',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      },
      { status: 500 }
    );
  }
}
