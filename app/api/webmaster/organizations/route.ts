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
        o.id,
        o.name,
        o.email,
        os.status as subscription_status,
        sp.name as plan_name,
        sp.monthly_limit,
        COALESCE(um.metric_value, 0) as current_usage,
        o.created_at
      FROM app.organizations o
      LEFT JOIN app.organization_subscriptions os ON o.id = os.organization_id
      LEFT JOIN app.subscription_plans sp ON os.plan_id = sp.id
      LEFT JOIN app.usage_metrics um ON o.id = um.org_id 
        AND um.metric_type = 'case_created'
        AND um.billing_cycle_start <= CURRENT_DATE
        AND um.billing_cycle_end >= CURRENT_DATE
      ORDER BY o.created_at DESC
    `;

    const organizations = result.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      subscription_status: row.subscription_status || 'inactive',
      plan_name: row.plan_name || 'Free',
      monthly_limit: parseInt(row.monthly_limit) || 10,
      current_usage: parseInt(row.current_usage) || 0,
      created_at: row.created_at,
    }));

    return NextResponse.json({
      success: true,
      organizations,
    });
  } catch (error) {
    console.error('Organizations fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'webmaster') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name, email } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO app.organizations (name, email, firm_name, contact_email)
      VALUES (${name}, ${email}, ${name}, ${email})
      RETURNING id, name, email, created_at
    `;

    const organization = result[0];

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
        email: organization.email,
        created_at: organization.created_at,
      },
    });
  } catch (error: any) {
    console.error('Organization creation error:', error);

    if (error.message?.includes('unique constraint')) {
      return NextResponse.json(
        { success: false, error: 'An organization with this email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create organization' },
      { status: 500 }
    );
  }
}
