import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { getCurrentFirm } from '@/lib/utils';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // @ts-ignore - Extended session properties from auth.d.ts
    const role = session.user.role;
    // @ts-ignore - Extended session properties from auth.d.ts
    const userOrgId = session.user.orgId;

    // Only operators and webmasters can access cases
    if (role !== 'operator' && role !== 'webmaster') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Get current firm for filtering
    const firm = await getCurrentFirm();

    // Build where clause based on role
    const whereClause = {
      firmId: firm.id
    };

    // Operators can only see cases from their own firm
    if (role === 'operator') {
      // In single-tenant mode, all operators see all cases
      // In multi-tenant mode, this would filter by userOrgId
    }

    // Query cases with related lead and firm data
    const casesData = await prisma.case.findMany({
      where: whereClause,
      include: {
        lead: true,
        firm: true,
        booking: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform data to match frontend expectations
    const cases = casesData.map(caseData => {
      // Split lead fullName into firstName and lastName
      const nameParts = caseData.lead?.fullName?.split(' ') || ['', ''];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      return {
        id: caseData.id,
        caseNumber: caseData.caseNumber?.toString() || '',
        firstName: firstName,
        lastName: lastName,
        email: caseData.email,
        phone: caseData.lead?.phone || '',
        status: caseData.status.toLowerCase(),
        priority: 'normal', // Default priority since not in schema yet
        organization: caseData.firm.name,
        createdAt: caseData.createdAt.toISOString()
      };
    });

    return NextResponse.json({
      success: true,
      cases,
    });
  } catch (error) {
    console.error('Error fetching cases:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cases' },
      { status: 500 }
    );
  }
}

export async function PATCH() {
  // PATCH method not implemented yet - return method not allowed
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'PATCH method not implemented for cases'
      }
    },
    { status: 405 }
  );
}
