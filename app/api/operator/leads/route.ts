import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // @ts-ignore - Extended session properties from auth.d.ts
    const role = session.user.role;
    // @ts-ignore - Extended session properties from auth.d.ts
    const orgId = session.user.orgId;

    // Only operators and webmasters can access leads
    if (role !== 'operator' && role !== 'webmaster') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Webmasters can see all leads, operators see only their org
    let leads;
    if (role === 'webmaster') {
      leads = await sql`
        SELECT 
          l.id,
          l.case_number,
          l.first_name,
          l.last_name,
          l.email,
          l.phone,
          l.situation,
          l.debt_amount,
          l.current_company,
          l.converted,
          l.created_at,
          l.updated_at,
          o.firm_name as organization
        FROM public.leads l
        LEFT JOIN app.organizations o ON l.org_id = o.id
        WHERE l.converted = FALSE
        ORDER BY l.created_at DESC
      `;
    } else {
      leads = await sql`
        SELECT 
          l.id,
          l.case_number,
          l.first_name,
          l.last_name,
          l.email,
          l.phone,
          l.situation,
          l.debt_amount,
          l.current_company,
          l.converted,
          l.created_at,
          l.updated_at,
          o.firm_name as organization
        FROM public.leads l
        LEFT JOIN app.organizations o ON l.org_id = o.id
        WHERE l.org_id = ${orgId} AND l.converted = FALSE
        ORDER BY l.created_at DESC
      `;
    }

    return NextResponse.json({
      success: true,
      leads,
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}
