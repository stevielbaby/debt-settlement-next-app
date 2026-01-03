import { z } from 'zod';
import { SuccessEnvelopeSchema, ErrorEnvelopeSchema, BookingStatusSchema } from './dto';

// ============================================================================
// BOOKING SLOTS ENDPOINT (/api/public/booking/slots)
// ============================================================================

// Request schema for booking slots query
export const BookingSlotsRequestSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD format'),
  days: z.number().int().min(1).max(30).default(14),
});

// Individual time slot schema
export const TimeSlotSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  available: z.boolean(),
});

// Day availability schema
export const DayAvailabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slots: z.array(TimeSlotSchema),
  availableCount: z.number().int().min(0),
});

// Response schema for booking slots
export const BookingSlotsResponseSchema = SuccessEnvelopeSchema.extend({
  availability: z.array(DayAvailabilitySchema),
});

// ============================================================================
// BOOKING CREATE ENDPOINT (/api/public/booking/create)
// ============================================================================

// Request schema for booking creation
export const BookingCreateRequestSchema = z.object({
  leadId: z.string().uuid('Valid lead ID required'),
  startAt: z.string().datetime('Valid start time required'),
  endAt: z.string().datetime('Valid end time required'),
});

// Response schema for successful booking creation
export const BookingCreateResponseSchema = SuccessEnvelopeSchema.extend({
  bookingId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  status: z.string(), // BookingStatus as string
});

// ============================================================================
// BOOKING CONFIRMATION ENDPOINT (/api/public/booking/:bookingId)
// ============================================================================

// Response schema for booking confirmation lookup
export const BookingConfirmationResponseSchema = SuccessEnvelopeSchema.extend({
  bookingId: z.string().uuid(),
  leadId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  status: z.string(),
  confirmedAt: z.string().datetime().optional(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type BookingSlotsRequest = z.infer<typeof BookingSlotsRequestSchema>;
export type TimeSlot = z.infer<typeof TimeSlotSchema>;
export type DayAvailability = z.infer<typeof DayAvailabilitySchema>;
export type BookingSlotsResponse = z.infer<typeof BookingSlotsResponseSchema>;

export type BookingCreateRequest = z.infer<typeof BookingCreateRequestSchema>;
export type BookingCreateResponse = z.infer<typeof BookingCreateResponseSchema>;

export type BookingConfirmationResponse = z.infer<typeof BookingConfirmationResponseSchema>;




