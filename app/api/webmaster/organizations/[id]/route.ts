import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/app/lib/db";
import { getStripeCustomerId } from "@/lib/stripe-db";
import { getOrCreateStripeCustomer } from "@/lib/stripe";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'webmaster') {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get organization with subscription data
    const organization = await prisma.firm.findUnique({
      where: { id },
      include: {
        subscriptions: {
          include: {
            plan: true
          }
        },
        users: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true
          }
        }
      }
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: "Organization not found" },
        { status: 404 }
      );
    }

    // Check if Stripe customer exists
    const stripeCustomerId = await getStripeCustomerId(id);

    // Format response
    const formattedOrg = {
      id: organization.id,
      name: organization.name,
      email: organization.publicEmail,
      subscription_status: organization.subscriptions?.[0]?.status?.toLowerCase() || 'inactive',
      plan_name: organization.subscriptions?.[0]?.plan?.name || null,
      monthly_limit: 100, // TODO: Add to plan model
      current_usage: 0, // TODO: Calculate from metrics
      created_at: organization.createdAt.toISOString(),
      has_stripe_customer: !!stripeCustomerId,
      stripe_customer_id: stripeCustomerId
    };

    const formattedUsers = organization.users.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      created_at: user.createdAt.toISOString()
    }));

    return NextResponse.json({
      success: true,
      organization: formattedOrg,
      users: formattedUsers
    });
  } catch (error) {
    console.error("Get organization error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch organization" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'webmaster') {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === 'create_stripe_customer') {
      // Get organization details
      const organization = await prisma.firm.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          publicEmail: true
        }
      });

      if (!organization) {
        return NextResponse.json(
          { success: false, error: "Organization not found" },
          { status: 404 }
        );
      }

      if (!organization.publicEmail) {
        return NextResponse.json(
          { success: false, error: "Organization must have a public email to create Stripe customer" },
          { status: 400 }
        );
      }

      // Check if Stripe customer already exists
      const existingCustomerId = await getStripeCustomerId(id);
      if (existingCustomerId) {
        return NextResponse.json(
          { success: false, error: "Stripe customer already exists for this organization" },
          { status: 400 }
        );
      }

      // Create Stripe customer
      const stripeCustomer = await getOrCreateStripeCustomer(
        id,
        organization.publicEmail,
        organization.name
      );

      // Save Stripe customer ID to database
      await prisma.firm.update({
        where: { id },
        data: {
          stripeCustomerId: stripeCustomer.id,
          updatedAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: "Stripe customer created successfully",
        stripe_customer_id: stripeCustomer.id
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Organization action error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 }
    );
  }
}
