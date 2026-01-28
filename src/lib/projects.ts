import { db } from "@/lib/db";
import type { ProjectType, ProjectStatus, PhotoCategory } from "@/types";

// Generate unique project number (e.g., PRJ-2026-001)
export async function generateProjectNumber(
  organizationId: string
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PRJ-${year}-`;

  // Get the count of projects for this org this year
  const count = await db.project.count({
    where: {
      organizationId,
      projectNumber: { startsWith: prefix },
    },
  });

  const number = (count + 1).toString().padStart(3, "0");
  return `${prefix}${number}`;
}

interface CreateProjectParams {
  organizationId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  siteAddress: string;
  city?: string;
  region?: string;
  consentNumber?: string;
  startDate: Date;
  completionDate?: Date;
  projectType: ProjectType;
  roofingSystem?: string;
  description?: string;
  warrantyYears?: number;
}

export async function createProject(params: CreateProjectParams) {
  const projectNumber = await generateProjectNumber(params.organizationId);

  return db.project.create({
    data: {
      ...params,
      projectNumber,
      status: "IN_PROGRESS",
    },
  });
}

export async function updateProjectStatus(
  projectId: string,
  status: ProjectStatus
) {
  const updateData: Record<string, unknown> = { status };

  if (status === "COMPLETED") {
    updateData.completionDate = new Date();
  }

  return db.project.update({
    where: { id: projectId },
    data: updateData,
  });
}

interface AddProjectPhotoParams {
  projectId: string;
  storageKey: string;
  thumbnailKey?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: PhotoCategory;
  capturedAt?: Date;
  latitude?: number;
  longitude?: number;
  deviceInfo?: string;
  description?: string;
  tags?: string[];
  uploadedBy: string;
}

export async function addProjectPhoto(params: AddProjectPhotoParams) {
  return db.projectPhoto.create({
    data: params,
  });
}

export async function getProjectWithDetails(projectId: string) {
  return db.project.findUnique({
    where: { id: projectId },
    include: {
      photos: {
        orderBy: { uploadedAt: "desc" },
      },
      documents: {
        orderBy: { uploadedAt: "desc" },
      },
      productsUsed: true,
      testimonial: true,
      organization: {
        select: {
          id: true,
          name: true,
          tradingName: true,
          certificationTier: true,
        },
      },
    },
  });
}

export async function getOrganizationProjects(
  organizationId: string,
  options?: {
    status?: ProjectStatus;
    limit?: number;
    offset?: number;
  }
) {
  const { status, limit = 20, offset = 0 } = options || {};

  const where: Record<string, unknown> = { organizationId };
  if (status) where.status = status;

  const [projects, total] = await Promise.all([
    db.project.findMany({
      where,
      include: {
        _count: {
          select: { photos: true, documents: true },
        },
        testimonial: {
          select: { rating: true, verified: true },
        },
      },
      orderBy: { startDate: "desc" },
      take: limit,
      skip: offset,
    }),
    db.project.count({ where }),
  ]);

  return { projects, total };
}

// Calculate project statistics for an organization
export async function getProjectStats(organizationId: string) {
  const projects = await db.project.findMany({
    where: { organizationId },
    select: {
      status: true,
      projectType: true,
      rating: true,
      zeroLeaks: true,
      completionDate: true,
    },
  });

  const byStatus = projects.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const byType = projects.reduce(
    (acc, p) => {
      acc[p.projectType] = (acc[p.projectType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const ratings = projects.filter((p) => p.rating !== null).map((p) => p.rating!);
  const avgRating = ratings.length > 0
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : null;

  const zeroLeakRate = projects.length > 0
    ? (projects.filter((p) => p.zeroLeaks).length / projects.length) * 100
    : 100;

  const completedThisYear = projects.filter(
    (p) =>
      p.status === "COMPLETED" &&
      p.completionDate &&
      p.completionDate.getFullYear() === new Date().getFullYear()
  ).length;

  return {
    total: projects.length,
    byStatus,
    byType,
    avgRating,
    zeroLeakRate,
    completedThisYear,
  };
}

// Add certified product to a project
export async function addCertifiedProduct(params: {
  projectId: string;
  productName: string;
  manufacturer: string;
  productCode?: string;
  batchNumber?: string;
  apexCertified: boolean;
  apexCertId?: string;
  justification?: string;
  quantity?: string;
}) {
  // If not APEX certified, justification is required
  if (!params.apexCertified && !params.justification) {
    throw new Error("Justification required for non-APEX certified products");
  }

  return db.certifiedProductUsage.create({
    data: params,
  });
}

// Request testimonial from client
export async function requestTestimonial(params: {
  organizationId: string;
  projectId?: string;
  clientName: string;
  clientEmail: string;
  clientCompany?: string;
  clientLocation?: string;
}) {
  const verificationToken = generateVerificationToken();

  const testimonial = await db.testimonial.create({
    data: {
      organizationId: params.organizationId,
      projectId: params.projectId,
      clientName: params.clientName,
      clientEmail: params.clientEmail,
      clientCompany: params.clientCompany,
      clientLocation: params.clientLocation,
      rating: 0, // Will be set when client submits
      content: "", // Will be set when client submits
      verificationToken,
      requestedAt: new Date(),
      requestSentTo: params.clientEmail,
    },
  });

  // TODO: Send email to client with verification link
  // The link would be: /testimonial/submit?token=${verificationToken}

  return testimonial;
}

function generateVerificationToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Submit testimonial (public endpoint for clients)
export async function submitTestimonial(params: {
  verificationToken: string;
  rating: number;
  title?: string;
  content: string;
}) {
  const testimonial = await db.testimonial.findUnique({
    where: { verificationToken: params.verificationToken },
  });

  if (!testimonial) {
    throw new Error("Invalid verification token");
  }

  if (testimonial.verified) {
    throw new Error("Testimonial already submitted");
  }

  return db.testimonial.update({
    where: { id: testimonial.id },
    data: {
      rating: params.rating,
      title: params.title,
      content: params.content,
      verified: true,
      verifiedAt: new Date(),
    },
  });
}

// Approve testimonial for display
export async function approveTestimonial(
  testimonialId: string,
  approvedBy: string,
  featured?: boolean
) {
  return db.testimonial.update({
    where: { id: testimonialId },
    data: {
      approved: true,
      approvedAt: new Date(),
      approvedBy,
      featured: featured ?? false,
    },
  });
}

// Get approved testimonials for public display
export async function getApprovedTestimonials(
  organizationId: string,
  options?: {
    limit?: number;
    featuredOnly?: boolean;
  }
) {
  const { limit = 10, featuredOnly = false } = options || {};

  const where: Record<string, unknown> = {
    organizationId,
    verified: true,
    approved: true,
  };

  if (featuredOnly) {
    where.featured = true;
  }

  return db.testimonial.findMany({
    where,
    select: {
      id: true,
      clientName: true,
      clientCompany: true,
      clientLocation: true,
      rating: true,
      title: true,
      content: true,
      featured: true,
      verifiedAt: true,
      project: {
        select: {
          projectType: true,
          city: true,
        },
      },
    },
    orderBy: [{ featured: "desc" }, { verifiedAt: "desc" }],
    take: limit,
  });
}
