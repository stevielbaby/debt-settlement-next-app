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

    const result = await sql`
      SELECT 
        os.id,
        os.organization_id,
        o.name as organization_name,
        os.plan_id,
        sp.name as plan_name,
        os.status,
        os.current_period_start,
        os.current_period_end
      FROM app.organization_subscriptions os
      JOIN app.organizations o ON os.organization_id = o.id
      JOIN app.subscription_plans sp ON os.plan_id = sp.id
      ORDER BY o.name ASC
    `;

    const subscriptions = result.map((row: any) => ({
      id: row.id,
      organization_id: row.organization_id,
      organization_name: row.organization_name,
      plan_id: row.plan_id,
      plan_name: row.plan_name,
      status: row.status,
      current_period_start: row.current_period_start,
      current_period_end: row.current_period_end,
    }));

    return NextResponse.json({
      success: true,
      subscriptions,
    });
  } catch (error) {
    console.error('Subscriptions fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}
