import { NextRequest, NextResponse } from 'next/server';
import { BookingConfirmationResponseSchema } from '@/lib/schemas/booking';
import { getCurrentFirm } from '@/lib/utils';
import { prisma } from '@/app/lib/db';

/**
 * GET /api/public/booking/:bookingId
 *
 * Retrieve booking details for confirmation page display.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;

    // Validate bookingId is a valid UUID
    if (!bookingId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_BOOKING_ID',
            message: 'Invalid booking ID format',
          },
        },
        { status: 400 }
      );
    }

    // Get the current firm
    const firm = await getCurrentFirm();

    // Find the booking with associated case and lead info
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        case: {
          firmId: firm.id,
        },
      },
      include: {
        case: {
          include: {
            lead: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BOOKING_NOT_FOUND',
            message: 'Booking not found',
          },
        },
        { status: 404 }
      );
    }

    const response = BookingConfirmationResponseSchema.parse({
      success: true,
      bookingId: booking.id,
      leadId: booking.case.leadId,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      status: booking.status,
      confirmedAt: booking.createdAt.toISOString(), // Using createdAt as confirmedAt for now
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Booking confirmation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve booking details',
        },
      },
      { status: 500 }
    );
  }
}
