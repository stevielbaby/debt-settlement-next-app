import { NextRequest, NextResponse } from 'next/server';
import { SignupRequestSchema, SignupResponseSchema } from '@/lib/schemas/signup';
import { normalizeEmail } from '@/lib/utils';
import { prisma } from '@/app/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { randomUUID } from 'crypto';

/**
 * POST /api/auth/signup
 *
 * Create a new operator account using a valid invite code.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = SignupRequestSchema.parse(body);

    // Normalize email for consistent comparison
    const normalizedEmail = normalizeEmail(validatedData.email);

    // Validate invite code first
    const inviteValidation = await validateInviteForSignup(normalizedEmail, validatedData.code);
    if (!inviteValidation.valid) {
      // Log failed attempt for audit
      await logInviteAttempt(normalizedEmail, validatedData.code, false, 'INVALID_CODE');

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INVITE',
            message: 'Invalid or expired invite code',
          },
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      await logInviteAttempt(normalizedEmail, validatedData.code, false, 'USER_EXISTS');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'An account with this email already exists',
          },
        },
        { status: 409 }
      );
    }

    // Get the firm/org from invite validation (single-tenant fallback)
    const firmId = inviteValidation.firmId || (await getCurrentFirm()).id;

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(validatedData.password, saltRounds);

    // Create user account in Prisma
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: passwordHash,
        name: validatedData.name,
        role: inviteValidation.role as any || 'OPERATOR', // Use invite role or default to OPERATOR
        firmId: firmId,
        emailVerified: new Date(), // Auto-verify for invite-based signup
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      }
    });

    // Mark invite as used
    if (inviteValidation.inviteId) {
      await prisma.invite.update({
        where: { id: inviteValidation.inviteId },
        data: {
          status: 'USED',
          usedAt: new Date(),
        },
      });
    }

    // Log successful signup
    await logInviteAttempt(normalizedEmail, validatedData.code, true, 'SUCCESS');

    const response = SignupResponseSchema.parse({
      success: true,
      userId: newUser.id,
    });

    return NextResponse.json(response, { status: 201 });
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

    console.error('Signup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create account',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Validate invite code for signup using Prisma
 */
async function validateInviteForSignup(normalizedEmail: string, code: string): Promise<{
  valid: boolean;
  inviteId?: string;
  firmId?: string;
  role?: string;
}> {
  try {
    // Find valid, unused invite for this email
    const invite = await prisma.invite.findFirst({
      where: {
        email: normalizedEmail,
        status: 'PENDING',
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        firmId: true,
        role: true,
        code: true, // Stored hashed code
      },
    });

    if (!invite) {
      return { valid: false };
    }

    // Verify the code matches (timing-safe comparison)
    const codeMatches = await bcrypt.compare(code, invite.code);

    if (!codeMatches) {
      return { valid: false };
    }

    return {
      valid: true,
      inviteId: invite.id,
      firmId: invite.firmId || undefined,
      role: invite.role,
    };
  } catch (error) {
    console.error('Invite validation error:', error);
    return { valid: false };
  }
}

/**
 * Log invite attempt for audit purposes
 * TODO: Implement full Prisma logging once inviteId is available
 */
async function logInviteAttempt(
  email: string,
  code: string,
  success: boolean,
  reason: string
): Promise<void> {
  // For now, log to console - full Prisma logging requires inviteId
  console.log(`Invite attempt: ${email}, success: ${success}, reason: ${reason}`);
}

/**
 * Get the current firm (single-tenant)
 * TODO: Move to shared utility
 */
async function getCurrentFirm() {
  const firm = await prisma.firm.findFirst();
  if (!firm) {
    throw new Error('No firm configured. Please run setup wizard.');
  }
  return firm;
}
