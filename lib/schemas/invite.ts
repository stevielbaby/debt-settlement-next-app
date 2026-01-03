import { z } from 'zod';
import { SuccessEnvelopeSchema, ErrorEnvelopeSchema, UserRoleSchema } from './dto';

// ============================================================================
// INVITE VALIDATION ENDPOINT (/api/auth/invite/validate)
// ============================================================================

// Request schema for invite validation
export const InviteValidateRequestSchema = z.object({
  email: z.string().email('Valid email required'),
  code: z.string().min(6, 'Invite code must be at least 6 characters'),
});

// Response schema for invite validation
export const InviteValidateResponseSchema = SuccessEnvelopeSchema.extend({
  valid: z.boolean(),
  role: UserRoleSchema.optional(), // Only present if valid
  expiresAt: z.string().datetime().optional(), // Only present if valid
});

// ============================================================================
// INVITE CREATION ENDPOINT (/api/webmaster/invites/create)
// ============================================================================

// Request schema for invite creation (webmaster only)
export const InviteCreateRequestSchema = z.object({
  email: z.string().email('Valid email required'),
  role: UserRoleSchema, // OPERATOR for single-tenant
});

// Response schema for invite creation
export const InviteCreateResponseSchema = SuccessEnvelopeSchema.extend({
  inviteId: z.string().uuid(),
  code: z.string(), // The actual invite code to share
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type InviteValidateRequest = z.infer<typeof InviteValidateRequestSchema>;
export type InviteValidateResponse = z.infer<typeof InviteValidateResponseSchema>;
export type InviteCreateRequest = z.infer<typeof InviteCreateRequestSchema>;
export type InviteCreateResponse = z.infer<typeof InviteCreateResponseSchema>;




