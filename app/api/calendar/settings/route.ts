import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/db';

export async function GET() {
  try {
    const result = await sql`
      SELECT * FROM calendar_settings WHERE tenant_id = 'default'
    `;

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'No calendar settings found' },
        { status: 404 }
      );
    }

    const settings = result[0];
    return NextResponse.json({
      success: true,
      settings: {
        id: settings.id,
        calendarId: settings.calendar_id,
        timezone: settings.timezone,
        durationMinutes: settings.duration_minutes,
        slotTemplate: JSON.parse(settings.slot_template_json as string)
      }
    });

  } catch (error: any) {
    console.error('Get calendar settings error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get calendar settings',
        message: error.message
      },
      { status: 500 }
    );
  }
}

// Valid timezones list (common US timezones and UTC)
const VALID_TIMEZONES = [
  'America/Phoenix', 'America/Denver', 'America/Chicago', 
  'America/New_York', 'America/Los_Angeles', 'UTC'
];

function validateTimezone(timezone: string): boolean {
  try {
    // Check if it's in our list
    if (VALID_TIMEZONES.includes(timezone)) {
      return true;
    }
    // Also check if it's a valid IANA timezone by trying to create a date
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

function validateSlotTemplate(slotTemplate: any): { valid: boolean; error?: string } {
  if (!Array.isArray(slotTemplate)) {
    return { valid: false, error: 'Slot template must be an array' };
  }

  if (slotTemplate.length === 0) {
    return { valid: false, error: 'At least one time slot is required' };
  }

  if (slotTemplate.length > 20) {
    return { valid: false, error: 'Maximum 20 time slots allowed' };
  }

  for (let i = 0; i < slotTemplate.length; i++) {
    const slot = slotTemplate[i];
    
    if (!slot || typeof slot !== 'object') {
      return { valid: false, error: `Slot ${i + 1} must be an object` };
    }

    if (typeof slot.hour !== 'number' || slot.hour < 0 || slot.hour > 23) {
      return { valid: false, error: `Slot ${i + 1}: hour must be between 0 and 23` };
    }

    if (typeof slot.minute !== 'number' || slot.minute < 0 || slot.minute > 59) {
      return { valid: false, error: `Slot ${i + 1}: minute must be between 0 and 59` };
    }
  }

  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    const { calendarId, timezone, durationMinutes, slotTemplate } = await request.json();

    // Validate calendar ID
    if (!calendarId || typeof calendarId !== 'string' || calendarId.trim().length === 0) {
      return NextResponse.json(
        { error: 'Calendar ID is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Validate timezone
    const finalTimezone = timezone || 'America/Phoenix';
    if (!validateTimezone(finalTimezone)) {
      return NextResponse.json(
        { error: `Invalid timezone: ${finalTimezone}. Please use a valid IANA timezone.` },
        { status: 400 }
      );
    }

    // Validate duration
    const finalDuration = durationMinutes || 60;
    if (typeof finalDuration !== 'number' || finalDuration < 15 || finalDuration > 180) {
      return NextResponse.json(
        { error: 'Duration must be between 15 and 180 minutes' },
        { status: 400 }
      );
    }

    // Validate slot template
    const finalSlotTemplate = slotTemplate || [];
    const slotValidation = validateSlotTemplate(finalSlotTemplate);
    if (!slotValidation.valid) {
      return NextResponse.json(
        { error: slotValidation.error || 'Invalid slot template format' },
        { status: 400 }
      );
    }

    // Verify calendar exists (optional check - could verify against Google API)
    // For now, we'll just save it and let the availability check fail if invalid

    // Save or update calendar settings
    const result = await sql`
      INSERT INTO calendar_settings (tenant_id, calendar_id, timezone, duration_minutes, slot_template_json)
      VALUES ('default', ${calendarId}, ${finalTimezone}, ${finalDuration}, ${JSON.stringify(finalSlotTemplate)})
      ON CONFLICT (tenant_id) DO UPDATE 
      SET calendar_id = EXCLUDED.calendar_id,
          timezone = EXCLUDED.timezone,
          duration_minutes = EXCLUDED.duration_minutes,
          slot_template_json = EXCLUDED.slot_template_json,
          updated_at = NOW()
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      settings: result[0]
    });

  } catch (error: any) {
    console.error('Save calendar settings error:', error);
    return NextResponse.json(
      {
        error: 'Failed to save calendar settings',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

