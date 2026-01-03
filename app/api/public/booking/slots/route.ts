import { NextRequest, NextResponse } from 'next/server';
import { BookingSlotsRequestSchema, BookingSlotsResponseSchema } from '@/lib/schemas/booking';
import { getCurrentFirm } from '@/lib/utils';
import { prisma } from '@/app/lib/db';
import { z } from 'zod';

/**
 * GET /api/public/booking/slots
 *
 * Get available booking time slots based on firm calendar, operator availability,
 * and existing bookings.
 *
 * Query parameters:
 * - start: Start date in YYYY-MM-DD format (required)
 * - days: Number of days to check (optional, default 14, max 30)
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const daysParam = searchParams.get('days');

    // Validate request
    const requestData = {
      start: start || '',
      days: daysParam ? parseInt(daysParam, 10) : 14,
    };

    const validatedRequest = BookingSlotsRequestSchema.parse(requestData);

    // Get the current firm
    const firm = await getCurrentFirm();

    // For now, generate basic time slots without calendar integration
    // TODO: Integrate with Google Calendar and operator booking windows
    const availability = generateBasicAvailability(
      validatedRequest.start,
      validatedRequest.days,
      firm.id
    );

    const response = BookingSlotsResponseSchema.parse({
      success: true,
      availability,
    });

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    console.error('Booking slots error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve booking slots',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Generate basic availability for the given date range
 * This is a placeholder implementation - needs to be replaced with actual
 * calendar integration (Google Calendar + operator booking windows)
 */
async function generateBasicAvailability(
  startDate: string,
  days: number,
  firmId: string
) {
  const availability = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

    // Skip weekends for now (placeholder logic)
    if (date.getDay() === 0 || date.getDay() === 6) {
      availability.push({
        date: dateStr,
        slots: [],
        availableCount: 0,
      });
      continue;
    }

    // Generate 30-minute slots from 9 AM to 5 PM (placeholder)
    const slots = [];
    const startHour = 9;
    const endHour = 17;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, minute, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotStart.getMinutes() + 30);

        // Check if this slot conflicts with existing bookings
        const hasConflict = await checkSlotConflict(firmId, slotStart, slotEnd);

        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          available: !hasConflict,
        });
      }
    }

    const availableCount = slots.filter(slot => slot.available).length;

    availability.push({
      date: dateStr,
      slots,
      availableCount,
    });
  }

  return availability;
}

/**
 * Check if a time slot conflicts with existing bookings
 */
async function checkSlotConflict(
  firmId: string,
  slotStart: Date,
  slotEnd: Date
): Promise<boolean> {
  try {
    // Check for existing bookings that overlap with this slot
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        case: {
          firmId: firmId,
        },
        OR: [
          // Booking starts during our slot
          {
            startAt: {
              gte: slotStart,
              lt: slotEnd,
            },
          },
          // Booking ends during our slot
          {
            endAt: {
              gt: slotStart,
              lte: slotEnd,
            },
          },
          // Booking encompasses our entire slot
          {
            AND: [
              { startAt: { lte: slotStart } },
              { endAt: { gte: slotEnd } },
            ],
          },
        ],
      },
    });

    return !!conflictingBooking;
  } catch (error) {
    // If we can't check the database, assume no conflict for now
    console.error('Error checking slot conflict:', error);
    return false;
  }
}
