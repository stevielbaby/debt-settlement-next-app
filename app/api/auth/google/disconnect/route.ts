import { NextResponse } from 'next/server';
import { sql } from '@/app/lib/db';

export async function POST() {
  try {
    // Delete the Google connection (but keep bookings for history)
    const result = await sql`
      DELETE FROM google_connections WHERE tenant_id = 'default'
      RETURNING id
    `;

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'No connection found' },
        { status: 404 }
      );
    }

    // Also clear calendar settings
    await sql`
      DELETE FROM calendar_settings WHERE tenant_id = 'default'
    `;

    return NextResponse.json({
      success: true,
      message: 'Google Calendar connection removed'
    });

  } catch (error: any) {
    console.error('Disconnect error:', error);
    return NextResponse.json(
      {
        error: 'Failed to disconnect',
        message: error.message
      },
      { status: 500 }
    );
  }
}

