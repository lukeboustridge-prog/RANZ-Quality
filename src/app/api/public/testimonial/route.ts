import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { submitTestimonial } from "@/lib/projects";
import { z } from "zod/v4";

// GET - Verify token and return testimonial info
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Missing verification token" },
        { status: 400 }
      );
    }

    const testimonial = await db.testimonial.findUnique({
      where: { verificationToken: token },
      include: {
        organization: {
          select: { name: true },
        },
        project: {
          select: { projectType: true, city: true },
        },
      },
    });

    if (!testimonial) {
      return NextResponse.json(
        { error: "Invalid verification token" },
        { status: 404 }
      );
    }

    if (testimonial.verified) {
      return NextResponse.json(
        { error: "Testimonial already submitted" },
        { status: 400 }
      );
    }

    // Return minimal info for the submission form
    return NextResponse.json({
      clientName: testimonial.clientName,
      organizationName: testimonial.organization.name,
      projectDescription: testimonial.project
        ? `${testimonial.project.projectType.replace(/_/g, " ")} in ${testimonial.project.city || "your area"}`
        : null,
    });
  } catch (error) {
    console.error("Failed to verify testimonial token:", error);
    return NextResponse.json(
      { error: "Failed to verify token" },
      { status: 500 }
    );
  }
}

const submitSchema = z.object({
  verificationToken: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(100).optional(),
  content: z.string().min(20).max(500),
});

// POST - Submit testimonial
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = submitSchema.parse(body);

    const testimonial = await submitTestimonial({
      verificationToken: data.verificationToken,
      rating: data.rating,
      title: data.title,
      content: data.content,
    });

    return NextResponse.json({
      success: true,
      message: "Testimonial submitted successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Failed to submit testimonial:", error);
    return NextResponse.json(
      { error: "Failed to submit testimonial" },
      { status: 500 }
    );
  }
}
