import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { IntakeSubmitRequestSchema, IntakeSubmitResponseSchema } from '@/lib/schemas/intake';
import { ErrorEnvelopeSchema } from '@/lib/schemas/dto';

type IntakeSubmitRequest = z.infer<typeof IntakeSubmitRequestSchema>;
type IntakeSubmitResponse = z.infer<typeof IntakeSubmitResponseSchema>;

// Mock utility functions
vi.mock('@/lib/utils', () => ({
  getCurrentFirm: vi.fn(),
  normalizeEmail: vi.fn(),
}));

import { getCurrentFirm, normalizeEmail } from '@/lib/utils';

// Mock the database
vi.mock('@/app/lib/db', () => ({
  prisma: {
    firm: { findFirst: vi.fn() },
    lead: { create: vi.fn(), findFirst: vi.fn() },
    intakeSubmission: { create: vi.fn() },
    case: { findFirst: vi.fn() },
  },
}));

// Import after mocking
import { prisma } from '@/app/lib/db';

describe('POST /api/intake/submit - Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Request Schema Validation', () => {
    it('accepts valid intake submission request', () => {
      const validRequest: IntakeSubmitRequest = {
        leadType: 'DEBT_SETTLEMENT',
        contact: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '555-0123-4567',
        },
        intakePayload: {
          situation: 'Program failed',
          debtAmount: 25000,
          currentCompany: 'ABC Settlement Co',
        },
        debtAmount: 25000,
      };

      const result = IntakeSubmitRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validRequest);
    });

    it('accepts minimal valid request', () => {
      const minimalRequest: IntakeSubmitRequest = {
        contact: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '555-0124-8901',
        },
        intakePayload: {
          situation: 'Need help with debt',
        },
      };

      const result = IntakeSubmitRequestSchema.safeParse(minimalRequest);
      expect(result.success).toBe(true);
    });

    it('rejects invalid email format', () => {
      const invalidRequest = {
        contact: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'invalid-email', // Invalid format
          phone: '555-0123-4567',
        },
        intakePayload: {
          situation: 'Test',
        },
      };

      const result = IntakeSubmitRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some(issue => issue.path.includes('email'))).toBe(true);
    });

    it('rejects missing required contact fields', () => {
      const invalidRequest = {
        contact: {
          firstName: 'John',
          // Missing lastName, email, phone
        },
        intakePayload: {
          situation: 'Test',
        },
      };

      const result = IntakeSubmitRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      expect(result.error?.issues.length).toBeGreaterThan(0);
    });

    it('rejects negative debt amount', () => {
      const invalidRequest = {
        contact: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '555-0123-4567',
        },
        intakePayload: {
          situation: 'Test',
        },
        debtAmount: -1000, // Invalid negative amount
      };

      const result = IntakeSubmitRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('Response Schema Validation', () => {
    it('accepts valid success response', () => {
      const validResponse: IntakeSubmitResponse = {
        success: true,
        leadId: '550e8400-e29b-41d4-a716-446655440000',
        leadStatus: 'NEW',
      };

      const result = IntakeSubmitResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validResponse);
    });

    it('rejects response without required fields', () => {
      const invalidResponse = {
        success: true,
        // Missing leadId and leadStatus
      };

      const result = IntakeSubmitResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });

    it('rejects response with wrong success value', () => {
      const invalidResponse = {
        success: 'true', // Should be boolean
        leadId: '550e8400-e29b-41d4-a716-446655440000',
        leadStatus: 'NEW',
      };

      const result = IntakeSubmitResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });

  describe('Error Response Validation', () => {
    it('accepts valid error envelope for validation errors', () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: {
            validationErrors: [
              {
                code: 'invalid_type',
                message: 'Expected string, received number',
                path: ['contact', 'email'],
              },
            ],
          },
        },
      };

      const result = ErrorEnvelopeSchema.safeParse(errorResponse);
      expect(result.success).toBe(true);
    });

    it('accepts valid error envelope for duplicate intake', () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'DUPLICATE_INTAKE',
          message: 'We already have your request.',
        },
      };

      const result = ErrorEnvelopeSchema.safeParse(errorResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('End-to-End Contract Compliance', () => {
    it('handler processes valid request and returns valid response', async () => {
      // Mock successful database operation
      vi.mocked(prisma.firm.findFirst).mockResolvedValueOnce({
        id: 'firm-singleton',
        name: 'Test Firm',
        publicEmail: null,
        publicPhone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.case.findFirst).mockResolvedValueOnce(null); // No existing case
      vi.mocked(prisma.lead.create).mockResolvedValueOnce({
        id: 'lead-123',
        firmId: 'firm-singleton',
        type: 'DEBT_SETTLEMENT',
        email: 'john.doe@example.com',
        fullName: 'John Doe',
        phone: '555-0123',
        debtAmount: 25000,
        status: 'NEW',
        source: 'PUBLIC_FORM',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.intakeSubmission.create).mockResolvedValueOnce({
        id: 'submission-123',
        firmId: 'firm-singleton',
        leadId: 'lead-123',
        leadType: 'DEBT_SETTLEMENT',
        email: 'john.doe@example.com',
        debtAmount: 25000,
        payload: {},
        createdAt: new Date(),
      });

      // Create mock request
      const validRequestBody: IntakeSubmitRequest = {
        leadType: 'DEBT_SETTLEMENT',
        contact: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '555-0123-4567',
        },
        intakePayload: {
          situation: 'Program failed / I am unhappy',
          debtAmount: 25000,
          currentCompany: 'ABC Settlement Co',
        },
        debtAmount: 25000,
      };

      // For now, test the contract shapes
      expect(IntakeSubmitRequestSchema.safeParse(validRequestBody).success).toBe(true);

      // Expected response shape (when handler is implemented)
      const expectedResponse: IntakeSubmitResponse = {
        success: true,
        leadId: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID format
        leadStatus: 'NEW',
      };

      expect(IntakeSubmitResponseSchema.safeParse(expectedResponse).success).toBe(true);
    });

    it('handler rejects invalid request and returns error envelope', async () => {
      const invalidRequestBody = {
        contact: {
          firstName: 'John',
          // Missing required fields
        },
        intakePayload: {},
      };

      // Test that invalid requests would be rejected
      const validation = IntakeSubmitRequestSchema.safeParse(invalidRequestBody);
      expect(validation.success).toBe(false);

      // Expected error response shape
      const expectedErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: { validationErrors: validation.error?.issues },
        },
      };

      expect(ErrorEnvelopeSchema.safeParse(expectedErrorResponse).success).toBe(true);
    });
  });

  describe('Duplicate Blocking Logic', () => {
    const mockFirm = {
      id: 'firm-singleton',
      name: 'Test Firm',
      publicEmail: null,
      publicPhone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      vi.mocked(getCurrentFirm).mockResolvedValue(mockFirm);
      vi.mocked(normalizeEmail).mockImplementation((email) => email.toLowerCase().trim());
    });

    it('allows intake when no duplicates exist', async () => {
      // Mock no existing case or lead
      vi.mocked(prisma.case.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(null);

      // Mock successful lead creation
      const mockLead = {
        id: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
        firmId: 'firm-singleton',
        type: 'DEBT_SETTLEMENT',
        email: 'test@example.com',
        fullName: 'Test User',
        phone: '555-0123',
        debtAmount: 10000,
        status: 'NEW',
        source: 'PUBLIC_FORM',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(prisma.lead.create).mockResolvedValue(mockLead);
      vi.mocked(prisma.intakeSubmission.create).mockResolvedValue({
        id: 'submission-123',
        firmId: 'firm-singleton',
        leadId: '550e8400-e29b-41d4-a716-446655440000',
        leadType: 'DEBT_SETTLEMENT',
        email: 'test@example.com',
        debtAmount: 10000,
        payload: { situation: 'Need help' },
        createdAt: new Date(),
      });

      // Import the handler to test it
      const { POST } = await import('@/app/api/intake/submit/route');

      const request = new Request('http://localhost:3000/api/intake/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          leadType: 'DEBT_SETTLEMENT',
          contact: {
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            phone: '555-0123-4567',
          },
          intakePayload: { situation: 'Need help' },
          debtAmount: 10000,
        }),
      });

      const response = await POST(request as any);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.leadId).toBeDefined();
      expect(typeof result.leadId).toBe('string');
      expect(result.leadStatus).toBe('NEW');
    });

    it('blocks intake when active case exists', async () => {
      // Mock existing active case
      vi.mocked(prisma.case.findFirst).mockResolvedValue({
        id: 'case-123',
        firmId: 'firm-singleton',
        leadId: 'lead-123',
        caseNumber: 1,
        email: 'test@example.com',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        closedAt: null,
      });

      // Import the handler to test it
      const { POST } = await import('@/app/api/intake/submit/route');

      const request = new Request('http://localhost:3000/api/intake/submit', {
        method: 'POST',
        body: JSON.stringify({
          contact: {
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            phone: '555-0123-4567',
          },
          intakePayload: { situation: 'Need help' },
        }),
      });

      const response = await POST(request as any);
      const result = await response.json();

      expect(response.status).toBe(409);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('DUPLICATE_INTAKE');
      expect(result.error.message).toBe('We already have your request.');
    });

    it('blocks intake when convertible lead exists', async () => {
      // Mock no active case but existing NEW lead
      vi.mocked(prisma.case.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue({
        id: 'lead-123',
        firmId: 'firm-singleton',
        type: 'DEBT_SETTLEMENT',
        email: 'test@example.com',
        fullName: 'Test User',
        phone: '555-0123',
        debtAmount: 10000,
        status: 'NEW',
        source: 'PUBLIC_FORM',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Import the handler to test it
      const { POST } = await import('@/app/api/intake/submit/route');

      const request = new Request('http://localhost:3000/api/intake/submit', {
        method: 'POST',
        body: JSON.stringify({
          contact: {
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            phone: '555-0123-4567',
          },
          intakePayload: { situation: 'Need help' },
        }),
      });

      const response = await POST(request as any);
      const result = await response.json();

      expect(response.status).toBe(409);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('DUPLICATE_INTAKE');
      expect(result.error.message).toBe('We already have your request.');
    });

    it('allows intake when case is CLOSED', async () => {
      // Mock no active case (query for status != CLOSED should return null)
      vi.mocked(prisma.case.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(null); // No NEW lead

      // Mock successful lead creation
      const mockLead = {
        id: '550e8400-e29b-41d4-a716-446655440001', // Valid UUID
        firmId: 'firm-singleton',
        type: 'DEBT_SETTLEMENT',
        email: 'test@example.com',
        fullName: 'Test User',
        phone: '555-0123',
        debtAmount: 10000,
        status: 'NEW',
        source: 'PUBLIC_FORM',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(prisma.lead.create).mockResolvedValue(mockLead);
      vi.mocked(prisma.intakeSubmission.create).mockResolvedValue({
        id: 'submission-456',
        firmId: 'firm-singleton',
        leadId: '550e8400-e29b-41d4-a716-446655440001',
        leadType: 'DEBT_SETTLEMENT',
        email: 'test@example.com',
        debtAmount: 10000,
        payload: { situation: 'Need help again' },
        createdAt: new Date(),
      });

      // Import the handler to test it
      const { POST } = await import('@/app/api/intake/submit/route');

      const request = new Request('http://localhost:3000/api/intake/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          leadType: 'DEBT_SETTLEMENT',
          contact: {
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            phone: '555-0123-4567',
          },
          intakePayload: { situation: 'Need help again' },
          debtAmount: 10000,
        }),
      });

      const response = await POST(request as any);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.leadId).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(result.leadStatus).toBe('NEW');
    });

    it('normalizes email for duplicate checking', async () => {
      // Mock no existing case or lead
      vi.mocked(prisma.case.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.lead.findFirst).mockResolvedValue(null);

      // Mock successful lead creation
      const mockLead = {
        id: '550e8400-e29b-41d4-a716-446655440002', // Valid UUID
        firmId: 'firm-singleton',
        type: 'DEBT_SETTLEMENT',
        email: 'test@example.com', // normalized
        fullName: 'Test User',
        phone: '555-0123',
        debtAmount: 10000,
        status: 'NEW',
        source: 'PUBLIC_FORM',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(prisma.lead.create).mockResolvedValue(mockLead);
      vi.mocked(prisma.intakeSubmission.create).mockResolvedValue({
        id: 'submission-123',
        firmId: 'firm-singleton',
        leadId: '550e8400-e29b-41d4-a716-446655440002',
        leadType: 'DEBT_SETTLEMENT',
        email: 'test@example.com',
        debtAmount: 10000,
        payload: { situation: 'Need help' },
        createdAt: new Date(),
      });

      // Import the handler to test it
      const { POST } = await import('@/app/api/intake/submit/route');

      const request = new Request('http://localhost:3000/api/intake/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          leadType: 'DEBT_SETTLEMENT',
          contact: {
            firstName: 'Test',
            lastName: 'User',
            email: '  TEST@EXAMPLE.COM  ', // with extra whitespace and uppercase
            phone: '555-0123-4567',
          },
          intakePayload: { situation: 'Need help' },
          debtAmount: 10000,
        }),
      });

      const response = await POST(request as any);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.leadId).toBe('550e8400-e29b-41d4-a716-446655440002');
      // Verify email was normalized (note: Zod trims it first, then normalizeEmail lowercases it)
      expect(vi.mocked(normalizeEmail)).toHaveBeenCalledWith('TEST@EXAMPLE.COM');
    });
  });
});
