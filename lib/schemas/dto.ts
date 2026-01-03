import { z } from 'zod';

// ============================================================================
// SHARED ENUMS
// ============================================================================

export const LeadTypeSchema = z.enum(['DEBT_SETTLEMENT', 'BANKRUPTCY']);
export const LeadStatusSchema = z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'ARCHIVED']);
export const CaseStatusSchema = z.enum(['ACTIVE', 'CLOSED']); // Updated to match Prisma enum
export const CaseTypeSchema = z.enum(['DEBT_SETTLEMENT', 'BANKRUPTCY', 'CONSUMER_LAW']);
export const UserRoleSchema = z.enum(['WEBMASTER', 'OPERATOR', 'CLIENT']);
export const BookingStatusSchema = z.enum(['RESERVED', 'CANCELLED']); // Updated to match Prisma enum
export const InviteStatusSchema = z.enum(['PENDING', 'USED', 'EXPIRED']);

// ============================================================================
// SHARED DATA TRANSFER OBJECTS (DTOs)
// ============================================================================

// Contact information (shared across multiple entities)
export const ContactInfoSchema = z.object({
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(10, 'Valid phone number required'),
});

// Lead DTO
export const LeadDtoSchema = z.object({
  id: z.string().uuid(),
  firmId: z.string().uuid(), // Future-proof multi-tenant
  leadType: LeadTypeSchema,
  contact: ContactInfoSchema,
  debtAmount: z.number().int().min(0).optional(),
  intakePayload: z.record(z.string(), z.any()), // Versioned JSON blob
  intakeVersion: z.number().int().min(1).default(1),
  status: LeadStatusSchema,
  converted: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Case DTO
export const CaseDtoSchema = z.object({
  id: z.string().uuid(),
  firmId: z.string().uuid(),
  caseNumber: z.number().int().min(1),
  leadId: z.string().uuid().optional(),
  contact: ContactInfoSchema,
  caseType: CaseTypeSchema,
  status: CaseStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Booking DTO
export const BookingDtoSchema = z.object({
  id: z.string().uuid(),
  firmId: z.string().uuid(),
  leadId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  status: BookingStatusSchema,
  createdAt: z.string().datetime(),
});

// User DTO
export const UserDtoSchema = z.object({
  id: z.string().uuid(),
  firmId: z.string().uuid().nullable(), // WEBMASTER = null
  email: z.string().email(),
  name: z.string(),
  role: UserRoleSchema,
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
  createdAt: z.string().datetime(),
  lastLoginAt: z.string().datetime().nullable(),
});

// ============================================================================
// SHARED RESPONSE ENVELOPES
// ============================================================================

// Error envelope (consistent across all endpoints)
export const ErrorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.any()).optional(),
  }),
});

// Success envelope base (extend with data)
export const SuccessEnvelopeSchema = z.object({
  success: z.literal(true),
});

// Type helpers for TypeScript
export type LeadType = z.infer<typeof LeadTypeSchema>;
export type LeadStatus = z.infer<typeof LeadStatusSchema>;
export type CaseStatus = z.infer<typeof CaseStatusSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

export type ContactInfo = z.infer<typeof ContactInfoSchema>;
export type LeadDto = z.infer<typeof LeadDtoSchema>;
export type CaseDto = z.infer<typeof CaseDtoSchema>;
export type BookingDto = z.infer<typeof BookingDtoSchema>;
export type UserDto = z.infer<typeof UserDtoSchema>;

export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
export type SuccessEnvelope = z.infer<typeof SuccessEnvelopeSchema>;


