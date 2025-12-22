import { auth } from '@/auth';
import { sql } from '@/app/lib/db';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'webmaster') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const orgResult = await sql`
      SELECT 
        o.id,
        o.name,
        o.email,
        o.contact_name,
        o.phone,
        o.address,
        os.status as subscription_status,
        sp.name as plan_name,
        sp.monthly_limit,
        COALESCE(um.current_month_count, 0) as current_usage,
        o.created_at
      FROM app.organizations o
      LEFT JOIN app.organization_subscriptions os ON o.id = os.organization_id
      LEFT JOIN app.subscription_plans sp ON os.plan_id = sp.id
      LEFT JOIN app.usage_metrics um ON o.id = um.organization_id 
        AND um.metric_name = 'case_created'
        AND um.month_year = to_char(CURRENT_DATE, 'YYYY-MM')
      WHERE o.id = ${id}
    `;

    if (orgResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    const orgRow = orgResult[0];
    const organization = {
      id: orgRow.id,
      name: orgRow.name,
      email: orgRow.email,
      contact_name: orgRow.contact_name,
      phone: orgRow.phone,
      address: orgRow.address,
      subscription_status: orgRow.subscription_status || 'inactive',
      plan_name: orgRow.plan_name || 'Free',
      monthly_limit: parseInt(orgRow.monthly_limit) || 10,
      current_usage: parseInt(orgRow.current_usage) || 0,
      created_at: orgRow.created_at,
    };

    // Get users
    const usersResult = await sql`
      SELECT id, email, role, created_at
      FROM app.users
      WHERE organization_id = ${id}
      ORDER BY created_at DESC
    `;

    const users = usersResult.map((row: any) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      created_at: row.created_at,
    }));

    return NextResponse.json({
      success: true,
      organization,
      users,
    });
  } catch (error) {
    console.error('Organization detail error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organization' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'webmaster') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, email, contact_name, phone, address } = body;

    const result = await sql`
      UPDATE app.organizations
      SET name = COALESCE(${name}, name),
          email = COALESCE(${email}, email),
          contact_name = COALESCE(${contact_name}, contact_name),
          phone = COALESCE(${phone}, phone),
          address = COALESCE(${address}, address)
      WHERE id = ${id}
      RETURNING id, name, email, contact_name, phone, address, created_at
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    const organization = result[0];

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
        email: organization.email,
        contact_name: organization.contact_name,
        phone: organization.phone,
        address: organization.address,
        created_at: organization.created_at,
      },
    });
  } catch (error: any) {
    console.error('Organization update error:', error);

    if (error.message?.includes('unique constraint')) {
      return NextResponse.json(
        { success: false, error: 'An organization with this email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update organization' },
      { status: 500 }
    );
  }
}
