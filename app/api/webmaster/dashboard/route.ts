import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';

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

    // === COMPUTABLE METRICS (from existing Prisma schema) ===
    const metrics: Record<string, number> = {};

    // Organizations: Can compute from existing Firm model
    metrics.totalOrganizations = await prisma.firm.count();

    // === UNAVAILABLE METRICS (require missing billing/usage models) ===
    // These represent real business metrics that will be implemented when schema is added
    const unavailableMetrics = [
      {
        name: 'activeSubscriptions',
        reason: 'Requires FirmSubscription model with billing integration',
        requiredModels: ['FirmSubscription', 'BillingPlan'],
        phase: '2.7',
      },
      {
        name: 'monthlyRecurringRevenue',
        reason: 'Requires billing integration and subscription tracking',
        requiredModels: ['FirmSubscription', 'BillingPlan', 'PaymentRecord'],
        phase: '2.7',
      },
      {
        name: 'organizationsNearLimit',
        reason: 'Requires usage tracking and quota management system',
        requiredModels: ['UsageDailyRollup', 'OrganizationQuota'],
        phase: '3.0',
      },
      {
        name: 'totalAPIRequests',
        reason: 'Requires API usage tracking and analytics system',
        requiredModels: ['UsageDailyRollup', 'ApiRequestLog'],
        phase: '3.0',
      },
      {
        name: 'totalStorageGB',
        reason: 'Requires document storage tracking and aggregation',
        requiredModels: ['CaseDocument', 'StorageUsageRollup'],
        phase: '2.5',
      },
    ];

    // === ARCHITECTURALLY HONEST RESPONSE ===
    // Only return metrics that can actually be computed from current schema
    return NextResponse.json({
      success: true,
      metrics,              // Only computable metrics
      unavailableMetrics,   // Explicit unavailability declarations
    });
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch dashboard metrics'
        }
      },
      { status: 500 }
    );
  }
}
