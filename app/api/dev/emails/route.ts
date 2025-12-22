/**
 * Development Email Viewer API
 * Only available in development - shows emails that have been "sent" via dev-email.ts
 * DELETE this endpoint before deploying to production
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSentEmails, clearSentEmails } from '@/lib/dev-email';

export async function GET(request: NextRequest) {
  // SECURITY: Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 404 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  // Allow clearing emails via ?action=clear
  if (action === 'clear') {
    clearSentEmails();
    return NextResponse.json({ message: 'All emails cleared' });
  }

  const emails = getSentEmails();

  return NextResponse.json({
    count: emails.length,
    emails: emails.map(email => ({
      id: email.id,
      to: email.to,
      subject: email.subject,
      type: email.type,
      timestamp: email.timestamp.toISOString(),
      preview: email.textBody.substring(0, 100) + (email.textBody.length > 100 ? '...' : ''),
    })),
    actions: {
      viewAll: '/api/dev/emails',
      clearAll: '/api/dev/emails?action=clear',
    },
  });
}

export async function POST(request: NextRequest) {
  // SECURITY: Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 404 }
    );
  }

  const body = await request.json();

  // Option to clear via POST with action=clear
  if (body.action === 'clear') {
    clearSentEmails();
    return NextResponse.json({ message: 'All emails cleared' });
  }

  return NextResponse.json(
    { error: 'Invalid request. Use GET to view emails.' },
    { status: 400 }
  );
}
