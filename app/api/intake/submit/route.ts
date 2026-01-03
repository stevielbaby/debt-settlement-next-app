import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/app/lib/db';
import { getCurrentFirm, normalizeEmail } from '@/lib/utils';
import { IntakeSubmitRequestSchema, IntakeSubmitResponseSchema } from '@/lib/schemas/intake';
import { ErrorEnvelopeSchema } from '@/lib/schemas/dto';

/**
 * Check for duplicate intake submissions
 * Rejects if:
 * - Active case exists for email (status != CLOSED)
 * - Convertible lead exists for email (status = NEW)
 */
async function checkDuplicateIntake(firmId: string, email: string): Promise<{ isDuplicate: boolean; reason?: string }> {
  const normalizedEmail = normalizeEmail(email);

  // Check for active cases (not closed)
  const activeCase = await prisma.case.findFirst({
    where: {
      firmId: firmId,
      email: normalizedEmail,
      status: {
        not: 'CLOSED'
      }
    }
  });

  if (activeCase) {
    return { isDuplicate: true, reason: 'active_case' };
  }

  // Check for convertible leads (NEW status)
  const convertibleLead = await prisma.lead.findFirst({
    where: {
      firmId: firmId,
      email: normalizedEmail,
      status: 'NEW'
    }
  });

  if (convertibleLead) {
    return { isDuplicate: true, reason: 'convertible_lead' };
  }

  return { isDuplicate: false };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = IntakeSubmitRequestSchema.parse(body);

    // Get the current firm (single-tenant mode)
    const firm = await getCurrentFirm();

    // Normalize email for consistent duplicate checking
    const normalizedEmail = normalizeEmail(validatedData.contact.email);

    // Check for duplicates
    const duplicateCheck = await checkDuplicateIntake(firm.id, validatedData.contact.email);
    if (duplicateCheck.isDuplicate) {
      const errorResponse = ErrorEnvelopeSchema.parse({
        success: false,
        error: {
          code: 'DUPLICATE_INTAKE',
          message: 'We already have your request.',
        },
      });
      return NextResponse.json(errorResponse, { status: 409 });
    }

    // Determine lead type (use provided or infer from form)
    const leadType = validatedData.leadType || 'DEBT_SETTLEMENT'; // Default if not provided

    // Create the lead
    const lead = await prisma.lead.create({
      data: {
        firmId: firm.id,
        type: leadType,
        email: normalizedEmail,
        fullName: `${validatedData.contact.firstName} ${validatedData.contact.lastName}`.trim(),
        phone: validatedData.contact.phone,
        debtAmount: validatedData.debtAmount,
        status: 'NEW',
      },
    });

    // Create the intake submission record
    await prisma.intakeSubmission.create({
      data: {
        firmId: firm.id,
        leadId: lead.id,
        leadType: leadType,
        email: normalizedEmail,
        debtAmount: validatedData.debtAmount,
        payload: validatedData.intakePayload,
      },
    });

    const response = IntakeSubmitResponseSchema.parse({
      success: true,
      leadId: lead.id,
      leadStatus: lead.status,
    });

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorResponse = ErrorEnvelopeSchema.parse({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: { validationErrors: error.issues },
        },
      });
      return NextResponse.json(errorResponse, { status: 400 });
    }

    console.error('Intake submission error:', error);
    const errorResponse = ErrorEnvelopeSchema.parse({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to process intake submission',
      },
    });
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
