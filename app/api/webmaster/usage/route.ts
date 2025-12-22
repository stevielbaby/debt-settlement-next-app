import { auth } from '@/auth';
import { sql } from '@/app/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'webmaster') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get usage metrics
    const metricsResult = await sql`
      SELECT 
        o.name as organization_name,
        um.metric_name,
        COALESCE(um.current_month_count, 0) as current_month_count,
        COALESCE(sp.monthly_limit, 10) as monthly_limit,
        ROUND((COALESCE(um.current_month_count, 0)::float / NULLIF(COALESCE(sp.monthly_limit, 10)::float, 0)) * 100, 2) as usage_percentage
      FROM app.organizations o
      LEFT JOIN app.usage_metrics um ON o.id = um.organization_id
      LEFT JOIN app.organization_subscriptions os ON o.id = os.organization_id
      LEFT JOIN app.subscription_plans sp ON os.plan_id = sp.id
      WHERE um.month_year = to_char(CURRENT_DATE, 'YYYY-MM')
      OR (um.month_year IS NULL AND sp.monthly_limit > 0)
      ORDER BY o.name ASC, usage_percentage DESC
    `;

    const metrics = metricsResult.map((row: any) => ({
      organization_name: row.organization_name,
      metric_name: row.metric_name || 'case_created',
      current_month_count: parseInt(row.current_month_count) || 0,
      monthly_limit: parseInt(row.monthly_limit) || 10,
      usage_percentage: parseFloat(row.usage_percentage) || 0,
    }));

    // Get stats
    const totalRequestsResult = await sql`
      SELECT COALESCE(SUM(current_month_count), 0) as total
      FROM app.usage_metrics
      WHERE month_year = to_char(CURRENT_DATE, 'YYYY-MM')
    `;
    const totalRequests = parseInt(totalRequestsResult[0]?.total ?? 0);

    const activeOrgsResult = await sql`
      SELECT COUNT(DISTINCT organization_id) as count
      FROM app.usage_metrics
      WHERE month_year = to_char(CURRENT_DATE, 'YYYY-MM')
      AND current_month_count > 0
    `;
    const activeOrgs = parseInt(activeOrgsResult[0]?.count ?? 0);

    const nearLimitResult = await sql`
      SELECT COUNT(DISTINCT um.organization_id) as count
      FROM app.usage_metrics um
      JOIN app.organization_subscriptions os ON um.organization_id = os.organization_id
      JOIN app.subscription_plans sp ON os.plan_id = sp.id
      WHERE um.month_year = to_char(CURRENT_DATE, 'YYYY-MM')
      AND (um.current_month_count::float / NULLIF(sp.monthly_limit::float, 0)) >= 0.7
      AND (um.current_month_count::float / NULLIF(sp.monthly_limit::float, 0)) < 0.9
    `;
    const orgsNearLimit = parseInt(nearLimitResult[0]?.count ?? 0);

    const overLimitResult = await sql`
      SELECT COUNT(DISTINCT um.organization_id) as count
      FROM app.usage_metrics um
      JOIN app.organization_subscriptions os ON um.organization_id = os.organization_id
      JOIN app.subscription_plans sp ON os.plan_id = sp.id
      WHERE um.month_year = to_char(CURRENT_DATE, 'YYYY-MM')
      AND (um.current_month_count::float / NULLIF(sp.monthly_limit::float, 0)) >= 0.9
    `;
    const orgsOverLimit = parseInt(overLimitResult[0]?.count ?? 0);

    // Get top consumers
    const topConsumersResult = await sql`
      SELECT 
        o.name as organization_name,
        COALESCE(SUM(um.current_month_count), 0) as total_usage
      FROM app.organizations o
      LEFT JOIN app.usage_metrics um ON o.id = um.organization_id
      WHERE um.month_year = to_char(CURRENT_DATE, 'YYYY-MM')
      GROUP BY o.id, o.name
      ORDER BY total_usage DESC
      LIMIT 5
    `;

    const topConsumers = topConsumersResult.map((row: any) => ({
      organization_name: row.organization_name,
      total_usage: parseInt(row.total_usage) || 0,
    }));

    const stats = {
      totalRequests,
      activeOrgs,
      orgsNearLimit,
      orgsOverLimit,
      topConsumers,
    };

    return NextResponse.json({
      success: true,
      metrics,
      stats,
    });
  } catch (error) {
    console.error('Usage metrics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch usage metrics' },
      { status: 500 }
    );
  }
}
