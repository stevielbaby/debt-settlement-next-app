import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { z } from 'zod';

/**
 * GET /api/operator/cases/search
 *
 * Search cases by query term with optional filters.
 * Optional alias to the main cases list endpoint.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // @ts-ignore - Extended session properties from auth.d.ts
    const role = session.user.role;

    // Only operators and webmasters can search cases
    if (role !== 'operator' && role !== 'webmaster') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const status = searchParams.get('status');
    const limitParam = searchParams.get('limit');

    // Validate parameters
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 50;

    // Validate status if provided
    if (status && !['ACTIVE', 'CLOSED'].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Status must be ACTIVE or CLOSED',
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

    // Build search conditions
    const whereConditions: any = {
      firmId: firm.id,
    };

    // Add status filter if provided
    if (status) {
      whereConditions.status = status === 'ACTIVE' ? 'ACTIVE' : 'CLOSED';
    }

    // Add search query if provided
    if (q.trim()) {
      whereConditions.OR = [
        // Search by case number (exact match)
        { caseNumber: !isNaN(Number(q)) ? Number(q) : undefined },
        // Search by email (case-insensitive)
        { email: { contains: q, mode: 'insensitive' } },
        // Search by lead name (case-insensitive)
        { lead: { fullName: { contains: q, mode: 'insensitive' } } },
      ].filter(condition => condition.caseNumber !== undefined || Object.keys(condition).length > 1);
    }

    // Execute search
    const cases = await prisma.case.findMany({
      where: whereConditions,
      include: {
        lead: {
          select: {
            fullName: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Get total count for pagination info (simplified)
    const total = await prisma.case.count({
      where: whereConditions,
    });

    // Format response
    const formattedCases = cases.map(caseRecord => ({
      id: caseRecord.id,
      caseNumber: caseRecord.caseNumber,
      email: caseRecord.email,
      status: caseRecord.status,
      createdAt: caseRecord.createdAt.toISOString(),
      closedAt: caseRecord.closedAt?.toISOString(),
      lead: caseRecord.lead ? {
        fullName: caseRecord.lead.fullName,
        phone: caseRecord.lead.phone,
      } : undefined,
    }));

    return NextResponse.json({
      success: true,
      cases: formattedCases,
      total,
      limit,
    });
  } catch (error) {
    console.error('Error searching cases:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search cases',
        },
      },
      { status: 500 }
    );
  }
}


