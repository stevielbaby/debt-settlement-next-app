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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '14'); // Default to 14 days

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

    // Get start date (next business day)
    const getNextBusinessDay = () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const day = tomorrow.getDay();
      if (day === 0) tomorrow.setDate(tomorrow.getDate() + 1); // Sunday -> Monday
      if (day === 6) tomorrow.setDate(tomorrow.getDate() + 2); // Saturday -> Monday
      return tomorrow;
    };

    const startDate = getNextBusinessDay();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days);

    // Check availability for the entire range
    const busySlots = await checkAvailability(
      accessToken,
      calendarSettings.calendar_id,
      startDate.toISOString(),
      endDate.toISOString()
    );

    // Build availability for each day
    const availability: any[] = [];
    const currentDate = new Date(startDate);

    while (currentDate < endDate) {
      // Skip weekends
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const dateString = currentDate.toISOString().split('T')[0];
        
        // Build slots for this day
        const slots = slotTemplate.map((slot: any) => {
          const slotDate = new Date(currentDate);
          slotDate.setHours(slot.hour, slot.minute, 0, 0);
          const slotEnd = new Date(slotDate.getTime() + durationMinutes * 60000);

          // Format time in 12-hour format with AM/PM
          const hour12 = slot.hour === 0 ? 12 : slot.hour > 12 ? slot.hour - 12 : slot.hour;
          const ampm = slot.hour >= 12 ? 'PM' : 'AM';
          const display = `${hour12}:${String(slot.minute).padStart(2, '0')} ${ampm}`;

          // Check if slot is booked
          const isBooked = busySlots.some((busy: any) => {
            const busyStart = new Date(busy.start);
            const busyEnd = new Date(busy.end);
            return slotDate < busyEnd && slotEnd > busyStart;
          });

          return {
            start: slotDate.toISOString(),
            end: slotEnd.toISOString(),
            display: display,
            available: !isBooked
          };
        });

        const availableSlots = slots.filter((s: any) => s.available);
        
        // Only include days with available slots
        if (availableSlots.length > 0) {
          availability.push({
            date: dateString,
            slots: slots,
            availableCount: availableSlots.length
          });
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json({
      success: true,
      timezone,
      availability
    });

  } catch (error: any) {
    console.error('Get multi-day availability error:', error);
    
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

