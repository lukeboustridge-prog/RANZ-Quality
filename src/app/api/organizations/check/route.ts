import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod/v4";

const checkSchema = z.object({
  name: z.string().min(1),
  nzbn: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = checkSchema.parse(body);

    let nzbnConflict = false;
    const duplicates: Array<{
      id: string;
      name: string;
      tradingName: string | null;
      nzbn: string | null;
      email: string | null;
    }> = [];

    // Check NZBN exact match (hard conflict)
    if (data.nzbn) {
      const nzbnMatch = await db.organization.findUnique({
        where: { nzbn: data.nzbn },
        select: { id: true, name: true, tradingName: true, nzbn: true, email: true },
      });

      if (nzbnMatch) {
        nzbnConflict = true;
        duplicates.push(nzbnMatch);
      }
    }

    // Check case-insensitive name match
    const nameMatches = await db.organization.findMany({
      where: {
        name: { equals: data.name, mode: "insensitive" },
      },
      select: { id: true, name: true, tradingName: true, nzbn: true, email: true },
    });

    for (const match of nameMatches) {
      if (!duplicates.some((d) => d.id === match.id)) {
        duplicates.push(match);
      }
    }

    return NextResponse.json({ duplicates, nzbnConflict });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Failed to check organization duplicates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
