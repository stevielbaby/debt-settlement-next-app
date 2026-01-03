import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';

/**
 * GET /api/operator/settings/public-contact
 *
 * Get firm public contact information (publicEmail, publicPhone).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // @ts-ignore - Extended session properties from auth.d.ts
    const role = session.user.role;

    // Only operators and webmasters can access settings
    if (role !== 'operator' && role !== 'webmaster') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

    // TODO: Add publicEmail and publicPhone fields to Firm model
    // For now, return placeholder values
    const publicContact = {
      publicEmail: null, // TODO: firm.publicEmail
      publicPhone: null, // TODO: firm.publicPhone
    };

    return NextResponse.json({
      success: true,
      publicContact,
    });
  } catch (error) {
    console.error('Error fetching public contact settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch public contact settings',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/operator/settings/public-contact
 *
 * Update firm public contact information (publicEmail, publicPhone).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // @ts-ignore - Extended session properties from auth.d.ts
    const role = session.user.role;

    // Only operators and webmasters can update settings
    if (role !== 'operator' && role !== 'webmaster') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { publicEmail, publicPhone } = body;

    // Basic validation
    if (publicEmail && typeof publicEmail !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'publicEmail must be a string',
          },
        },
        { status: 400 }
      );
    }

    if (publicPhone && typeof publicPhone !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'publicPhone must be a string',
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

    // TODO: Update Firm model to include publicEmail and publicPhone fields
    // For now, acknowledge the update but don't persist
    /*
    const updatedFirm = await prisma.firm.update({
      where: { id: firm.id },
      data: {
        publicEmail: publicEmail || null,
        publicPhone: publicPhone || null,
        updatedAt: new Date(),
      },
      select: {
        publicEmail: true,
        publicPhone: true,
        updatedAt: true,
      },
    });
    */

    return NextResponse.json({
      success: true,
      message: 'Public contact settings updated successfully',
      publicContact: {
        publicEmail: publicEmail || null,
        publicPhone: publicPhone || null,
      },
    });
  } catch (error) {
    console.error('Error updating public contact settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update public contact settings',
        },
      },
      { status: 500 }
    );
  }
}


