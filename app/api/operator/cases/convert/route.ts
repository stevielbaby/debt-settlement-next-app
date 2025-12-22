import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // @ts-ignore - Extended session properties from auth.d.ts
    const role = session.user.role;
    // @ts-ignore - Extended session properties from auth.d.ts
    const orgId = session.user.orgId;

    // Only operators and webmasters can convert leads
    if (role !== 'operator' && role !== 'webmaster') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { leadId, status = 'new', priority = 'normal' } = body;

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    // Verify lead exists and belongs to operator's org (or if webmaster)
    const leadCheck = await sql`
      SELECT id, org_id, converted, first_name, last_name, email, phone, situation, debt_amount, current_company, case_number
      FROM public.leads
      WHERE id = ${leadId}
      LIMIT 1
    `;

    if (leadCheck.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const lead = leadCheck[0];

    // Check org access
    if (role === 'operator' && lead.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if already converted
    if (lead.converted) {
      return NextResponse.json({ error: 'Lead has already been converted to a case' }, { status: 400 });
    }

    // Generate case number (CASE-XXXXX format)
    const caseNumber = `CASE-${String(lead.case_number).padStart(5, '0')}`;

    // Create case in app.cases
    const newCase = await sql`
      INSERT INTO app.cases (
        case_number,
        org_id,
        lead_id,
        first_name,
        last_name,
        email,
        phone,
        situation,
        debt_amount_range,
        current_company,
        status,
        priority,
        created_at,
        updated_at
      )
      VALUES (
        ${caseNumber},
        ${lead.org_id},
        ${leadId},
        ${lead.first_name},
        ${lead.last_name},
        ${lead.email},
        ${lead.phone},
        ${lead.situation},
        ${lead.debt_amount || null},
        ${lead.current_company || null},
        ${status},
        ${priority},
        NOW(),
        NOW()
      )
      RETURNING id, case_number, status, priority, created_at
    `;

    // Mark lead as converted
    await sql`
      UPDATE public.leads
      SET converted = TRUE, updated_at = NOW()
      WHERE id = ${leadId}
    `;

    return NextResponse.json({
      success: true,
      message: 'Lead converted to case successfully',
      case: newCase[0],
    });
  } catch (error) {
    console.error('Error converting lead to case:', error);
    return NextResponse.json(
      { error: 'Failed to convert lead to case' },
      { status: 500 }
    );
  }
}
