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

    // Get total revenue (sum of all paid invoices)
    const revenueResult = await sql`
      SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total
      FROM app.invoices
      WHERE status = 'paid'
    `;
    const totalRevenue = parseFloat(revenueResult[0]?.total ?? 0);

    // Get MRR
    const mrrResult = await sql`
      SELECT COALESCE(SUM(sp.price), 0) as mrr
      FROM app.organization_subscriptions os
      JOIN app.subscription_plans sp ON os.plan_id = sp.id
      WHERE os.status = 'active' OR os.status = 'trialing'
    `;
    const monthlyRecurringRevenue = parseFloat(mrrResult[0]?.mrr ?? 0);

    // Get ACV (average contract value)
    const acvResult = await sql`
      SELECT COALESCE(AVG(sp.price * 12), 0) as acv
      FROM app.organization_subscriptions os
      JOIN app.subscription_plans sp ON os.plan_id = sp.id
      WHERE os.status = 'active' OR os.status = 'trialing'
    `;
    const averageContractValue = parseFloat(acvResult[0]?.acv ?? 0);

    // Get churn rate (organizations that cancelled in last 30 days / total active 30 days ago)
    const churnResult = await sql`
      SELECT 
        COUNT(CASE WHEN os.status = 'canceled' AND os.updated_at >= NOW() - INTERVAL '30 days' THEN 1 END)::float / 
        NULLIF(COUNT(*), 0) * 100 as churn_rate
      FROM app.organization_subscriptions os
    `;
    const churnRate = parseFloat(churnResult[0]?.churn_rate ?? 0);

    // Get payments processed this month
    const paymentsResult = await sql`
      SELECT COUNT(*) as count
      FROM app.invoices
      WHERE status = 'paid' 
      AND EXTRACT(YEAR FROM paid_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND EXTRACT(MONTH FROM paid_date) = EXTRACT(MONTH FROM CURRENT_DATE)
    `;
    const paymentsProcessed = parseInt(paymentsResult[0]?.count ?? 0);

    // Get overdue payments
    const overdueResult = await sql`
      SELECT COUNT(*) as count
      FROM app.invoices
      WHERE status != 'paid' AND due_date < CURRENT_DATE
    `;
    const paymentsOverdue = parseInt(overdueResult[0]?.count ?? 0);

    // Get recent invoices
    const invoicesResult = await sql`
      SELECT 
        i.id,
        o.name as organization_name,
        i.amount,
        i.status,
        i.issue_date,
        i.due_date,
        i.paid_date
      FROM app.invoices i
      JOIN app.organizations o ON i.organization_id = o.id
      ORDER BY i.issue_date DESC
      LIMIT 20
    `;

    const invoices = invoicesResult.map((row: any) => ({
      id: row.id,
      organization_name: row.organization_name,
      amount: parseFloat(row.amount),
      status: row.status,
      issue_date: row.issue_date,
      due_date: row.due_date,
      paid_date: row.paid_date,
    }));

    const metrics = {
      totalRevenue,
      monthlyRecurringRevenue,
      averageContractValue,
      churnRate,
      paymentsProcessed,
      paymentsOverdue,
    };

    return NextResponse.json({
      success: true,
      metrics,
      invoices,
    });
  } catch (error) {
    console.error('Billing metrics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch billing data' },
      { status: 500 }
    );
  }
}
