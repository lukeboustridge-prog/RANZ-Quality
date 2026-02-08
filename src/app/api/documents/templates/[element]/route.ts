import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ISO_TEMPLATE_GUIDES } from "@/lib/iso-templates";
import type { ISOElement } from "@prisma/client";

function generateMarkdownTemplate(element: ISOElement): string {
  const guide = ISO_TEMPLATE_GUIDES[element];
  if (!guide) return "";

  const date = new Date().toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const lines: string[] = [
    `# ${guide.number}. ${guide.name}`,
    "",
    `> RANZ Certified Business Programme - ISO Element ${guide.number}`,
    `> Template generated: ${date}`,
    `> Status: DRAFT - Replace placeholder text with your business-specific content`,
    "",
    "---",
    "",
    "## Purpose",
    "",
    guide.description,
    "",
    "---",
    "",
  ];

  // Generate sections for each example document
  for (const doc of guide.exampleDocuments) {
    lines.push(`## ${doc.title}`);
    lines.push("");
    lines.push(`**Document Type:** ${doc.type}`);
    lines.push("");
    lines.push(`*${doc.description}*`);
    lines.push("");
    lines.push("<!-- Replace the content below with your business-specific information -->");
    lines.push("");
    lines.push(`### [Your Business Name] - ${doc.title}`);
    lines.push("");

    // Generate placeholder content based on document type
    switch (doc.type) {
      case "POLICY":
        lines.push("**Effective Date:** [DD/MM/YYYY]");
        lines.push("**Review Date:** [DD/MM/YYYY]");
        lines.push("**Approved By:** [Name, Title]");
        lines.push("**Version:** 1.0");
        lines.push("");
        lines.push("### Policy Statement");
        lines.push("");
        lines.push("[Write your policy statement here. Describe your business's commitment and approach.]");
        lines.push("");
        lines.push("### Scope");
        lines.push("");
        lines.push("[Describe what this policy covers and who it applies to.]");
        lines.push("");
        lines.push("### Responsibilities");
        lines.push("");
        lines.push("| Role | Responsibility |");
        lines.push("|------|---------------|");
        lines.push("| Business Owner | [Describe responsibility] |");
        lines.push("| Site Supervisor | [Describe responsibility] |");
        lines.push("| All Staff | [Describe responsibility] |");
        lines.push("");
        lines.push("### Review");
        lines.push("");
        lines.push("This policy will be reviewed [annually / as required] by [role].");
        lines.push("");
        lines.push("---");
        lines.push("");
        lines.push("**Signature:** ________________________");
        lines.push("");
        lines.push("**Name:** [Business Owner/Director]");
        lines.push("");
        lines.push("**Date:** [DD/MM/YYYY]");
        break;

      case "PROCEDURE":
        lines.push("**Document Number:** [e.g., PROC-001]");
        lines.push("**Effective Date:** [DD/MM/YYYY]");
        lines.push("**Review Date:** [DD/MM/YYYY]");
        lines.push("**Version:** 1.0");
        lines.push("");
        lines.push("### 1. Purpose");
        lines.push("");
        lines.push("[Describe the purpose of this procedure.]");
        lines.push("");
        lines.push("### 2. Scope");
        lines.push("");
        lines.push("[Describe what this procedure covers.]");
        lines.push("");
        lines.push("### 3. Responsibilities");
        lines.push("");
        lines.push("| Role | Responsibility |");
        lines.push("|------|---------------|");
        lines.push("| [Role] | [Responsibility] |");
        lines.push("");
        lines.push("### 4. Procedure");
        lines.push("");
        lines.push("**Step 1:** [Describe step]");
        lines.push("");
        lines.push("**Step 2:** [Describe step]");
        lines.push("");
        lines.push("**Step 3:** [Describe step]");
        lines.push("");
        lines.push("### 5. Records");
        lines.push("");
        lines.push("[List any records that must be kept as evidence of following this procedure.]");
        lines.push("");
        lines.push("### 6. References");
        lines.push("");
        lines.push("- RANZ Code of Practice");
        lines.push("- NZ Building Code");
        lines.push("- [Other relevant standards]");
        break;

      case "FORM":
        lines.push("**Form Number:** [e.g., FORM-001]");
        lines.push("**Version:** 1.0");
        lines.push("");
        lines.push("| Field | Details |");
        lines.push("|-------|---------|");
        lines.push("| Date | [DD/MM/YYYY] |");
        lines.push("| Project/Reference | [Project number or reference] |");
        lines.push("| Completed By | [Name] |");
        lines.push("");
        lines.push("### Checklist / Record");
        lines.push("");
        lines.push("| # | Item | Yes | No | N/A | Notes |");
        lines.push("|---|------|-----|-----|-----|-------|");
        lines.push("| 1 | [Item description] | [ ] | [ ] | [ ] | |");
        lines.push("| 2 | [Item description] | [ ] | [ ] | [ ] | |");
        lines.push("| 3 | [Item description] | [ ] | [ ] | [ ] | |");
        lines.push("| 4 | [Item description] | [ ] | [ ] | [ ] | |");
        lines.push("| 5 | [Item description] | [ ] | [ ] | [ ] | |");
        lines.push("");
        lines.push("### Comments");
        lines.push("");
        lines.push("[Additional comments or observations]");
        lines.push("");
        lines.push("---");
        lines.push("");
        lines.push("**Signed:** ________________________ **Date:** [DD/MM/YYYY]");
        break;

      case "RECORD":
        lines.push("**Record Date:** [DD/MM/YYYY]");
        lines.push("**Reference:** [Reference number]");
        lines.push("**Recorded By:** [Name]");
        lines.push("");
        lines.push("### Details");
        lines.push("");
        lines.push("[Record the relevant details here.]");
        lines.push("");
        lines.push("| Date | Item | Details | Status |");
        lines.push("|------|------|---------|--------|");
        lines.push("| [Date] | [Item] | [Details] | [Status] |");
        lines.push("");
        lines.push("### Notes");
        lines.push("");
        lines.push("[Any additional notes or observations.]");
        break;

      case "CERTIFICATE":
        lines.push("**Certificate Number:** [Number]");
        lines.push("**Issued To:** [Name]");
        lines.push("**Issued By:** [Organization]");
        lines.push("**Issue Date:** [DD/MM/YYYY]");
        lines.push("**Expiry Date:** [DD/MM/YYYY]");
        lines.push("");
        lines.push("[Upload a copy of the actual certificate rather than using this template.]");
        break;

      default:
        lines.push("[Add your content here.]");
    }

    lines.push("");
    lines.push("---");
    lines.push("");
  }

  // Auditor checklist section
  lines.push("## Auditor Checklist Reference");
  lines.push("");
  lines.push("When preparing your documents, ensure they address these auditor questions:");
  lines.push("");
  for (const item of guide.auditorChecklist) {
    lines.push(`- [ ] ${item}`);
  }
  lines.push("");

  // Guidance section
  lines.push("---");
  lines.push("");
  lines.push("## RANZ Guidance");
  lines.push("");
  lines.push(`> ${guide.guidance}`);
  lines.push("");

  return lines.join("\n");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ element: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { element } = await params;

    // Validate element
    if (!(element in ISO_TEMPLATE_GUIDES)) {
      return NextResponse.json(
        { error: "Invalid ISO element" },
        { status: 400 }
      );
    }

    const isoElement = element as ISOElement;
    const guide = ISO_TEMPLATE_GUIDES[isoElement];
    const markdown = generateMarkdownTemplate(isoElement);

    // Sanitise filename
    const fileName = `RANZ-Template-${guide.number}-${guide.name.replace(/[^a-zA-Z0-9]/g, "-")}.md`;

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Failed to generate template:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
