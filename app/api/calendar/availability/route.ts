import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/db';
import { decryptToken, refreshAccessToken, encryptToken } from '@/app/lib/crypto-utils';
import { decryptToken as decryptTokenWithKey } from '@/app/lib/google-utils';

async function checkAvailability(accessToken: string, calendarId: string, timeMin: string, timeMax: string) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to check availability');
  }

  const data = await response.json();
  const events = data.items || [];

  // Filter events within the requested time range
  const busySlots = events
    .filter((event: any) => {
      if (!event.start || !event.end) return false;
      const eventStart = new Date(event.start.dateTime || event.start.date);
      const eventEnd = new Date(event.end.dateTime || event.end.date);
      return eventStart < new Date(timeMax) && eventEnd > new Date(timeMin);
    })
    .map((event: any) => ({
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      summary: event.summary
    }));

  return busySlots;
}

export async function POST(request: NextRequest) {
  try {
    const { date } = await request.json();

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    // Get calendar settings
    const settings = await sql`
      SELECT * FROM calendar_settings WHERE tenant_id = 'default'
    `;

    if (!settings || settings.length === 0) {
      return NextResponse.json(
        {
          error: 'Calendar not connected',
          message: 'Scheduling is temporarily unavailable—please call the intake line.'
        },
        { status: 404 }
      );
    }

    const calendarSettings = settings[0] as any;

    // Get Google connection
    const connections = await sql`
      SELECT * FROM google_connections WHERE tenant_id = 'default'
    `;

    if (!connections || connections.length === 0) {
      return NextResponse.json(
        {
          error: 'Google connection not found',
          message: 'Scheduling is temporarily unavailable—please call the intake line.'
        },
        { status: 404 }
      );
    }

    const connection = connections[0] as any;
    const decryptedRefresh = decryptToken(connection.refresh_token_encrypted);
    let accessToken = decryptToken(connection.access_token_encrypted);

    // Get Google credentials from database or env for token refresh
    const masterKey = process.env.ENCRYPTION_KEY || 'default-master-key-change-in-production';
    let GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    let GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

    try {
      const configResult = await sql`
        SELECT * FROM setup_config WHERE tenant_id = 'default'
      `;
      if (configResult.length > 0) {
        const config = configResult[0] as any;
        const decryptedClientId = decryptTokenWithKey(config.client_id_encrypted, masterKey);
        const decryptedClientSecret = decryptTokenWithKey(config.client_secret_encrypted, masterKey);
        if (decryptedClientId) GOOGLE_CLIENT_ID = decryptedClientId;
        if (decryptedClientSecret) GOOGLE_CLIENT_SECRET = decryptedClientSecret;
      }
    } catch (err: any) {
      console.log('Database lookup failed, using env vars:', err.message);
    }

    // Refresh token if expired
    if (connection.expires_at && new Date(connection.expires_at) < new Date()) {
      accessToken = await refreshAccessToken(decryptedRefresh, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
      const encryptedAccess = encryptToken(accessToken);
      
      await sql`
        UPDATE google_connections 
        SET access_token_encrypted = ${encryptedAccess}, expires_at = NOW() + INTERVAL '3600 seconds'
        WHERE tenant_id = 'default'
      `;
    }

    // Parse slot template
    const slotTemplate = JSON.parse(calendarSettings.slot_template_json as string);
    const timezone = calendarSettings.timezone;
    const durationMinutes = calendarSettings.duration_minutes;

    // Build the list of potential slots for the given date
    const selectedDate = new Date(date);
    const slots = slotTemplate.map((slot: any) => {
      const slotDate = new Date(selectedDate);
      slotDate.setHours(slot.hour, slot.minute, 0, 0);
      const slotEnd = new Date(slotDate.getTime() + durationMinutes * 60000);

      // Format time in 12-hour format with AM/PM
      const hour12 = slot.hour === 0 ? 12 : slot.hour > 12 ? slot.hour - 12 : slot.hour;
      const ampm = slot.hour >= 12 ? 'PM' : 'AM';
      const display = `${hour12}:${String(slot.minute).padStart(2, '0')} ${ampm}`;

      return {
        start: slotDate.toISOString(),
        end: slotEnd.toISOString(),
        display: display
      };
    });

    // Check availability for the entire day
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    const busySlots = await checkAvailability(
      accessToken,
      calendarSettings.calendar_id,
      dayStart.toISOString(),
      dayEnd.toISOString()
    );

    // Determine which slots are available
    const availableSlots = slots.map((slot: any) => {
      const isBooked = busySlots.some((busy: any) => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        const slotStart = new Date(slot.start);
        const slotEnd = new Date(slot.end);

        // Check for overlap
        return slotStart < busyEnd && slotEnd > busyStart;
      });

      return {
        ...slot,
        available: !isBooked
      };
    });

    return NextResponse.json({
      success: true,
      date,
      timezone,
      slots: availableSlots,
      busyCount: busySlots.length
    });

  } catch (error: any) {
    console.error('Get availability error:', error);
    
    // Provide specific error messages
    let errorMessage = 'Failed to check availability';
    let statusCode = 500;

    if (error.message?.includes('Failed to decrypt token')) {
      errorMessage = 'Authentication error. Please reconnect your Google Calendar.';
      statusCode = 401;
    } else if (error.message?.includes('Failed to refresh token')) {
      errorMessage = 'Session expired. Please reconnect your Google Calendar.';
      statusCode = 401;
    } else if (error.message?.includes('Failed to check availability')) {
      errorMessage = 'Unable to access Google Calendar. Please check your connection.';
      statusCode = 503;
    } else if (error.message?.includes('credentials not configured')) {
      errorMessage = 'Google Calendar is not configured. Please complete the setup wizard.';
      statusCode = 500;
    }

    return NextResponse.json(
      {
        error: errorMessage,
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: statusCode }
    );
  }
}

