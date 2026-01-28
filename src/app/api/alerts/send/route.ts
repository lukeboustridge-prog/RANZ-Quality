import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { sendEmail, generateExpiryAlertEmail } from "@/lib/email";
import { formatDate, daysUntil } from "@/lib/utils";
import { INSURANCE_POLICY_TYPE_LABELS } from "@/types";

// POST /api/alerts/send - Manually trigger alert (for testing)
export async function POST(req: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { policyId } = body;

    const organization = await db.organization.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const policy = await db.insurancePolicy.findFirst({
      where: {
        id: policyId,
        organizationId: organization.id,
      },
    });

    if (!policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    const days = daysUntil(policy.expiryDate);
    const policyTypeLabel =
      INSURANCE_POLICY_TYPE_LABELS[
        policy.policyType as keyof typeof INSURANCE_POLICY_TYPE_LABELS
      ] || policy.policyType;

    const emailContent = generateExpiryAlertEmail({
      businessName: organization.name,
      policyType: policyTypeLabel,
      expiryDate: formatDate(policy.expiryDate),
      daysRemaining: days,
    });

    // Send to organization email
    if (organization.email) {
      await sendEmail({
        to: organization.email,
        ...emailContent,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Alert sent for ${policyTypeLabel}`,
    });
  } catch (error) {
    console.error("Failed to send alert:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/alerts/send - Check and send due alerts (for cron job)
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret for scheduled jobs
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const results = {
      checked: 0,
      sent90: 0,
      sent60: 0,
      sent30: 0,
      errors: 0,
    };

    // Find all policies that need alerts
    const policies = await db.insurancePolicy.findMany({
      where: {
        expiryDate: {
          gte: now,
        },
        OR: [
          {
            alert90Sent: false,
            expiryDate: {
              lte: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
            },
          },
          {
            alert60Sent: false,
            expiryDate: {
              lte: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
            },
          },
          {
            alert30Sent: false,
            expiryDate: {
              lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
            },
          },
        ],
      },
      include: {
        organization: true,
      },
    });

    results.checked = policies.length;

    for (const policy of policies) {
      const days = daysUntil(policy.expiryDate);
      const organization = policy.organization;

      if (!organization.email) continue;

      const policyTypeLabel =
        INSURANCE_POLICY_TYPE_LABELS[
          policy.policyType as keyof typeof INSURANCE_POLICY_TYPE_LABELS
        ] || policy.policyType;

      try {
        let shouldSend = false;
        let alertType: "90" | "60" | "30" | null = null;

        if (days <= 30 && !policy.alert30Sent) {
          shouldSend = true;
          alertType = "30";
        } else if (days <= 60 && !policy.alert60Sent) {
          shouldSend = true;
          alertType = "60";
        } else if (days <= 90 && !policy.alert90Sent) {
          shouldSend = true;
          alertType = "90";
        }

        if (shouldSend && alertType) {
          const emailContent = generateExpiryAlertEmail({
            businessName: organization.name,
            policyType: policyTypeLabel,
            expiryDate: formatDate(policy.expiryDate),
            daysRemaining: days,
          });

          await sendEmail({
            to: organization.email,
            ...emailContent,
          });

          // Update the alert sent flag
          await db.insurancePolicy.update({
            where: { id: policy.id },
            data: {
              [`alert${alertType}Sent`]: true,
            },
          });

          if (alertType === "90") results.sent90++;
          else if (alertType === "60") results.sent60++;
          else if (alertType === "30") results.sent30++;
        }
      } catch (error) {
        console.error(`Failed to send alert for policy ${policy.id}:`, error);
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Failed to process alerts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
