import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { z } from 'zod';

// Define allowed case statuses according to API catalog
const CaseStatusSchema = z.enum(['NEW', 'CONTACTED', 'SCHEDULED', 'RETAINED', 'CLOSED', 'LOSS']);

// Map API statuses to Prisma enum values
const apiToPrismaStatus = {
  'NEW': 'ACTIVE' as const,
  'CONTACTED': 'ACTIVE' as const,
  'SCHEDULED': 'ACTIVE' as const,
  'RETAINED': 'ACTIVE' as const,
  'CLOSED': 'CLOSED' as const,
  'LOSS': 'CLOSED' as const,
};

const CaseStatusUpdateRequestSchema = z.object({
  status: CaseStatusSchema,
});

/**
 * POST /api/operator/cases/:caseId/status
 *
 * Update the status of a case.
 * Allowed statuses: NEW | CONTACTED | SCHEDULED | RETAINED | CLOSED | LOSS
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // @ts-ignore - Extended session properties from auth.d.ts
    const role = session.user.role;

    // Only operators and webmasters can update case status
    if (role !== 'operator' && role !== 'webmaster') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { caseId } = await params;

    // Validate caseId is a valid UUID
    if (!caseId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(caseId)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CASE_ID',
            message: 'Invalid case ID format',
          },
        },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CaseStatusUpdateRequestSchema.parse(body);

    // Get the current firm
    const firm = await prisma.firm.findFirst();
    if (!firm) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FIRM_NOT_CONFIGURED',
            message: 'Firm not configured',
          },
        },
        { status: 500 }
      );
    }

    // Verify case exists and belongs to this firm
    const existingCase = await prisma.case.findFirst({
      where: {
        id: caseId,
        firmId: firm.id,
      },
    });

    if (!existingCase) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CASE_NOT_FOUND',
            message: 'Case not found',
          },
        },
        { status: 404 }
      );
    }

    // Map API status to Prisma status
    const prismaStatus = apiToPrismaStatus[validatedData.status];

    // Update case status
    const updatedCase = await prisma.case.update({
      where: {
        id: caseId,
      },
      data: {
        status: prismaStatus,
        updatedAt: new Date(),
        // Set closedAt if status is CLOSED/LOSS
        ...(prismaStatus === 'CLOSED' && !existingCase.closedAt && {
          closedAt: new Date(),
        }),
      },
      select: {
        id: true,
        caseNumber: true,
        status: true,
        updatedAt: true,
        closedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      caseId: updatedCase.id,
      caseNumber: updatedCase.caseNumber || 0, // caseNumber is now non-nullable
      status: validatedData.status, // Return the API status, not Prisma status
      updatedAt: updatedCase.updatedAt,
      closedAt: updatedCase.closedAt,
    });
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

    console.error('Error updating case status:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update case status',
        },
      },
      { status: 500 }
    );
  }
}
