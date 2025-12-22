import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/app/lib/db';

interface CaseNote {
  id: string;
  authorName: string;
  noteBody: string;
  createdAt: string;
}

// GET notes for a case
export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session || !session.user || !['operator', 'webmaster'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const caseId = searchParams.get('caseId');
  const orgId = session.user.orgId;
  const isWebmaster = session.user.role === 'webmaster';
  const userId = session.user.id;

  if (!caseId) {
    return NextResponse.json({ error: 'caseId is required' }, { status: 400 });
  }

  if (!isWebmaster && !orgId) {
    return NextResponse.json({ error: 'Missing organization context' }, { status: 400 });
  }

  try {
    // Verify case access
    const caseCheck = await sql`
      SELECT id, org_id FROM app.cases WHERE id = ${caseId}
      ${!isWebmaster ? sql`AND org_id = ${orgId}` : sql``}
      LIMIT 1
    `;

    if (!caseCheck || caseCheck.length === 0) {
      return NextResponse.json({ error: 'Case not found or not accessible' }, { status: 404 });
    }

    // Get notes
    const notes = await sql`
      SELECT cn.id,
             cn.case_id,
             cn.author_user_id,
             cn.note_body,
             cn.created_at,
             u.name
      FROM app.case_notes cn
      JOIN app.users u ON u.id = cn.author_user_id
      WHERE cn.case_id = ${caseId}
      ORDER BY cn.created_at DESC
      LIMIT 50
    `;

    const mapped: CaseNote[] = notes.map((row: any) => ({
      id: row.id,
      authorName: row.name,
      noteBody: row.note_body,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ success: true, notes: mapped });
  } catch (error) {
    console.error('Error fetching case notes:', error);
    return NextResponse.json({ error: 'Failed to load notes' }, { status: 500 });
  }
}

// POST new note to a case
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session || !session.user || !['operator', 'webmaster'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const caseId = searchParams.get('caseId');
  const orgId = session.user.orgId;
  const isWebmaster = session.user.role === 'webmaster';
  const userId = session.user.id;

  if (!caseId) {
    return NextResponse.json({ error: 'caseId is required' }, { status: 400 });
  }

  if (!isWebmaster && !orgId) {
    return NextResponse.json({ error: 'Missing organization context' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const { noteBody } = (body || {}) as { noteBody?: string };

  if (!noteBody || noteBody.trim() === '') {
    return NextResponse.json({ error: 'Note body is required' }, { status: 400 });
  }

  try {
    // Verify case access
    const caseCheck = await sql`
      SELECT id, org_id FROM app.cases WHERE id = ${caseId}
      ${!isWebmaster ? sql`AND org_id = ${orgId}` : sql``}
      LIMIT 1
    `;

    if (!caseCheck || caseCheck.length === 0) {
      return NextResponse.json({ error: 'Case not found or not accessible' }, { status: 404 });
    }

    // Insert note
    const inserted = await sql`
      INSERT INTO app.case_notes (case_id, author_user_id, note_body)
      VALUES (${caseId}, ${userId}, ${noteBody.trim()})
      RETURNING id, created_at
    `;

    if (!inserted || inserted.length === 0) {
      return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
    }

    const newNote: CaseNote = {
      id: inserted[0].id,
      authorName: session.user.name || 'Unknown',
      noteBody: noteBody.trim(),
      createdAt: inserted[0].created_at,
    };

    return NextResponse.json({ success: true, note: newNote });
  } catch (error) {
    console.error('Error creating case note:', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}
