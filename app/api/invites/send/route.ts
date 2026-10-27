import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/app/lib/db";
import { generateInviteCode } from "@/lib/organization-linking";
import { sendInviteCodeEmail } from "@/lib/email";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "operator" && session.user.role !== "webmaster")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const recipientName = String(body.name || "").trim();
    const requestedOrgId = typeof body.organizationId === "string" ? body.organizationId : null;

    if (!emailPattern.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    let organizationId = session.user.orgId;
    if (session.user.role === "webmaster" && requestedOrgId) {
      organizationId = requestedOrgId;
    }
    if (session.user.role === "operator" && requestedOrgId && requestedOrgId !== session.user.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (!organizationId) {
      return NextResponse.json({ error: "No organization assigned." }, { status: 400 });
    }

    const orgs = await sql`
      SELECT id, name, invite_code
      FROM app.organizations
      WHERE id = ${organizationId}
      LIMIT 1
    `;
    if (orgs.length === 0) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    let inviteCode = orgs[0].invite_code as string | null;
    if (!inviteCode) {
      inviteCode = generateInviteCode();
      await sql`
        UPDATE app.organizations
        SET invite_code = ${inviteCode}
        WHERE id = ${organizationId}
      `;
    }

    const origin = new URL(request.url).origin;
    const inviteLink = `${origin}/auth/join?code=${encodeURIComponent(inviteCode)}`;
    const organizationName = (orgs[0].name as string) || "your firm";

    const sent = await sendInviteCodeEmail({
      to: email,
      recipientName: recipientName || email.split("@")[0],
      organizationId,
      organizationName,
      inviteCode,
      inviteLink,
    });

    return NextResponse.json({
      success: true,
      id: sent.id,
      inviteCode,
      inviteLink,
    });
  } catch (error) {
    console.error("Invite email error:", error);
    const message = error instanceof Error ? error.message : "Failed to send the invite email.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
