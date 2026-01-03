import { describe, it, expect } from 'vitest';
import {
  InviteValidateRequestSchema,
  InviteValidateResponseSchema,
  InviteCreateRequestSchema,
  InviteCreateResponseSchema,
  type InviteValidateRequest,
  type InviteValidateResponse,
  type InviteCreateRequest,
  type InviteCreateResponse,
} from '../../lib/schemas/invite';
import {
  SignupRequestSchema,
  SignupResponseSchema,
} from '../../lib/schemas/signup';
import { ErrorEnvelopeSchema } from '../../lib/schemas/dto';

describe('Invite Endpoints - Contract Tests', () => {
  describe('POST /api/auth/invite/validate', () => {
    describe('Request Schema Validation', () => {
      it('accepts valid invite validation request', () => {
        const validRequest: InviteValidateRequest = {
          email: 'operator@firm.com',
          code: 'ABC123XYZ',
        };

        const result = InviteValidateRequestSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
        expect(result.data).toEqual(validRequest);
      });

      it('rejects invalid email format', () => {
        const invalidRequest = {
          email: 'invalid-email',
          code: 'ABC123XYZ',
        };

        const result = InviteValidateRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
      });

      it('rejects code too short', () => {
        const invalidRequest = {
          email: 'operator@firm.com',
          code: 'ABC', // Too short
        };

        const result = InviteValidateRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
      });
    });

    describe('Response Schema Validation', () => {
      it('accepts valid invite validation success response', () => {
        const validResponse: InviteValidateResponse = {
          success: true,
          valid: true,
          role: 'OPERATOR',
          expiresAt: '2024-12-31T23:59:59Z',
        };

        const result = InviteValidateResponseSchema.safeParse(validResponse);
        expect(result.success).toBe(true);
      });

      it('accepts invalid invite response', () => {
        const invalidResponse: InviteValidateResponse = {
          success: true,
          valid: false,
          // No role/expiresAt for invalid invites
        };

        const result = InviteValidateResponseSchema.safeParse(invalidResponse);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('POST /api/auth/signup', () => {
    describe('Request Schema Validation', () => {
      it('accepts valid signup request', () => {
        const validRequest = {
          email: 'operator@firm.com',
          password: 'securePassword123',
          name: 'John Operator',
          code: 'ABC123XYZ',
        };

        const result = SignupRequestSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
      });

      it('rejects password too short', () => {
        const invalidRequest = {
          email: 'operator@firm.com',
          password: 'short', // Too short
          name: 'John Operator',
          code: 'ABC123XYZ',
        };

        const result = SignupRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
      });
    });

    describe('Response Schema Validation', () => {
      it('accepts valid signup response', () => {
        const validResponse = {
          success: true,
          userId: '550e8400-e29b-41d4-a716-446655440000',
        };

        const result = SignupResponseSchema.safeParse(validResponse);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('POST /api/webmaster/invites/create', () => {
    describe('Request Schema Validation', () => {
      it('accepts valid invite creation request', () => {
        const validRequest: InviteCreateRequest = {
          email: 'newoperator@firm.com',
          role: 'OPERATOR',
        };

        const result = InviteCreateRequestSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
      });

      it('rejects invalid role', () => {
        const invalidRequest = {
          email: 'newoperator@firm.com',
          role: 'INVALID_ROLE',
        };

        const result = InviteCreateRequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
      });
    });

    describe('Response Schema Validation', () => {
      it('accepts valid invite creation response', () => {
        const validResponse: InviteCreateResponse = {
          success: true,
          inviteId: '550e8400-e29b-41d4-a716-446655440000',
          code: 'DEF456UVW',
        };

        const result = InviteCreateResponseSchema.safeParse(validResponse);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Error Response Validation', () => {
    it('validates invite not found error', () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'INVITE_NOT_FOUND',
          message: 'Invite code not found or expired',
        },
      };

      const result = ErrorEnvelopeSchema.safeParse(errorResponse);
      expect(result.success).toBe(true);
    });

    it('validates email mismatch error', () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'EMAIL_MISMATCH',
          message: 'Email does not match invite',
        },
      };

      const result = ErrorEnvelopeSchema.safeParse(errorResponse);
      expect(result.success).toBe(true);
    });
  });
});
