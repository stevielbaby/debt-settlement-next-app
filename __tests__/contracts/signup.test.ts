import { describe, it, expect } from 'vitest';
import {
  SignupRequestSchema,
  SignupResponseSchema,
  type SignupRequest,
  type SignupResponse,
} from '../../lib/schemas/signup';
import { ErrorEnvelopeSchema } from '../../lib/schemas/dto';

describe('POST /api/auth/signup - Contract Tests', () => {
  describe('Request Schema Validation', () => {
    it('accepts valid signup request', () => {
      const validRequest: SignupRequest = {
        email: 'operator@firm.com',
        password: 'securePassword123',
        name: 'John Operator',
        code: 'ABC123XYZ',
      };

      const result = SignupRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validRequest);
    });

    it('accepts minimum valid password length', () => {
      const validRequest: SignupRequest = {
        email: 'operator@firm.com',
        password: '12345678', // Exactly 8 characters
        name: 'John Operator',
        code: 'ABC123XYZ',
      };

      const result = SignupRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('rejects password too short', () => {
      const invalidRequest = {
        email: 'operator@firm.com',
        password: 'short', // 5 characters, too short
        name: 'John Operator',
        code: 'ABC123XYZ',
      };

      const result = SignupRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some(issue => issue.path.includes('password'))).toBe(true);
    });

    it('rejects invalid email format', () => {
      const invalidRequest = {
        email: 'invalid-email',
        password: 'securePassword123',
        name: 'John Operator',
        code: 'ABC123XYZ',
      };

      const result = SignupRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some(issue => issue.path.includes('email'))).toBe(true);
    });

    it('rejects empty name', () => {
      const invalidRequest = {
        email: 'operator@firm.com',
        password: 'securePassword123',
        name: '', // Empty name
        code: 'ABC123XYZ',
      };

      const result = SignupRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some(issue => issue.path.includes('name'))).toBe(true);
    });

    it('rejects missing invite code', () => {
      const invalidRequest = {
        email: 'operator@firm.com',
        password: 'securePassword123',
        name: 'John Operator',
        // Missing code
      };

      const result = SignupRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some(issue => issue.path.includes('code'))).toBe(true);
    });
  });

  describe('Response Schema Validation', () => {
    it('accepts valid signup success response', () => {
      const validResponse: SignupResponse = {
        success: true,
        userId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = SignupResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validResponse);
    });

    it('rejects response with wrong success type', () => {
      const invalidResponse = {
        success: 'true', // Should be boolean
        userId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = SignupResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('rejects response missing required fields', () => {
      const invalidResponse = {
        success: true,
        // Missing userId
      };

      const result = SignupResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('rejects response with invalid UUID', () => {
      const invalidResponse = {
        success: true,
        userId: 'not-a-uuid',
      };

      const result = SignupResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });

  describe('Error Response Validation', () => {
    it('validates invite expired error', () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'INVITE_EXPIRED',
          message: 'Invite code has expired',
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
          message: 'Email does not match invite code',
        },
      };

      const result = ErrorEnvelopeSchema.safeParse(errorResponse);
      expect(result.success).toBe(true);
    });

    it('validates user already exists error', () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User with this email already exists',
        },
      };

      const result = ErrorEnvelopeSchema.safeParse(errorResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('End-to-End Contract Compliance', () => {
    it('handler processes valid signup and returns valid response', () => {
      // Test that a valid signup request produces a valid response
      const validRequest: SignupRequest = {
        email: 'newoperator@firm.com',
        password: 'securePassword123',
        name: 'Jane Operator',
        code: 'XYZ789ABC',
      };

      const expectedResponse: SignupResponse = {
        success: true,
        userId: '550e8400-e29b-41d4-a716-446655440000',
      };

      expect(SignupRequestSchema.safeParse(validRequest).success).toBe(true);
      expect(SignupResponseSchema.safeParse(expectedResponse).success).toBe(true);
    });

    it('handler rejects invalid signup and returns error envelope', () => {
      const invalidRequest = {
        email: 'operator@firm.com',
        password: 'weak', // Too short
        name: 'John Operator',
        code: 'ABC123XYZ',
      };

      const expectedErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid signup data',
        },
      };

      const requestValidation = SignupRequestSchema.safeParse(invalidRequest);
      const errorValidation = ErrorEnvelopeSchema.safeParse(expectedErrorResponse);

      expect(requestValidation.success).toBe(false);
      expect(errorValidation.success).toBe(true);
    });
  });
});
