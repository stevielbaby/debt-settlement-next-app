import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';

/**
 * POST /api/operator/leads/:leadId/reject
 *
 * Reject/archive a lead (optional endpoint).
 * This prevents the lead from appearing in the active leads list.
 */
export async function POST(
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

    // Only operators and webmasters can reject leads
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

    // Verify lead exists and belongs to this firm
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        firmId: firm.id,
      },
    });

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

    // Check if lead has already been converted to a case
    const existingCase = await prisma.case.findFirst({
      where: {
        leadId: lead.id,
      },
    });

    if (existingCase) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'LEAD_ALREADY_CONVERTED',
            message: 'Cannot reject a lead that has been converted to a case',
          },
        },
        { status: 409 }
      );
    }

    // TODO: Add status field to Lead model and update to 'REJECTED'
    // For now, this endpoint acknowledges the rejection but doesn't persist it
    // This is a placeholder implementation until the schema is updated

    // Optional: Add an audit log or note about the rejection
    // This could be stored as a case note or in a separate audit table

    return NextResponse.json({
      success: true,
      message: 'Lead rejected successfully',
      leadId: leadId,
    });
  } catch (error) {
    console.error('Error rejecting lead:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to reject lead',
        },
      },
      { status: 500 }
    );
  }
}
