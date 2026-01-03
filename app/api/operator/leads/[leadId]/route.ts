import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';

/**
 * GET /api/operator/leads/:leadId
 *
 * Get detailed information for a specific lead.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // @ts-ignore - Extended session properties from auth.d.ts
    const role = session.user.role;
    // @ts-ignore - Extended session properties from auth.d.ts
    const orgId = session.user.orgId;

    // Only operators and webmasters can access leads
    if (role !== 'operator' && role !== 'webmaster') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { leadId } = await params;

    // Validate leadId is a valid UUID
    if (!leadId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_LEAD_ID',
            message: 'Invalid lead ID format',
          },
        },
        { status: 400 }
      );
    }

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

    // Build query based on role
    let leadQuery = {
      where: {
        id: leadId,
        firmId: firm.id,
      },
    };

    // Webmasters can see all leads, operators see only their org's leads
    if (role === 'operator') {
      // TODO: Add org-based filtering when multi-tenant
      // For now, all operators can see all leads in single-tenant mode
    }

    const lead = await prisma.lead.findFirst(leadQuery);

    if (!lead) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'LEAD_NOT_FOUND',
            message: 'Lead not found',
          },
        },
        { status: 404 }
      );
    }

    // Check if lead has been converted to a case
    const existingCase = await prisma.case.findFirst({
      where: {
        leadId: lead.id,
      },
      select: {
        id: true,
        caseNumber: true,
        status: true,
        createdAt: true,
      },
    });

    // Check for active cases with same email (duplicate prevention)
    const activeCaseWithEmail = await prisma.case.findFirst({
      where: {
        firmId: firm.id,
        email: lead.email,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        caseNumber: true,
      },
    });

    // Get submissions for this lead
    const submissions = await prisma.intakeSubmission.findMany({
      where: {
        leadId: lead.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Determine conversion capability
    const canConvert = !existingCase && !activeCaseWithEmail &&
                      ['NEW', 'CONTACTED', 'QUALIFIED'].includes(lead.status);

    const conversionBlockReason = !canConvert ?
      (existingCase ? 'already_converted' :
       activeCaseWithEmail ? 'active_case_exists' :
       'invalid_status') : undefined;

    // Format the response according to contract
    const leadDetail = {
      id: lead.id,
      status: lead.status,
      type: lead.type,
      email: lead.email,
      fullName: lead.fullName,
      phone: lead.phone,
      debtAmount: lead.debtAmount,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),

      // Intake payload (use latest submission)
      intakePayload: submissions.length > 0 ? {
        version: 1, // TODO: Add version tracking to schema
        data: submissions[0].payload
      } : null,

      // Submission history
      submissions: submissions.map(submission => ({
        id: submission.id,
        createdAt: submission.createdAt.toISOString(),
        payloadVersion: 1, // TODO: Add version tracking
      })),

      // Conversion status
      canConvert,
      conversionBlockReason,

      // Related entities
      relatedCases: existingCase ? [{
        id: existingCase.id,
        caseNumber: existingCase.caseNumber || 0,
        status: existingCase.status,
        createdAt: existingCase.createdAt.toISOString(),
      }] : [],
    };

    return NextResponse.json({
      success: true,
      lead: leadDetail,
    });
  } catch (error) {
    console.error('Error fetching lead detail:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch lead details',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/operator/leads/:leadId
 *
 * Update lead status with server-side validation.
 */
export async function PATCH(
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

    // Only operators can update lead status
    if (role !== 'operator') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only operators can update lead status'
          }
        },
        { status: 403 }
      );
    }

    const { leadId } = await params;
    const { status } = await request.json();

    // Validate status transition
    const validStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'ARCHIVED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Invalid status value'
          }
        },
        { status: 400 }
      );
    }

    // Get current lead
    const currentLead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { status: true, firmId: true }
    });

    if (!currentLead) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'LEAD_NOT_FOUND',
            message: 'Lead not found'
          }
        },
        { status: 404 }
      );
    }

    // Validate status transition
    const allowedTransitions: Record<string, string[]> = {
      'NEW': ['CONTACTED', 'QUALIFIED', 'ARCHIVED'],
      'CONTACTED': ['QUALIFIED', 'ARCHIVED'],
      'QUALIFIED': ['CONVERTED', 'ARCHIVED'],
      'CONVERTED': [], // Immutable
      'ARCHIVED': []   // Immutable
    };

    if (!allowedTransitions[currentLead.status]?.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_TRANSITION',
            message: `Cannot change status from ${currentLead.status} to ${status}`
          }
        },
        { status: 400 }
      );
    }

    // Update the lead
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: status as any,
        updatedAt: new Date()
      },
      select: {
        id: true,
        status: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      success: true,
      lead: {
        id: updatedLead.id,
        status: updatedLead.status,
        updatedAt: updatedLead.updatedAt.toISOString()
      }
    });

  } catch (error) {
    console.error('Error updating lead status:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update lead status'
        }
      },
      { status: 500 }
    );
  }
}
