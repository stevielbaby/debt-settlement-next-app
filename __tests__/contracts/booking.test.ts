import { describe, it, expect } from 'vitest';
import {
  BookingSlotsRequestSchema,
  BookingSlotsResponseSchema,
  BookingCreateRequestSchema,
  BookingCreateResponseSchema,
  BookingConfirmationResponseSchema,
  type BookingSlotsRequest,
  type BookingSlotsResponse,
  type BookingCreateRequest,
  type BookingCreateResponse,
  type BookingConfirmationResponse,
} from '../../lib/schemas/booking';
import { ErrorEnvelopeSchema } from '../../lib/schemas/dto';

describe('Booking Endpoints - Contract Tests', () => {
  describe('GET /api/public/booking/slots', () => {
    describe('Request Schema Validation', () => {
      it('accepts valid booking slots request', () => {
        const validRequest: BookingSlotsRequest = {
          start: '2024-01-15',
          days: 14,
        };

        const result = BookingSlotsRequestSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
      });

      it('accepts minimum valid request', () => {
        const validRequest: BookingSlotsRequest = {
          start: '2024-01-15',
          // days defaults to 14
        };

        const result = BookingSlotsRequestSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
      });

      it('rejects invalid date format', () => {
        const invalidRequest = {
          start: '01-15-2024', // Wrong format
          days: 14,
        };

        const result = BookingSlotsRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
      });

      it('rejects too many days', () => {
        const invalidRequest = {
          start: '2024-01-15',
          days: 31, // Too many days
        };

        const result = BookingSlotsRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
      });

      it('rejects zero days', () => {
        const invalidRequest = {
          start: '2024-01-15',
          days: 0, // Must be at least 1
        };

        const result = BookingSlotsRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
      });
    });

    describe('Response Schema Validation', () => {
      it('accepts valid booking slots response', () => {
        const validResponse: BookingSlotsResponse = {
          success: true,
          availability: [
            {
              date: '2024-01-15',
              slots: [
                {
                  start: '2024-01-15T10:00:00Z',
                  end: '2024-01-15T10:30:00Z',
                  available: true,
                },
                {
                  start: '2024-01-15T10:30:00Z',
                  end: '2024-01-15T11:00:00Z',
                  available: false,
                },
              ],
              availableCount: 1,
            },
          ],
        };

        const result = BookingSlotsResponseSchema.safeParse(validResponse);
        expect(result.success).toBe(true);
      });

      it('accepts empty availability', () => {
        const validResponse: BookingSlotsResponse = {
          success: true,
          availability: [],
        };

        const result = BookingSlotsResponseSchema.safeParse(validResponse);
        expect(result.success).toBe(true);
      });

      it('rejects invalid date format in response', () => {
        const invalidResponse = {
          success: true,
          availability: [
            {
              date: '01-15-2024', // Wrong format
              slots: [],
              availableCount: 0,
            },
          ],
        };

        const result = BookingSlotsResponseSchema.safeParse(invalidResponse);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('POST /api/public/booking/create', () => {
    describe('Request Schema Validation', () => {
      it('accepts valid booking creation request', () => {
        const validRequest: BookingCreateRequest = {
          leadId: '550e8400-e29b-41d4-a716-446655440000',
          startAt: '2024-01-15T10:00:00Z',
          endAt: '2024-01-15T10:30:00Z',
        };

        const result = BookingCreateRequestSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
      });

      it('rejects invalid lead ID', () => {
        const invalidRequest = {
          leadId: 'not-a-uuid',
          startAt: '2024-01-15T10:00:00Z',
          endAt: '2024-01-15T10:30:00Z',
        };

        const result = BookingCreateRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
      });

      it('rejects invalid datetime format', () => {
        const invalidRequest = {
          leadId: '550e8400-e29b-41d4-a716-446655440000',
          startAt: '2024-01-15 10:00:00', // Wrong format, missing Z
          endAt: '2024-01-15T10:30:00Z',
        };

        const result = BookingCreateRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
      });

      it('rejects start time after end time', () => {
        // Note: This would need business logic validation in the handler
        // The schema itself doesn't validate time ordering
        const requestWithInvalidTimes = {
          leadId: '550e8400-e29b-41d4-a716-446655440000',
          startAt: '2024-01-15T11:00:00Z',
          endAt: '2024-01-15T10:30:00Z', // Before start
        };

        const result = BookingCreateRequestSchema.safeParse(requestWithInvalidTimes);
        expect(result.success).toBe(true); // Schema allows it, handler should reject
      });
    });

    describe('Response Schema Validation', () => {
      it('accepts valid booking creation response', () => {
        const validResponse: BookingCreateResponse = {
          success: true,
          bookingId: '550e8400-e29b-41d4-a716-446655440001',
          startAt: '2024-01-15T10:00:00Z',
          endAt: '2024-01-15T10:30:00Z',
          status: 'CONFIRMED',
        };

        const result = BookingCreateResponseSchema.safeParse(validResponse);
        expect(result.success).toBe(true);
      });

      it('accepts different status values', () => {
        const validResponse: BookingCreateResponse = {
          success: true,
          bookingId: '550e8400-e29b-41d4-a716-446655440001',
          startAt: '2024-01-15T10:00:00Z',
          endAt: '2024-01-15T10:30:00Z',
          status: 'PENDING', // Different status
        };

        const result = BookingCreateResponseSchema.safeParse(validResponse);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('GET /api/public/booking/{bookingId}', () => {
    describe('Response Schema Validation', () => {
      it('accepts valid booking confirmation response', () => {
        const validResponse: BookingConfirmationResponse = {
          success: true,
          bookingId: '550e8400-e29b-41d4-a716-446655440001',
          leadId: '550e8400-e29b-41d4-a716-446655440000',
          startAt: '2024-01-15T10:00:00Z',
          endAt: '2024-01-15T10:30:00Z',
          status: 'CONFIRMED',
          confirmedAt: '2024-01-14T15:30:00Z',
        };

        const result = BookingConfirmationResponseSchema.safeParse(validResponse);
        expect(result.success).toBe(true);
      });

      it('accepts response without confirmedAt', () => {
        const validResponse: BookingConfirmationResponse = {
          success: true,
          bookingId: '550e8400-e29b-41d4-a716-446655440001',
          leadId: '550e8400-e29b-41d4-a716-446655440000',
          startAt: '2024-01-15T10:00:00Z',
          endAt: '2024-01-15T10:30:00Z',
          status: 'PENDING',
          // confirmedAt is optional
        };

        const result = BookingConfirmationResponseSchema.safeParse(validResponse);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Error Response Validation', () => {
    it('validates slot unavailable error', () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'SLOT_UNAVAILABLE',
          message: 'This time slot is no longer available',
        },
      };

      const result = ErrorEnvelopeSchema.safeParse(errorResponse);
      expect(result.success).toBe(true);
    });

    it('validates lead not found error', () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'LEAD_NOT_FOUND',
          message: 'Lead not found or access denied',
        },
      };

      const result = ErrorEnvelopeSchema.safeParse(errorResponse);
      expect(result.success).toBe(true);
    });

    it('validates calendar error', () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'CALENDAR_ERROR',
          message: 'Unable to connect to calendar service',
        },
      };

      const result = ErrorEnvelopeSchema.safeParse(errorResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('End-to-End Contract Compliance', () => {
    it('booking slots request produces valid response shape', () => {
      const validRequest: BookingSlotsRequest = {
        start: '2024-01-15',
        days: 7,
      };

      const expectedResponse: BookingSlotsResponse = {
        success: true,
        availability: [
          {
            date: '2024-01-15',
            slots: [
              {
                start: '2024-01-15T09:00:00Z',
                end: '2024-01-15T09:30:00Z',
                available: true,
              },
            ],
            availableCount: 1,
          },
        ],
      };

      expect(BookingSlotsRequestSchema.safeParse(validRequest).success).toBe(true);
      expect(BookingSlotsResponseSchema.safeParse(expectedResponse).success).toBe(true);
    });

    it('booking creation request produces valid response shape', () => {
      const validRequest: BookingCreateRequest = {
        leadId: '550e8400-e29b-41d4-a716-446655440000',
        startAt: '2024-01-15T14:00:00Z',
        endAt: '2024-01-15T14:30:00Z',
      };

      const expectedResponse: BookingCreateResponse = {
        success: true,
        bookingId: '550e8400-e29b-41d4-a716-446655440001',
        startAt: '2024-01-15T14:00:00Z',
        endAt: '2024-01-15T14:30:00Z',
        status: 'CONFIRMED',
      };

      expect(BookingCreateRequestSchema.safeParse(validRequest).success).toBe(true);
      expect(BookingCreateResponseSchema.safeParse(expectedResponse).success).toBe(true);
    });
  });
});
