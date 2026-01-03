import { z } from 'zod';
import { SuccessEnvelopeSchema, ErrorEnvelopeSchema } from './dto';

// ============================================================================
// SIGNUP ENDPOINT (/api/auth/signup)
// ============================================================================

// Request schema for user signup
export const SignupRequestSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name required'),
  code: z.string().min(6, 'Invite code required'),
});

// Response schema for successful signup
export const SignupResponseSchema = SuccessEnvelopeSchema.extend({
  userId: z.string().uuid(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type SignupRequest = z.infer<typeof SignupRequestSchema>;
export type SignupResponse = z.infer<typeof SignupResponseSchema>;




