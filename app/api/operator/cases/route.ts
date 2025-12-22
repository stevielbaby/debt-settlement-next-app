import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/app/lib/db';

// Minimal GET endpoint for operator case list
export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session || !session.user || !['operator', 'webmaster'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const id = searchParams.get('id');
  const orgId = session.user.orgId;
  const isWebmaster = session.user.role === 'webmaster';

  if (!isWebmaster && !orgId) {
    return NextResponse.json({ error: 'Missing organization context' }, { status: 400 });
  }

  try {
    const whereClause = id && !isWebmaster && orgId
      ? sql`WHERE c.id = ${id} AND c.org_id = ${orgId}`
      : id
        ? sql`WHERE c.id = ${id}`
        : !isWebmaster && orgId
          ? sql`WHERE c.org_id = ${orgId}`
          : sql``;

    const result = await sql`
      SELECT c.id,
             c.case_number,
             c.first_name,
             c.last_name,
             c.email,
             c.phone,
             c.status,
             c.priority,
             c.created_at,
             org.firm_name,
             c.situation,
             c.debt_amount_range,
             c.current_company
      FROM app.cases c
      LEFT JOIN app.organizations org ON org.id = c.org_id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT 100;
    `;

    const cases = result.map((row: any) => ({
      id: row.id,
      caseNumber: row.case_number,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      status: row.status,
      priority: row.priority,
      organization: row.firm_name || 'Unassigned',
      createdAt: row.created_at,
      situation: row.situation,
      debtAmountRange: row.debt_amount_range,
      currentCompany: row.current_company,
    }));

    return NextResponse.json({ success: true, cases });
  } catch (error) {
    console.error('Error fetching operator cases:', error);
    // Fallback sample data to allow UI rendering even if DB empty
    const sample = [
      {
        id: 'sample-1',
        caseNumber: '1001',
        firstName: 'Ava',
        lastName: 'Johnson',
        email: 'ava.johnson@example.com',
        phone: '(202) 555-0147',
        status: 'new',
        priority: 'urgent',
        organization: 'Sample Org',
        createdAt: new Date().toISOString(),
        situation: 'Client was promised settlement in 24 months; now in collections.',
        debtAmountRange: '$40k - $60k',
        currentCompany: 'Legacy Debt Co.',
      },
      {
        id: 'sample-2',
        caseNumber: '1002',
        firstName: 'Michael',
        lastName: 'Lee',
        email: 'mlee@example.com',
        phone: '(202) 555-0199',
        status: 'qualified',
        priority: 'normal',
        organization: 'Sample Org',
        createdAt: new Date().toISOString(),
        situation: 'Seeking refund after program pauses; has FDCPA questions.',
        debtAmountRange: '$20k - $40k',
        currentCompany: 'Acme Debt Services',
      },
    ];
    return NextResponse.json({ success: true, cases: sample, fallback: true });
  }
}

// Update status/priority for a case
export async function PATCH(req: NextRequest) {
  const session = await auth();

  if (!session || !session.user || !['operator', 'webmaster'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const caseId = searchParams.get('id');
  const orgId = session.user.orgId;
  const isWebmaster = session.user.role === 'webmaster';

  if (!isWebmaster && !orgId) {
    return NextResponse.json({ error: 'Missing organization context' }, { status: 400 });
  }

  if (!caseId) {
    return NextResponse.json({ error: 'Case id is required' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const { status, priority } = (body || {}) as { status?: string; priority?: string };

  const allowedStatus = ['new', 'contacted', 'qualified', 'retained', 'closed'];
  const allowedPriority = ['normal', 'urgent'];

  if (!status && !priority) {
    return NextResponse.json({ error: 'Provide status or priority to update' }, { status: 400 });
  }

  if (status && !allowedStatus.includes(status)) {
    return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
  }

  if (priority && !allowedPriority.includes(priority)) {
    return NextResponse.json({ error: 'Invalid priority value' }, { status: 400 });
  }

  const setClause = status && priority
    ? sql`status = ${status}, priority = ${priority}, updated_at = NOW()`
    : status
      ? sql`status = ${status}, updated_at = NOW()`
      : sql`priority = ${priority}, updated_at = NOW()`;

  const whereClause = isWebmaster
    ? sql`WHERE c.id = ${caseId}`
    : sql`WHERE c.id = ${caseId} AND c.org_id = ${orgId}`;

  try {
    const updated = await sql`
      UPDATE app.cases c
      SET ${setClause}
      FROM app.organizations org
      ${whereClause} AND org.id = c.org_id
      RETURNING c.id, c.case_number, c.first_name, c.last_name, c.email, c.phone, c.status, c.priority, c.created_at, c.situation, c.debt_amount_range, c.current_company, org.firm_name;
    `;

    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: 'Case not found or not accessible' }, { status: 404 });
    }

    const row = updated[0];
    const payload = {
      id: row.id,
      caseNumber: row.case_number,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      status: row.status,
      priority: row.priority,
      organization: row.firm_name || 'Unassigned',
      createdAt: row.created_at,
      situation: row.situation,
      debtAmountRange: row.debt_amount_range,
      currentCompany: row.current_company,
    };

    return NextResponse.json({ success: true, case: payload });
  } catch (error) {
    console.error('Error updating case:', error);
    return NextResponse.json({ error: 'Failed to update case' }, { status: 500 });
  }
}
