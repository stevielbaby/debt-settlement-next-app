import { NextRequest, NextResponse } from 'next/server';
import { InviteValidateRequestSchema, InviteValidateResponseSchema } from '@/lib/schemas/invite';
import { normalizeEmail } from '@/lib/utils';
import { z } from 'zod';

/**
 * POST /api/auth/invite/validate
 *
 * Validate an operator invite code and return role information if valid.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = InviteValidateRequestSchema.parse(body);

    // Normalize email for consistent comparison
    const normalizedEmail = normalizeEmail(validatedData.email);

    // TODO: Replace with actual database query once Invite model is added to Prisma schema
    // For now, return a placeholder response
    const inviteValidation = await validateInviteCode(normalizedEmail, validatedData.code);

    const response = InviteValidateResponseSchema.parse({
      success: true,
      valid: inviteValidation.valid,
      ...(inviteValidation.valid && {
        role: inviteValidation.role,
        expiresAt: inviteValidation.expiresAt,
      }),
    });

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    console.error('Invite validation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to validate invite',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Validate an invite code against the database
 * TODO: Implement with actual Invite model once added to Prisma schema
 */
async function validateInviteCode(email: string, code: string): Promise<{
  valid: boolean;
  role?: string;
  expiresAt?: string;
}> {
  // TODO: Replace with actual database query
  // Example query structure:
  // const invite = await prisma.invite.findFirst({
  //   where: {
  //     email: normalizedEmail,
  //     code: code,
  //     status: 'PENDING',
  //     expiresAt: { gt: new Date() },
  //   },
  // });

  // Placeholder logic for development/testing
  // In a real implementation, this would check:
  // 1. Invite exists with matching email and code
  // 2. Invite hasn't expired
  // 3. Invite hasn't been used
  // 4. Log the validation attempt for audit

  // For now, accept any 6+ character code for testing
  if (code.length >= 6 && code.length <= 20) {
    return {
      valid: true,
      role: 'OPERATOR', // Single-tenant, so always OPERATOR
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
    };
  }

  return {
    valid: false,
  };
}
