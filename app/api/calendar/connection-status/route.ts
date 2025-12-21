import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/db';

export async function GET() {
  try {
    // Get Google connection status
    const connections = await sql`
      SELECT account_email, created_at FROM google_connections WHERE tenant_id = 'default'
    `;

    const hasConnection = connections && connections.length > 0;

    // Get calendar settings if connected
    let settings = null;
    if (hasConnection) {
      const settingsResult = await sql`
        SELECT calendar_id, timezone, duration_minutes, slot_template_json FROM calendar_settings WHERE tenant_id = 'default'
      `;
      if (settingsResult && settingsResult.length > 0) {
        settings = settingsResult[0];
      }
    }

    return NextResponse.json({
      success: true,
      connected: hasConnection,
      accountEmail: hasConnection ? connections[0].account_email : undefined,
      connectedAt: hasConnection ? connections[0].created_at : undefined,
      settings: settings ? {
        calendarId: settings.calendar_id,
        timezone: settings.timezone,
        durationMinutes: settings.duration_minutes,
        slotTemplate: JSON.parse(settings.slot_template_json as string)
      } : null
    });

  } catch (error: any) {
    console.error('Get status error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get status',
        message: error.message
      },
      { status: 500 }
    );
  }
}

