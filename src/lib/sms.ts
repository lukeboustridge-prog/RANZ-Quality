import { Twilio } from "twilio";

// Exponential backoff configuration
const SMS_INITIAL_BACKOFF_SECONDS = 30;
const SMS_MAX_BACKOFF_SECONDS = 900; // 15 minutes

/**
 * Calculate next retry time using exponential backoff.
 *
 * Retry schedule:
 * - Retry 1: 30 seconds
 * - Retry 2: 60 seconds
 * - Retry 3: 120 seconds (capped, max 3 retries)
 *
 * @param retryCount Current retry count (1, 2, or 3)
 * @param failedAt When the last attempt failed
 * @returns Date when next retry should occur
 */
export function calculateNextRetryTime(retryCount: number, failedAt: Date): Date {
  const backoffSeconds = Math.pow(2, retryCount - 1) * SMS_INITIAL_BACKOFF_SECONDS;
  const delay = Math.min(backoffSeconds, SMS_MAX_BACKOFF_SECONDS);

  return new Date(failedAt.getTime() + delay * 1000);
}

// Initialize Twilio client (lazy initialization)
let twilioClient: Twilio | null = null;

function getTwilioClient(): Twilio | null {
  if (twilioClient) return twilioClient;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.warn("Twilio credentials not configured - SMS disabled");
    return null;
  }

  twilioClient = new Twilio(accountSid, authToken);
  return twilioClient;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSMS(
  to: string,
  message: string
): Promise<SMSResult> {
  const client = getTwilioClient();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!client || !fromNumber) {
    console.log(`[SMS Mock] To: ${to}, Message: ${message}`);
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
    };
  }

  try {
    // Format NZ phone numbers
    const formattedTo = formatNZPhoneNumber(to);

    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: formattedTo,
    });

    return {
      success: true,
      messageId: result.sid,
    };
  } catch (error) {
    console.error("Failed to send SMS:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function formatNZPhoneNumber(phone: string): string {
  // Remove spaces, dashes, and parentheses
  let cleaned = phone.replace(/[\s\-()]/g, "");

  // If it starts with 0, replace with +64
  if (cleaned.startsWith("0")) {
    cleaned = "+64" + cleaned.substring(1);
  }

  // If it doesn't have country code, add +64
  if (!cleaned.startsWith("+")) {
    cleaned = "+64" + cleaned;
  }

  return cleaned;
}

// SMS Templates
export const SMS_TEMPLATES = {
  insuranceExpiry90: (businessName: string, policyType: string, days: number) =>
    `RANZ: ${businessName} - Your ${policyType} insurance expires in ${days} days. Please renew to maintain certification.`,

  insuranceExpiry30: (businessName: string, policyType: string, days: number) =>
    `URGENT: ${businessName} - Your ${policyType} insurance expires in ${days} days. Renew immediately to avoid certification suspension.`,

  insuranceExpired: (businessName: string, policyType: string) =>
    `ALERT: ${businessName} - Your ${policyType} insurance has expired. Your certification badge has been suspended until renewed.`,

  lbpStatusChange: (memberName: string, newStatus: string) =>
    `RANZ: LBP status for ${memberName} has changed to ${newStatus}. Please verify and update records.`,

  auditScheduled: (businessName: string, date: string) =>
    `RANZ: An audit has been scheduled for ${businessName} on ${date}. Check your dashboard for details.`,

  auditReminder: (businessName: string, date: string, days: number) =>
    `RANZ: Reminder - Audit for ${businessName} is in ${days} days (${date}). Ensure all documentation is ready.`,

  capaDue: (title: string, days: number) =>
    `RANZ: CAPA "${title}" is due in ${days} days. Please complete the corrective action.`,

  capaOverdue: (title: string) =>
    `URGENT: CAPA "${title}" is now overdue. Immediate action required.`,

  complianceAlert: (businessName: string, score: number) =>
    `RANZ: ${businessName} compliance score has dropped to ${score}%. Review required items in your dashboard.`,
};

// Batch SMS sending with rate limiting
export async function sendBulkSMS(
  messages: Array<{ to: string; message: string }>
): Promise<Array<SMSResult & { to: string }>> {
  const results: Array<SMSResult & { to: string }> = [];

  for (const msg of messages) {
    const result = await sendSMS(msg.to, msg.message);
    results.push({ ...result, to: msg.to });

    // Rate limiting - wait 100ms between messages
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}
