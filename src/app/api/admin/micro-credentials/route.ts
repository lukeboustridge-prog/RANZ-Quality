import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(3).max(200),
  level: z.number().int().min(1).max(10),
  skillStandard: z.string().max(200).optional(),
  issuingBody: z.string().min(1).max(200),
  requirements: z.string().max(2000).optional(),
});

const DEFAULT_CREDENTIALS = [
  {
    title: "Reclad/Reroofing Level 5",
    level: 5,
    skillStandard: "NZQA Skill Standard - Reclad/Reroofing",
    issuingBody: "RANZ",
    requirements:
      "Completion of RANZ RoofWright Level 5 assessment for reclad and reroofing projects. Covers scope management, weathertightness detailing, and compliance documentation.",
    isDefault: true,
  },
  {
    title: "Repairs/Maintenance Level 5",
    level: 5,
    skillStandard: "NZQA Skill Standard - Repairs/Maintenance",
    issuingBody: "RANZ",
    requirements:
      "Completion of RANZ RoofWright Level 5 assessment for repair and maintenance work. Covers diagnostic assessment, material selection, and warranty management.",
    isDefault: true,
  },
  {
    title: "Compliance Practices Level 4",
    level: 4,
    skillStandard: "NZQA Skill Standard - Compliance Practices",
    issuingBody: "RANZ",
    requirements:
      "Completion of RANZ RoofWright Level 4 assessment for building compliance practices. Covers Building Act requirements, consent processes, and record of work procedures.",
    isDefault: true,
  },
];

export async function GET() {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const metadata = sessionClaims?.metadata as { role?: string } | undefined;
    const userRole = metadata?.role;
    if (userRole !== "ranz:admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Auto-seed default credentials if none exist
    const defaultCount = await db.microCredentialDefinition.count({
      where: { isDefault: true },
    });

    if (defaultCount === 0) {
      await db.microCredentialDefinition.createMany({
        data: DEFAULT_CREDENTIALS,
        skipDuplicates: true,
      });
    }

    const definitions = await db.microCredentialDefinition.findMany({
      orderBy: [{ level: "desc" }, { title: "asc" }],
      include: {
        _count: {
          select: { staffCredentials: true },
        },
      },
    });

    return NextResponse.json(definitions);
  } catch (error) {
    console.error("Failed to fetch micro-credential definitions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const metadata = sessionClaims?.metadata as { role?: string } | undefined;
    const userRole = metadata?.role;
    if (userRole !== "ranz:admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const definition = await db.microCredentialDefinition.create({
      data: {
        ...parsed.data,
        isDefault: false,
      },
    });

    await createAuditLog({
      action: "CREATE",
      resourceType: "MicroCredentialDefinition",
      resourceId: definition.id,
      newState: {
        title: definition.title,
        level: definition.level,
        issuingBody: definition.issuingBody,
        skillStandard: definition.skillStandard,
      },
    });

    return NextResponse.json(definition, { status: 201 });
  } catch (error) {
    console.error("Failed to create micro-credential definition:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
