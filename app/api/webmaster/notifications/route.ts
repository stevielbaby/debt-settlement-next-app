/**
 * GET /api/webmaster/notifications
 * Get notifications for webmaster
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { sql } from "@/app/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "webmaster") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get notifications (both read and unread)
    const notifications = await sql`
      SELECT
        id,
        type,
        title,
        message,
        data,
        read,
        created_at,
        read_at
      FROM notifications
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const formattedNotifications = notifications.map(notification => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      read: notification.read,
      createdAt: notification.created_at,
      readAt: notification.read_at,
    }));

    return NextResponse.json({
      success: true,
      notifications: formattedNotifications,
    });
  } catch (error: any) {
    console.error("Get notifications error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/webmaster/notifications
 * Mark notifications as read
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "webmaster") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { notificationIds } = body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { success: false, error: "notificationIds array required" },
        { status: 400 }
      );
    }

    // Mark notifications as read
    await sql`
      UPDATE notifications
      SET read = true, read_at = NOW()
      WHERE id = ANY(${notificationIds})
    `;

    return NextResponse.json({
      success: true,
      message: `Marked ${notificationIds.length} notifications as read`,
    });
  } catch (error: any) {
    console.error("Mark notifications read error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}
