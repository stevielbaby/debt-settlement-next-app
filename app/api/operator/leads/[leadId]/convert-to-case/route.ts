import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { getCurrentFirm } from '@/lib/utils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        },
        { status: 401 }
      );
    }

    // @ts-ignore - Extended session properties from auth.d.ts
    const role = session.user.role;
    // @ts-ignore - Extended session properties from auth.d.ts
    const userOrgId = session.user.orgId;

    console.log('Convert attempt:', { leadId: await params.then(p => p.leadId), role, userOrgId });

    // Only operators and webmasters can convert leads
    if (role !== 'operator' && role !== 'webmaster') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions'
          }
        },
        { status: 403 }
      );
    }

    const { leadId } = await params;

    // Get current firm for operators
    const firm = await getCurrentFirm();
    console.log('Firm:', firm.id);

    // Verify lead exists and belongs to user's firm (or if webmaster)
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        firmId: role === 'operator' ? userOrgId : undefined, // Webmasters can access any firm
      }
    });
    console.log('Lead found:', !!lead, lead?.status, lead?.firmId);

    if (!lead) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'LEAD_NOT_FOUND',
            message: 'Lead not found or access denied'
          }
        },
        { status: 404 }
      );
    }

    // Check if lead is already converted
    if (lead.status === 'CONVERTED') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'LEAD_ALREADY_CONVERTED',
            message: 'Lead has already been converted to a case'
          }
        },
        { status: 400 }
      );
    }

    // Check for existing active case with same email to prevent duplicates
    const existingActiveCase = await prisma.case.findFirst({
      where: {
        firmId: firm.id,
        email: lead.email,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    console.log('Existing active case check:', !!existingActiveCase, existingActiveCase?.id);

    if (existingActiveCase) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_ACTIVE_CASE',
            message: 'An active case already exists for this email address'
          }
        },
        { status: 409 }
      );
    }

    // Use transaction to allocate case number and create case atomically
    const result = await prisma.$transaction(async (tx) => {
      // Get and increment the case number counter
      const counter = await tx.firmCounter.findUnique({
        where: { firmId: firm.id },
      });

      if (!counter) {
        throw new Error('Firm counter not found');
      }

      const caseNumber = counter.nextCaseNumber;

      // Increment the counter
      await tx.firmCounter.update({
        where: { firmId: firm.id },
        data: { nextCaseNumber: { increment: 1 } },
      });

      // Create the case
      const newCase = await tx.case.create({
        data: {
          firmId: firm.id,
          leadId: lead.id,
          caseNumber,
          email: lead.email,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          caseNumber: true,
          status: true,
          createdAt: true,
        }
      });

      // Update lead status to CONVERTED
      await tx.lead.update({
        where: { id: leadId },
        data: { status: 'CONVERTED' },
      });

      return { newCase, caseNumber };
    });

    const response = {
      success: true,
      caseId: result.newCase.id,
      caseNumber: result.newCase.caseNumber,
    };
    console.log('API returning success:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error converting lead to case:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to convert lead to case'
        }
      },
      { status: 500 }
    );
  }
}
