import { z } from 'zod';
import { LeadTypeSchema, SuccessEnvelopeSchema, ErrorEnvelopeSchema } from './dto';


// ============================================================================
// INTAKE SUBMIT ENDPOINT (/api/intake/submit)
// ============================================================================

// Request schema for intake submission
export const IntakeSubmitRequestSchema = z.object({
  leadType: LeadTypeSchema.optional(), // Can be inferred from form route if not provided
  contact: z.object({
    firstName: z.string().min(1, 'First name required'),
    lastName: z.string().min(1, 'Last name required'),
    email: z.string().trim().email('Valid email required'), // Trim whitespace before email validation
    phone: z.string().min(10, 'Valid phone number required'),
  }),
  intakePayload: z.record(z.string(), z.any()), // Versioned JSON blob per requirements
  debtAmount: z.number().int().min(0).optional(), // From dropdown
});


// Response schema for successful intake submission
export const IntakeSubmitResponseSchema = SuccessEnvelopeSchema.extend({
  leadId: z.string(), // Prisma CUID, not UUID
  leadStatus: z.string(), // LeadStatus enum as string
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type IntakeSubmitRequest = z.infer<typeof IntakeSubmitRequestSchema>;
export type IntakeSubmitResponse = z.infer<typeof IntakeSubmitResponseSchema>;


