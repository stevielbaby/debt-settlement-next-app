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
        um.metric_type as metric_name,
        COALESCE(um.metric_value, 0) as current_month_count,
        COALESCE(sp.monthly_limit, 10) as monthly_limit,
        CAST(ROUND(CAST((COALESCE(um.metric_value, 0)::float / NULLIF(COALESCE(sp.monthly_limit, 10)::float, 0)) * 100 AS numeric), 2) AS float) as usage_percentage
      FROM app.organizations o
      LEFT JOIN app.usage_metrics um ON o.id = um.org_id
        AND um.billing_cycle_start <= CURRENT_DATE
        AND um.billing_cycle_end >= CURRENT_DATE
      LEFT JOIN app.organization_subscriptions os ON o.id = os.organization_id
      LEFT JOIN app.subscription_plans sp ON os.plan_id = sp.id
      WHERE um.metric_type IS NOT NULL OR sp.monthly_limit > 0
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
      SELECT COALESCE(SUM(metric_value), 0) as total
      FROM app.usage_metrics
      WHERE billing_cycle_start <= CURRENT_DATE
      AND billing_cycle_end >= CURRENT_DATE
    `;
    const totalRequests = parseInt(totalRequestsResult[0]?.total ?? 0);

    const activeOrgsResult = await sql`
      SELECT COUNT(DISTINCT org_id) as count
      FROM app.usage_metrics
      WHERE billing_cycle_start <= CURRENT_DATE
      AND billing_cycle_end >= CURRENT_DATE
      AND metric_value > 0
    `;
    const activeOrgs = parseInt(activeOrgsResult[0]?.count ?? 0);

    const nearLimitResult = await sql`
      SELECT COUNT(DISTINCT um.org_id) as count
      FROM app.usage_metrics um
      JOIN app.organization_subscriptions os ON um.org_id = os.organization_id
      JOIN app.subscription_plans sp ON os.plan_id = sp.id
      WHERE um.billing_cycle_start <= CURRENT_DATE
      AND um.billing_cycle_end >= CURRENT_DATE
      AND (um.metric_value::float / NULLIF(sp.monthly_limit::float, 0)) >= 0.7
      AND (um.metric_value::float / NULLIF(sp.monthly_limit::float, 0)) < 0.9
    `;
    const orgsNearLimit = parseInt(nearLimitResult[0]?.count ?? 0);

    const overLimitResult = await sql`
      SELECT COUNT(DISTINCT um.org_id) as count
      FROM app.usage_metrics um
      JOIN app.organization_subscriptions os ON um.org_id = os.organization_id
      JOIN app.subscription_plans sp ON os.plan_id = sp.id
      WHERE um.billing_cycle_start <= CURRENT_DATE
      AND um.billing_cycle_end >= CURRENT_DATE
      AND (um.metric_value::float / NULLIF(sp.monthly_limit::float, 0)) >= 0.9
    `;
    const orgsOverLimit = parseInt(overLimitResult[0]?.count ?? 0);

    // Get top consumers
    const topConsumersResult = await sql`
      SELECT 
        o.name as organization_name,
        COALESCE(SUM(um.metric_value), 0) as total_usage
      FROM app.organizations o
      LEFT JOIN app.usage_metrics um ON o.id = um.org_id
      WHERE um.billing_cycle_start <= CURRENT_DATE
      AND um.billing_cycle_end >= CURRENT_DATE
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
