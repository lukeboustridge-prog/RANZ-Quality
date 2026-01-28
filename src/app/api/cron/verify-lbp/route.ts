import { NextRequest, NextResponse } from "next/server";
import { verifyAllLBPNumbers } from "@/lib/lbp-api";
import { db } from "@/lib/db";
import { updateOrganizationComplianceScore } from "@/lib/compliance-v2";
import { verifyCronRequest } from "@/lib/cron-auth";
import { createNotification, generateMemberLBPMessage, generateOrgLBPMessage } from "@/lib/notifications";
import { SMS_TEMPLATES } from "@/lib/sms";

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

        // Email notification to organization (via createNotification for audit trail)
        if (member?.organization?.email) {
          try {
            await createNotification({
              organizationId: member.organizationId,
              // userId null = organization-level notification
              type: "LBP_STATUS_CHANGE",
              channel: "EMAIL",
              priority: "CRITICAL",
              title: `Staff LBP Alert - ${member.firstName} ${member.lastName}`,
              message: generateOrgLBPMessage(
                `${member.firstName} ${member.lastName}`,
                change.lbpNumber,
                change.oldStatus,
                change.newStatus
              ),
              actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/staff/${member.id}`,
              recipient: member.organization.email,
            });
            console.log(`Organization notification sent to ${member.organization.email} for LBP status change`);
          } catch (orgEmailError) {
            console.error(`Failed to send LBP status change org notification:`, orgEmailError);
          }
        }

        // Email notification to affected member directly
        if (member?.email) {
          try {
            await createNotification({
              organizationId: member.organizationId,
              userId: member.clerkUserId,  // Links to specific user
              type: "LBP_STATUS_CHANGE",
              channel: "EMAIL",
              priority: "CRITICAL",
              title: "Your LBP License Status Changed",
              message: generateMemberLBPMessage(
                `${member.firstName}`,
                change.lbpNumber,
                change.oldStatus,
                change.newStatus
              ),
              actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/staff`,
              recipient: member.email,
            });
            console.log(`Member notification sent to ${member.email} for LBP status change`);
          } catch (memberEmailError) {
            console.error(`Failed to send LBP status change member notification:`, memberEmailError);
          }
        }

        // SMS notification to affected staff member
        if (member?.phone) {
          try {
            await createNotification({
              organizationId: member.organizationId,
              userId: member.clerkUserId,
              type: "LBP_STATUS_CHANGE",
              channel: "SMS",
              priority: "CRITICAL",
              title: "LBP License Status Changed",
              message: SMS_TEMPLATES.lbpStatusChange(
                `${member.firstName} ${member.lastName}`,
                change.newStatus
              ),
              recipient: member.phone,
            });
            console.log(
              `SMS notification sent to ${member.firstName} ${member.lastName} for LBP status change`
            );
          } catch (smsError) {
            console.error(
              `Failed to send LBP status change SMS to ${member.email}:`,
              smsError
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
