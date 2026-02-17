import { Resend } from "resend";

let resendInstance: Resend | null = null;

function getResend() {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  const resend = getResend();
  const EMAIL_FROM = process.env.EMAIL_FROM || "RANZ Portal <portal@ranz.co.nz>";

  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
  });

  if (error) {
    console.error("Failed to send email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

export function generateExpiryAlertEmail(params: {
  businessName: string;
  policyType: string;
  expiryDate: string;
  daysRemaining: number;
}) {
  const { businessName, policyType, expiryDate, daysRemaining } = params;

  const urgencyColor =
    daysRemaining <= 30
      ? "#dc2626"
      : daysRemaining <= 60
        ? "#f59e0b"
        : "#3b82f6";
  const urgencyText =
    daysRemaining <= 30
      ? "URGENT"
      : daysRemaining <= 60
        ? "Important"
        : "Reminder";

  return {
    subject: `${urgencyText}: ${policyType} expires in ${daysRemaining} days - ${businessName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">RANZ Certified Business Portal</h1>
  </div>

  <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    <div style="background: ${urgencyColor}15; border-left: 4px solid ${urgencyColor}; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
      <strong style="color: ${urgencyColor}; text-transform: uppercase;">${urgencyText}</strong>
      <p style="margin: 8px 0 0; color: #374151;">Your ${policyType} insurance policy expires in <strong>${daysRemaining} days</strong>.</p>
    </div>

    <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 16px;">Policy Details</h2>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr>
        <td style="padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600;">Business</td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">${businessName}</td>
      </tr>
      <tr>
        <td style="padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600;">Policy Type</td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">${policyType}</td>
      </tr>
      <tr>
        <td style="padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600;">Expiry Date</td>
        <td style="padding: 12px; border: 1px solid #e5e7eb;">${expiryDate}</td>
      </tr>
    </table>

    <p style="color: #4b5563;">To maintain your RANZ certification status, please ensure your insurance policy is renewed before the expiry date.</p>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/insurance" style="display: inline-block; background: #1e40af; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Update Insurance Details</a>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

    <p style="color: #9ca3af; font-size: 14px; text-align: center;">
      This is an automated message from the RANZ Certified Business Portal.<br>
      If you have questions, please contact us at support@ranz.co.nz
    </p>
  </div>
</body>
</html>
    `,
    text: `
${urgencyText}: ${policyType} expires in ${daysRemaining} days

Business: ${businessName}
Policy Type: ${policyType}
Expiry Date: ${expiryDate}

To maintain your RANZ certification status, please ensure your insurance policy is renewed before the expiry date.

Update your insurance details at: ${process.env.NEXT_PUBLIC_APP_URL}/insurance

---
This is an automated message from the RANZ Certified Business Portal.
If you have questions, please contact us at support@ranz.co.nz
    `,
  };
}
