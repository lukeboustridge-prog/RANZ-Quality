import { NextRequest, NextResponse } from "next/server";
import { verifyAllLBPNumbers } from "@/lib/lbp-api";
import { db } from "@/lib/db";
import { updateOrganizationComplianceScore } from "@/lib/compliance-v2";
import { sendEmail } from "@/lib/email";
import { verifyCronRequest } from "@/lib/cron-auth";

// This endpoint should be called by a cron job (e.g., Vercel Cron)
// Example cron: 0 2 * * * (2am daily)

export async function GET(req: NextRequest) {
  try {
    // Strict authentication - no permissive fallback
    const authError = verifyCronRequest(req);
    if (authError) return authError;

    console.log("Starting daily LBP verification...");

    const result = await verifyAllLBPNumbers();

    console.log(
      `LBP verification complete: ${result.verified}/${result.total} verified, ${result.failed} failed`
    );

    // Handle status changes - update compliance scores and send notifications
    if (result.statusChanges.length > 0) {
      console.log(`${result.statusChanges.length} status changes detected`);

      // Get unique organization IDs from status changes
      const affectedMembers = await db.organizationMember.findMany({
        where: {
          id: { in: result.statusChanges.map((c) => c.memberId) },
        },
        include: {
          organization: true,
        },
      });

      const orgIds = [...new Set(affectedMembers.map((m) => m.organizationId))];

      // Update compliance scores for affected organizations
      await Promise.all(
        orgIds.map((orgId) => updateOrganizationComplianceScore(orgId))
      );

      // Send notifications for critical status changes (suspended, cancelled)
      const criticalChanges = result.statusChanges.filter(
        (c) => c.newStatus === "SUSPENDED" || c.newStatus === "CANCELLED"
      );

      for (const change of criticalChanges) {
        const member = affectedMembers.find((m) => m.id === change.memberId);
        if (member?.organization?.email) {
          try {
            await sendEmail({
              to: member.organization.email,
              subject: `LBP License Status Change - ${member.firstName} ${member.lastName}`,
              html: `
                <h2>LBP License Status Change Detected</h2>
                <p>During our daily verification, we detected a status change for a staff member:</p>
                <ul>
                  <li><strong>Staff Member:</strong> ${member.firstName} ${member.lastName}</li>
                  <li><strong>LBP Number:</strong> ${change.lbpNumber}</li>
                  <li><strong>Previous Status:</strong> ${change.oldStatus || "Unknown"}</li>
                  <li><strong>New Status:</strong> ${change.newStatus}</li>
                </ul>
                <p>Please log in to the RANZ Portal to review this change and take any necessary action.</p>
                <p>This may affect your organization's compliance status.</p>
              `,
            });
          } catch (emailError) {
            console.error(
              `Failed to send LBP status change notification:`,
              emailError
            );
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("LBP verification cron failed:", error);
    return NextResponse.json(
      { error: "Verification cron failed" },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(req: NextRequest) {
  return GET(req);
}
