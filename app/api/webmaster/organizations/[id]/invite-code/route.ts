/**
 * POST /api/webmaster/organizations/[id]/invite-code
 * Generate or regenerate an invite code for an organization
 * Webmasters can share this code with operators to join the organization
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { sql } from "@/app/lib/db";
import { generateInviteCode } from "@/lib/organization-linking";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "webmaster") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: organizationId } = await params;

    // Verify organization exists
    const orgResult = await sql`
      SELECT id, name, invite_code FROM app.organizations
      WHERE id = ${organizationId}
      LIMIT 1
    `;

    if (orgResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Organization not found" },
        { status: 404 }
      );
    }

    const org = orgResult[0];

    // Generate new invite code
    const inviteCode = generateInviteCode();

    // Update organization with new invite code
    const updated = await sql`
      UPDATE app.organizations
      SET invite_code = ${inviteCode}
      WHERE id = ${organizationId}
      RETURNING id, name, invite_code
    `;

    return NextResponse.json({
      success: true,
      inviteCode: inviteCode,
      organization: {
        id: updated[0].id,
        name: updated[0].name,
      },
      inviteLink: `/auth/join?code=${inviteCode}`,
      message: `Invite code generated: ${inviteCode}. Share this with operators to let them join your organization.`,
    });
  } catch (error) {
    console.error("Generate invite code error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate invite code" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "webmaster") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: organizationId } = await params;

    // Get organization invite code
    const orgResult = await sql`
      SELECT id, name, invite_code FROM app.organizations
      WHERE id = ${organizationId}
      LIMIT 1
    `;

    if (orgResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Organization not found" },
        { status: 404 }
      );
    }

    const org = orgResult[0];

    return NextResponse.json({
      success: true,
      organization: {
        id: org.id,
        name: org.name,
        inviteCode: org.invite_code,
      },
      inviteLink: org.invite_code ? `/auth/join?code=${org.invite_code}` : null,
    });
  } catch (error) {
    console.error("Get invite code error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch invite code" },
      { status: 500 }
    );
  }
}
