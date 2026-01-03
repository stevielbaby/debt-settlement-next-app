import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { NextResponse } from 'next/server';
import { DEPLOYMENT_CONFIG, isSingleTenant, isMultiTenant } from '@/lib/deployment-config';

export async function GET() {
  try {
    const session = await auth();
    // @ts-ignore - Extended session properties from auth.d.ts
    if (!session?.user || session.user.role !== 'webmaster') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (isSingleTenant()) {
      // Single-tenant mode: Return only the singleton organization
      const singletonOrg = await prisma.firm.findUnique({
        where: { id: DEPLOYMENT_CONFIG.singletonOrg.id },
        include: {
          subscriptions: {
            include: {
              plan: true
            }
          }
        }
      });

      if (!singletonOrg) {
        // If singleton doesn't exist (shouldn't happen in proper setup), return empty
        return NextResponse.json({
          success: true,
          mode: 'single-tenant',
          organizations: [],
          capabilities: {
            canCreate: false,
            canEdit: false,
            canDelete: false,
            canProvision: false
          },
          message: "Singleton organization not found. This deployment may not be properly configured."
        });
      }

      const formattedOrg = {
        id: singletonOrg.id,
        name: singletonOrg.name,
        email: singletonOrg.publicEmail,
        type: 'PRIMARY' as const,
        isSingleton: true,
        status: 'active' as const,
        subscription_status: singletonOrg.subscriptions?.[0]?.status || 'inactive',
        plan_name: singletonOrg.subscriptions?.[0]?.plan?.name || 'Free',
        createdAt: singletonOrg.createdAt.toISOString(),
      };

      return NextResponse.json({
        success: true,
        mode: 'single-tenant',
        organizations: [formattedOrg],
        capabilities: {
          canCreate: false,
          canEdit: false,
          canDelete: false,
          canProvision: false
        },
        message: "This deployment operates in single-tenant mode. Organization management is handled through system configuration."
      });
    }

    if (isMultiTenant()) {
      // Multi-tenant mode: Return all organizations (when implemented)
      const organizations = await prisma.firm.findMany({
        include: {
          subscriptions: {
            include: {
              plan: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const formattedOrganizations = organizations.map(org => ({
        id: org.id,
        name: org.name,
        email: org.publicEmail,
        type: 'CLIENT' as const,
        status: 'active' as const,
        subscriptions_status: org.subscriptions?.[0]?.status || 'inactive',
        plan_name: org.subscriptions?.[0]?.plan?.name || 'Free',
        monthly_limit: 100, // TODO: Add to plan schema
        current_usage: 0, // TODO: Implement usage tracking
        createdAt: org.createdAt.toISOString(),
      }));

      return NextResponse.json({
        success: true,
        mode: 'multi-tenant',
        organizations: formattedOrganizations,
        capabilities: {
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canProvision: true
        }
      });
    }

    // Fallback
    return NextResponse.json({
      success: false,
      error: 'Invalid deployment configuration'
    }, { status: 500 });

  } catch (error) {
    console.error('Organizations fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    // @ts-ignore - Extended session properties from auth.d.ts
    if (!session?.user || session.user.role !== 'webmaster') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Prevent organization creation in single-tenant mode
    if (isSingleTenant()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Organization creation is disabled in single-tenant mode',
          message: 'This deployment operates in single-tenant mode. Organization management is handled through system configuration.'
        },
        { status: 403 }
      );
    }

    // Multi-tenant organization creation (when implemented)
    const { name, email } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required' },
        { status: 400 }
      );
    }

    const organization = await prisma.firm.create({
      data: {
        name,
        publicEmail: email
      },
      select: {
        id: true,
        name: true,
        publicEmail: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
        email: organization.publicEmail,
        created_at: organization.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Organization creation error:', error);

    if (error.message?.includes('unique constraint')) {
      return NextResponse.json(
        { success: false, error: 'An organization with this email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create organization' },
      { status: 500 }
    );
  }
}
