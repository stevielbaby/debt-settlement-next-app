import { NextRequest, NextResponse } from 'next/server';
import { BookingCreateRequestSchema, BookingCreateResponseSchema } from '@/lib/schemas/booking';
import { getCurrentFirm, normalizeEmail } from '@/lib/utils';
import { prisma } from '@/app/lib/db';
import { z } from 'zod';

/**
 * POST /api/public/booking/create
 *
 * Create a 30-minute consultation booking for an existing lead.
 * Requires valid lead ID and available time slot.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = BookingCreateRequestSchema.parse(body);

    // Get the current firm
    const firm = await getCurrentFirm();

    // Verify the lead exists and belongs to this firm
    const lead = await prisma.lead.findFirst({
      where: {
        id: validatedData.leadId,
        firmId: firm.id,
      },
    });

    if (!lead) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'LEAD_NOT_FOUND',
            message: 'Lead not found or does not exist',
          },
        },
        { status: 404 }
      );
    }

    // Check if lead can be booked (not already converted to case)
    const existingCase = await prisma.case.findFirst({
      where: {
        leadId: lead.id,
        firmId: firm.id,
      },
    });

    if (existingCase) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'LEAD_ALREADY_CONVERTED',
            message: 'This lead has already been converted to a case',
          },
        },
        { status: 409 }
      );
    }

    // Parse the requested time slot
    const startAt = new Date(validatedData.startAt);
    const endAt = new Date(validatedData.endAt);

    // Validate slot duration (must be exactly 30 minutes)
    const durationMs = endAt.getTime() - startAt.getTime();
    const thirtyMinutesMs = 30 * 60 * 1000;

    if (durationMs !== thirtyMinutesMs) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_SLOT_DURATION',
            message: 'Booking slots must be exactly 30 minutes',
          },
        },
        { status: 400 }
      );
    }

    // Check if the slot is in the past
    if (startAt <= new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SLOT_IN_PAST',
            message: 'Cannot book appointments in the past',
          },
        },
        { status: 400 }
      );
    }

    // Create a case for this lead first (required by current schema)
    // TODO: Consider updating schema to allow bookings directly on leads
    const caseNumber = await getNextCaseNumber(firm.id);

    const caseRecord = await prisma.case.create({
      data: {
        firmId: firm.id,
        leadId: lead.id,
        email: lead.email,
        caseNumber: caseNumber,
      },
    });

    // Check for conflicting bookings atomically
    // Use a transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Check if any booking conflicts with this time slot
      const conflictingBooking = await tx.booking.findFirst({
        where: {
          case: {
            firmId: firm.id,
          },
          OR: [
            // New booking starts during existing booking
            {
              startAt: {
                lte: startAt,
              },
              endAt: {
                gt: startAt,
              },
            },
            // New booking ends during existing booking
            {
              startAt: {
                lt: endAt,
              },
              endAt: {
                gte: endAt,
              },
            },
            // New booking completely encompasses existing booking
            {
              startAt: {
                gte: startAt,
              },
              endAt: {
                lte: endAt,
              },
            },
          ],
        },
      });

      if (conflictingBooking) {
        throw new Error('SLOT_NOT_AVAILABLE');
      }

      // Create the booking
      const booking = await tx.booking.create({
        data: {
          caseId: caseRecord.id,
          startAt: startAt,
          endAt: endAt,
          status: 'RESERVED',
        },
      });

      return booking;
    });

    const response = BookingCreateResponseSchema.parse({
      success: true,
      bookingId: result.id,
      startAt: result.startAt.toISOString(),
      endAt: result.endAt.toISOString(),
      status: result.status,
    });

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'SLOT_NOT_AVAILABLE') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SLOT_NOT_AVAILABLE',
            message: 'This time slot is no longer available',
          },
        },
        { status: 409 }
      );
    }

    console.error('Booking creation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create booking',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Get the next case number for a firm (transaction-safe)
 */
async function getNextCaseNumber(firmId: string): Promise<number> {
  // Use FirmCounter for transaction-safe numbering
  const result = await prisma.firmCounter.update({
    where: { firmId },
    data: {
      nextCaseNumber: {
        increment: 1,
      },
    },
    select: {
      nextCaseNumber: true,
    },
  });

  // Return the incremented value (which is the number to use for this case)
  return result.nextCaseNumber;
}
