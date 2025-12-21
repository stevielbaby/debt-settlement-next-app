import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/db';
import { decryptToken, refreshAccessToken, encryptToken } from '@/app/lib/crypto-utils';
import { decryptToken as decryptTokenWithKey } from '@/app/lib/google-utils';

async function createGoogleEvent(accessToken: string, calendarId: string, eventData: any) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventData)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create event: ${error}`);
  }

  const event = await response.json();
  return event;
}

async function checkSlotAvailability(accessToken: string, calendarId: string, slotStart: string, slotEnd: string) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(slotStart)}&timeMax=${encodeURIComponent(slotEnd)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to check slot availability');
  }

  const data = await response.json();
  const events = data.items || [];

  // Check if any event overlaps with the requested slot
  const isAvailable = !events.some((event: any) => {
    if (!event.start || !event.end) return false;
    const eventStart = new Date(event.start.dateTime || event.start.date);
    const eventEnd = new Date(event.end.dateTime || event.end.date);
    const reqStart = new Date(slotStart);
    const reqEnd = new Date(slotEnd);
    return eventStart < reqEnd && eventEnd > reqStart;
  });

  return isAvailable;
}

export async function POST(request: NextRequest) {
  try {
    const { caseId, clientName, clientEmail, slotStart, slotEnd, notes } = await request.json();

    if (!caseId || !clientName || !slotStart || !slotEnd) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get calendar settings
    const settings = await sql`
      SELECT * FROM calendar_settings WHERE tenant_id = 'default'
    `;

    if (!settings || settings.length === 0) {
      return NextResponse.json(
        { error: 'Calendar not configured' },
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
        { error: 'Google connection not found' },
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

    // Double-check availability before booking (race condition protection)
    const isAvailable = await checkSlotAvailability(
      accessToken,
      calendarSettings.calendar_id,
      slotStart,
      slotEnd
    );

    if (!isAvailable) {
      return NextResponse.json(
        {
          error: 'Slot no longer available',
          message: 'This time slot was just booked. Please select another time.'
        },
        { status: 409 }
      );
    }

    // Create Google Calendar event
    const eventData: any = {
      summary: `1-on-1 Consultation — ${caseId}`,
      description: `Client: ${clientName}\nCase ID: ${caseId}\n${notes ? `Notes: ${notes}` : ''}`,
      start: {
        dateTime: slotStart,
        timeZone: calendarSettings.timezone
      },
      end: {
        dateTime: slotEnd,
        timeZone: calendarSettings.timezone
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'email', minutes: 60 }
        ]
      }
    };

    if (clientEmail) {
      eventData.attendees = [
        {
          email: clientEmail,
          responseStatus: 'needsAction'
        }
      ];
    }

    const googleEvent = await createGoogleEvent(accessToken, calendarSettings.calendar_id, eventData);

    // Save booking to database
    const booking = await sql`
      INSERT INTO bookings (tenant_id, case_id, client_name, client_email, slot_start, slot_end, calendar_id, google_event_id, notes, status)
      VALUES ('default', ${caseId}, ${clientName}, ${clientEmail || null}, ${slotStart}, ${slotEnd}, ${calendarSettings.calendar_id}, ${googleEvent.id}, ${notes || null}, 'confirmed')
      RETURNING *
    `;

    // Update the lead record with appointment information
    // Extract case number from caseId (could be "CASE-1234" or just "1234")
    const caseNumberStr = caseId.toString().replace(/^CASE-?/i, '');
    const caseNumber = parseInt(caseNumberStr);
    
    if (!isNaN(caseNumber)) {
      try {
        // Format time in 12-hour format
        const slotStartDate = new Date(slotStart);
        const hour12 = slotStartDate.getHours() === 0 ? 12 : slotStartDate.getHours() > 12 ? slotStartDate.getHours() - 12 : slotStartDate.getHours();
        const ampm = slotStartDate.getHours() >= 12 ? 'PM' : 'AM';
        const formattedTime = `${hour12}:${String(slotStartDate.getMinutes()).padStart(2, '0')} ${ampm}`;
        const appointmentDate = slotStart.split('T')[0];
        
        // Try to update leads table with appointment info
        // First check if appointment columns exist, if not, we'll handle gracefully
        await sql`
          UPDATE leads 
          SET 
            appointment_slot_start = ${slotStart}::timestamp,
            appointment_slot_end = ${slotEnd}::timestamp,
            appointment_date = ${appointmentDate}::date,
            appointment_time = ${formattedTime},
            updated_at = NOW()
          WHERE case_number = ${caseNumber}
        `;
      } catch (updateError: any) {
        // If columns don't exist, try to add them
        if (updateError.message && updateError.message.includes('column')) {
          console.log('Appointment columns may not exist, attempting to add them...');
          try {
            await sql`
              ALTER TABLE leads 
              ADD COLUMN IF NOT EXISTS appointment_slot_start TIMESTAMP,
              ADD COLUMN IF NOT EXISTS appointment_slot_end TIMESTAMP,
              ADD COLUMN IF NOT EXISTS appointment_date DATE,
              ADD COLUMN IF NOT EXISTS appointment_time VARCHAR(50),
              ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
            `;
            
            // Format time in 12-hour format
            const slotStartDate = new Date(slotStart);
            const hour12 = slotStartDate.getHours() === 0 ? 12 : slotStartDate.getHours() > 12 ? slotStartDate.getHours() - 12 : slotStartDate.getHours();
            const ampm = slotStartDate.getHours() >= 12 ? 'PM' : 'AM';
            const formattedTime = `${hour12}:${String(slotStartDate.getMinutes()).padStart(2, '0')} ${ampm}`;
            const appointmentDate = slotStart.split('T')[0];
            
            // Retry the update
            await sql`
              UPDATE leads 
              SET 
                appointment_slot_start = ${slotStart}::timestamp,
                appointment_slot_end = ${slotEnd}::timestamp,
                appointment_date = ${appointmentDate}::date,
                appointment_time = ${formattedTime},
                updated_at = NOW()
              WHERE case_number = ${caseNumber}
            `;
          } catch (alterError: any) {
            console.error('Error adding appointment columns or updating lead:', alterError);
            // Continue even if update fails - booking is still created
          }
        } else {
          console.error('Error updating lead with appointment info:', updateError);
          // Continue even if update fails - booking is still created
        }
      }
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking[0].id,
        caseId: booking[0].case_id,
        clientName: booking[0].client_name,
        slotStart: booking[0].slot_start,
        slotEnd: booking[0].slot_end,
        googleEventId: booking[0].google_event_id,
        status: booking[0].status
      },
      message: 'Appointment booked successfully! Calendar invite sent.'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Schedule booking error:', error);

    // If it's a conflict error, return 409
    if (error.message && (error.message.includes('duplicate key') || error.message.includes('UNIQUE'))) {
      return NextResponse.json(
        {
          error: 'Slot already booked',
          message: 'This time slot was just booked. Please select another time.'
        },
        { status: 409 }
      );
    }

    // Provide specific error messages
    let errorMessage = 'Failed to create booking';
    let statusCode = 500;

    if (error.message?.includes('Failed to decrypt token')) {
      errorMessage = 'Authentication error. Please reconnect your Google Calendar.';
      statusCode = 401;
    } else if (error.message?.includes('Failed to refresh token')) {
      errorMessage = 'Session expired. Please reconnect your Google Calendar.';
      statusCode = 401;
    } else if (error.message?.includes('Failed to create event')) {
      errorMessage = 'Unable to create calendar event. Please try again or contact support.';
      statusCode = 503;
    } else if (error.message?.includes('credentials not configured')) {
      errorMessage = 'Google Calendar is not configured. Please complete the setup wizard.';
      statusCode = 500;
    } else if (error.message?.includes('Slot no longer available')) {
      errorMessage = 'This time slot was just booked. Please select another time.';
      statusCode = 409;
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

