import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();
    // @ts-ignore - Extended session properties from auth.d.ts
    if (!session?.user || session.user.role !== 'webmaster') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the singleton firm
    const firm = await prisma.firm.findUnique({
      where: { id: 'firm-singleton' }
    });

    if (!firm) {
      return NextResponse.json({
        success: false,
        error: 'Singleton firm not found'
      }, { status: 500 });
    }

    // Compute real usage metrics from existing schema
    const [
      caseStats,
      documentStats,
      userStats,
      leadStats
    ] = await Promise.all([
      // Case statistics
      prisma.case.groupBy({
        by: ['status'],
        where: { firmId: firm.id },
        _count: { id: true }
      }),

      // Document statistics
      prisma.caseDocument.aggregate({
        where: {
          case: {
            firmId: firm.id
          }
        },
        _count: { id: true },
        _sum: { sizeBytes: true }
      }),

      // User statistics
      prisma.user.count({
        where: { firmId: firm.id }
      }),

      // Lead statistics
      prisma.lead.aggregate({
        where: { firmId: firm.id },
        _count: { id: true }
      }),
      prisma.lead.count({
        where: {
          firmId: firm.id,
          status: 'CONVERTED'
        }
      })
    ]);

    // Process case statistics
    const totalCases = caseStats.reduce((sum, stat) => sum + stat._count.id, 0);
    const activeCases = caseStats.find(stat => stat.status === 'ACTIVE')?._count.id || 0;
    const closedCases = caseStats.find(stat => stat.status === 'CLOSED')?._count.id || 0;

    // Process document statistics
    const totalDocuments = documentStats._count.id;
    const totalSizeBytes = documentStats._sum.sizeBytes || 0;
    const averageSizeBytes = totalDocuments > 0 ? totalSizeBytes / totalDocuments : 0;

    // Get converted leads count
    const convertedLeadsResult = await prisma.lead.count({
      where: {
        firmId: firm.id,
        status: 'CONVERTED'
      }
    });

    // Define reasonable limits for single-tenant usage
    const limits = {
      cases: 100,
      documents: 1000,
      storage_mb: 100, // 100MB
      users: 10,
      leads: 200
    };

    // Transform usage data into metrics array format expected by frontend
    const metrics = [
      {
        organization_name: firm.name,
        metric_name: 'cases',
        current_month_count: totalCases,
        monthly_limit: limits.cases,
        usage_percentage: Math.min((totalCases / limits.cases) * 100, 100)
      },
      {
        organization_name: firm.name,
        metric_name: 'documents',
        current_month_count: totalDocuments,
        monthly_limit: limits.documents,
        usage_percentage: Math.min((totalDocuments / limits.documents) * 100, 100)
      },
      {
        organization_name: firm.name,
        metric_name: 'storage_mb',
        current_month_count: Math.round(totalSizeBytes / (1024 * 1024)),
        monthly_limit: limits.storage_mb,
        usage_percentage: Math.min(((totalSizeBytes / (1024 * 1024)) / limits.storage_mb) * 100, 100)
      },
      {
        organization_name: firm.name,
        metric_name: 'users',
        current_month_count: userStats,
        monthly_limit: limits.users,
        usage_percentage: Math.min((userStats / limits.users) * 100, 100)
      },
      {
        organization_name: firm.name,
        metric_name: 'leads',
        current_month_count: leadStats._count.id,
        monthly_limit: limits.leads,
        usage_percentage: Math.min((leadStats._count.id / limits.leads) * 100, 100)
      }
    ];

    // Calculate stats for the response
    const totalRequests = totalCases + totalDocuments + leadStats._count.id;
    const orgsNearLimit = metrics.filter(m => m.usage_percentage >= 70 && m.usage_percentage < 90).length;
    const orgsOverLimit = metrics.filter(m => m.usage_percentage >= 90).length;

    const stats = {
      totalRequests,
      activeOrgs: 1, // Single tenant
      orgsNearLimit,
      orgsOverLimit,
      topConsumers: [
        {
          organization_name: firm.name,
          total_usage: totalCases + totalDocuments + userStats + leadStats._count.id
        }
      ]
    };

    return NextResponse.json({
      success: true,
      metrics,
      stats
    });
  } catch (error) {
    console.error('Usage fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}
