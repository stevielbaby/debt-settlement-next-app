import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { getCurrentFirm } from '@/lib/utils';
import { LeadStatus } from '@prisma/client';

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

    // Only operators and webmasters can access leads
    if (role !== 'operator' && role !== 'webmaster') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Get current firm for filtering
    const firm = await getCurrentFirm();

    // Build where clause based on role
    const whereClause = {
      firmId: firm.id,
      status: {
        not: LeadStatus.CONVERTED
      }
    };

    // Operators can only see leads from their own firm
    if (role === 'operator') {
      // In single-tenant mode, all operators see all leads
      // In multi-tenant mode, this would filter by userOrgId
    }

    // Query leads with related submissions and firm
    const leadsData = await prisma.lead.findMany({
      where: whereClause,
      include: {
        submissions: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1 // Get the latest submission for situation data
        },
        firm: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform data to match frontend expectations
    const leads = leadsData.map(lead => {
      // Split fullName into first_name and last_name
      const nameParts = lead.fullName?.split(' ') || ['', ''];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Get situation from the latest submission payload
      const latestSubmission = lead.submissions[0];
      const payload = latestSubmission?.payload as any; // Cast to any for JSON access
      const situation = payload?.situation || '';

      // Get current_company from payload if available
      const currentCompany = payload?.current_company || '';

      return {
        id: lead.id, // This is a CUID string, not number
        case_number: null, // Not applicable for unconverted leads
        first_name: firstName,
        last_name: lastName,
        email: lead.email,
        phone: lead.phone || '',
        situation: situation,
        debt_amount: lead.debtAmount ? `$${lead.debtAmount.toLocaleString()}` : 'Not specified',
        current_company: currentCompany,
        converted: false, // Since we filtered out converted leads
        created_at: lead.createdAt.toISOString(),
        updated_at: lead.updatedAt.toISOString(),
        organization: lead.firm.name
      };
    });

    return NextResponse.json({
      success: true,
      leads,
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}
