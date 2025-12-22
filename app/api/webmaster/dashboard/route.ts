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

    // Get total organizations
    const orgsResult = await sql`SELECT COUNT(*) as count FROM app.organizations`;
    const totalOrganizations = parseInt(orgsResult[0]?.count ?? 0);

    // Get active subscriptions
    const subsResult = await sql`
      SELECT COUNT(*) as count FROM app.organization_subscriptions 
      WHERE status = 'active' OR status = 'trialing'
    `;
    const activeSubscriptions = parseInt(subsResult[0]?.count ?? 0);

    // Get monthly recurring revenue (sum of all active subscription prices)
    const revenueResult = await sql`
      SELECT COALESCE(SUM(sp.price), 0) as total_revenue
      FROM app.organization_subscriptions os
      JOIN app.subscription_plans sp ON os.plan_id = sp.id
      WHERE os.status = 'active' OR os.status = 'trialing'
    `;
    const monthlyRecurringRevenue = parseFloat(revenueResult[0]?.total_revenue ?? 0);

    // Get organizations near limit (90%+ of usage)
    const nearLimitResult = await sql`
      SELECT COUNT(DISTINCT os.organization_id) as count
      FROM app.usage_metrics um
      JOIN app.organization_subscriptions os ON um.org_id = os.organization_id
      JOIN app.subscription_plans sp ON os.plan_id = sp.id
      WHERE um.metric_type = 'case_created'
      AND um.billing_cycle_start <= CURRENT_DATE
      AND um.billing_cycle_end >= CURRENT_DATE
      AND (um.metric_value::float / NULLIF(sp.monthly_limit::float, 0)) > 0.9
    `;
    const organizationsNearLimit = parseInt(nearLimitResult[0]?.count ?? 0);

    // Get total API requests this month
    const apiRequestsResult = await sql`
      SELECT COALESCE(SUM(metric_value), 0) as total
      FROM app.usage_metrics
      WHERE metric_type = 'api_request'
      AND billing_cycle_start >= CURRENT_DATE - interval '30 days'
    `;
    const totalAPIRequests = parseInt(apiRequestsResult[0]?.total ?? 0);

    // Get total storage (estimated from database size or case data)
    // For now, estimate based on total cases and notes
    const storageResult = await sql`
      SELECT 
        COUNT(DISTINCT c.id) as case_count,
        COUNT(cn.id) as note_count
      FROM app.cases c
      LEFT JOIN app.case_notes cn ON c.id = cn.case_id
    `;
    const rows = storageResult[0];
    const estimatedStorageGB = ((parseInt(rows.case_count) * 0.05) + (parseInt(rows.note_count) * 0.01)) / 1024; // Rough estimate in GB

    const metrics = {
      totalOrganizations,
      activeSubscriptions,
      monthlyRecurringRevenue,
      organizationsNearLimit,
      totalAPIRequests,
      totalStorageGB: Math.max(0.1, estimatedStorageGB), // At least 0.1 GB
    };

    return NextResponse.json({
      success: true,
      metrics,
    });
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
