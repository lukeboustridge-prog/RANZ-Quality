import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { requestTestimonial, getApprovedTestimonials } from "@/lib/projects";
import { z } from "zod/v4";

const requestTestimonialSchema = z.object({
  projectId: z.string().optional(),
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.email("Valid email is required"),
  clientCompany: z.string().optional(),
  clientLocation: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organization = await db.organization.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const approvedOnly = searchParams.get("approved") === "true";
    const featuredOnly = searchParams.get("featured") === "true";

    if (approvedOnly || featuredOnly) {
      // Return approved testimonials for public display
      const testimonials = await getApprovedTestimonials(organization.id, {
        featuredOnly,
      });
      return NextResponse.json({ testimonials });
    }

    // Return all testimonials for management
    const testimonials = await db.testimonial.findMany({
      where: { organizationId: organization.id },
      include: {
        project: {
          select: {
            projectNumber: true,
            clientName: true,
            projectType: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ testimonials });
  } catch (error) {
    console.error("Failed to fetch testimonials:", error);
    return NextResponse.json(
      { error: "Failed to fetch testimonials" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organization = await db.organization.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const data = requestTestimonialSchema.parse(body);

    // If project specified, verify it belongs to organization
    if (data.projectId) {
      const project = await db.project.findUnique({
        where: { id: data.projectId },
      });

      if (!project || project.organizationId !== organization.id) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }

      // Check if project already has a testimonial
      const existing = await db.testimonial.findUnique({
        where: { projectId: data.projectId },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Testimonial already requested for this project" },
          { status: 400 }
        );
      }
    }

    const testimonial = await requestTestimonial({
      organizationId: organization.id,
      ...data,
    });

    // TODO: Send email to client with verification link

    return NextResponse.json(testimonial, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Failed to request testimonial:", error);
    return NextResponse.json(
      { error: "Failed to request testimonial" },
      { status: 500 }
    );
  }
}
