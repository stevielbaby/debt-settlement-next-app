import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql } from "@/app/lib/db";
import { parseBookingLink } from "@/app/lib/booking-link";

const TENANT = "default";

export async function GET() {
  try {
    const rows = await sql`
      SELECT booking_url
      FROM app.calendar_settings
      WHERE tenant_id = ${TENANT}
      LIMIT 1
    `;
    const stored = rows[0]?.booking_url as string | null | undefined;
    if (!stored) {
      return NextResponse.json({ success: true, url: null, provider: null });
    }

    const link = parseBookingLink(stored);
    return NextResponse.json({ success: true, url: link.url, provider: link.provider });
  } catch (error) {
    console.error("Read booking link error:", error);
    return NextResponse.json({ success: true, url: null, provider: null });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "operator" && role !== "webmaster") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  let link;
  try {
    link = parseBookingLink(String(body.url || ""));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid booking link";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await sql`
    INSERT INTO app.calendar_settings (
      id, tenant_id, calendar_id, timezone, duration_minutes, slot_template_json, booking_url
    )
    VALUES (
      'default', ${TENANT}, ${link.provider}, 'America/Phoenix', 60, '[]', ${link.url}
    )
    ON CONFLICT (id) DO UPDATE
    SET booking_url = EXCLUDED.booking_url,
        calendar_id = EXCLUDED.calendar_id
  `;

  return NextResponse.json({ success: true, url: link.url, provider: link.provider });
}

export async function DELETE() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "operator" && role !== "webmaster") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await sql`
    UPDATE app.calendar_settings
    SET booking_url = NULL
    WHERE tenant_id = ${TENANT}
  `;

  return NextResponse.json({ success: true, url: null, provider: null });
}
