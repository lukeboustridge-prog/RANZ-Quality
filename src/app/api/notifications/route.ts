import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  getUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/notifications";
import { z } from "zod/v4";

// GET - Get user's notifications
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = parseInt(searchParams.get("limit") || "20");

    if (unreadOnly) {
      const notifications = await getUnreadNotifications(userId);
      return NextResponse.json({ notifications });
    }

    // Get all notifications for user
    const notifications = await db.notification.findMany({
      where: {
        OR: [
          { userId },
          { userId: null, organizationId: null }, // System-wide notifications
        ],
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const unreadCount = await db.notification.count({
      where: {
        userId,
        channel: "IN_APP",
        readAt: null,
      },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

const markReadSchema = z.object({
  notificationId: z.string().optional(),
  markAll: z.boolean().optional(),
});

// POST - Mark notifications as read
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = markReadSchema.parse(body);

    if (data.markAll) {
      await markAllNotificationsRead(userId);
      return NextResponse.json({ success: true, markedAll: true });
    }

    if (data.notificationId) {
      // Verify notification belongs to user
      const notification = await db.notification.findUnique({
        where: { id: data.notificationId },
      });

      if (!notification || notification.userId !== userId) {
        return NextResponse.json(
          { error: "Notification not found" },
          { status: 404 }
        );
      }

      await markNotificationRead(data.notificationId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Missing notificationId or markAll flag" },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Failed to mark notification as read:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}
