import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { userId, orgRole } = await auth();

    // Only RANZ admins can access SMS logs
    if (!userId || orgRole !== "org:admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    // Parse query parameters
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const status = searchParams.get("status"); // PENDING, SENT, FAILED
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search"); // recipient phone search

    // Build where clause
    const where: Record<string, unknown> = {
      channel: "SMS",
    };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.createdAt as Record<string, Date>).lte = new Date(endDate);
      }
    }

    if (search) {
      where.recipient = {
        contains: search,
        mode: "insensitive",
      };
    }

    // Get total count for pagination
    const totalCount = await db.notification.count({ where });

    // Get paginated results
    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        createdAt: true,
        recipient: true,
        message: true,
        status: true,
        sentAt: true,
        externalId: true, // Twilio SID
        failureReason: true,
        retryCount: true,
        lastRetryAt: true,
        nextRetryAt: true,
        type: true,
        priority: true,
        organizationId: true,
      },
    });

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch SMS logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch SMS logs" },
      { status: 500 }
    );
  }
}
