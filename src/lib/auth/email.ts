/**
 * Auth Email Utility
 *
 * Provides type-safe email sending for authentication flows using Resend.
 * All emails use React Email templates with RANZ branding.
 *
 * Usage:
 * ```typescript
 * import { sendPasswordResetEmail } from '@/lib/auth/email';
 *
 * await sendPasswordResetEmail({
 *   to: user.email,
 *   firstName: user.firstName,
 *   resetUrl: `https://portal.ranz.org.nz/reset-password?token=${token}`,
 * });
 * ```
 */

import { Resend } from 'resend';
import { WelcomeEmail } from '../../../emails/welcome-email';
import { PasswordResetEmail } from '../../../emails/password-reset-email';
import { PasswordChangedEmail } from '../../../emails/password-changed-email';

/** Lazy-initialized Resend client */
let resendClient: Resend | null = null;

/**
 * Get the Resend client, initializing it on first use.
 * @throws Error if RESEND_API_KEY is not set
 */
function getResendClient(): Resend {
  if (resendClient) {
    return resendClient;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      'RESEND_API_KEY environment variable is not set. ' +
        'Email sending is disabled.'
    );
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

/** Default sender address for all auth emails */
const FROM_ADDRESS =
  process.env.EMAIL_FROM || 'RANZ Quality Program <noreply@ranz.org.nz>';

/**
 * Welcome email parameters.
 */
export interface WelcomeEmailParams {
  /** Recipient email address */
  to: string;
  /** User's first name for personalization */
  firstName: string;
  /** Account activation URL (contains token) */
  activationUrl: string;
  /** Optional custom expiry text (default: "7 days") */
  expiresIn?: string;
}

/**
 * Password reset email parameters.
 */
export interface PasswordResetEmailParams {
  /** Recipient email address */
  to: string;
  /** User's first name for personalization */
  firstName: string;
  /** Password reset URL (contains token) */
  resetUrl: string;
  /** Optional IP address that requested the reset */
  requestedIp?: string;
}

/**
 * Password changed email parameters.
 */
export interface PasswordChangedEmailParams {
  /** Recipient email address */
  to: string;
  /** User's first name for personalization */
  firstName: string;
  /** ISO timestamp when password was changed */
  changedAt: string;
  /** Optional IP address where password was changed */
  changedIp?: string;
}

/**
 * Result from Resend API.
 */
export interface EmailSendResult {
  /** Resend email ID */
  id?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Send welcome email to a new user.
 *
 * Contains activation link (NOT password) for secure account setup.
 * Per security best practice: never send passwords in email.
 *
 * @param params - Email parameters
 * @returns Resend response for error handling
 *
 * @example
 * ```typescript
 * const result = await sendWelcomeEmail({
 *   to: 'john@example.com',
 *   firstName: 'John',
 *   activationUrl: 'https://portal.ranz.org.nz/activate?token=abc123...',
 * });
 *
 * if (result.error) {
 *   console.error('Failed to send welcome email:', result.error);
 * }
 * ```
 */
export async function sendWelcomeEmail(
  params: WelcomeEmailParams
): Promise<EmailSendResult> {
  const resend = getResendClient();

  try {
    const response = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: 'Welcome to RANZ Quality Program - Activate your account',
      react: WelcomeEmail({
        firstName: params.firstName,
        email: params.to,
        activationUrl: params.activationUrl,
        expiresIn: params.expiresIn,
      }),
    });

    if (response.error) {
      return { error: response.error.message };
    }

    return { id: response.data?.id };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send password reset email.
 *
 * Contains reset link with 1-hour expiry per AUTH-04.
 *
 * @param params - Email parameters
 * @returns Resend response for error handling
 *
 * @example
 * ```typescript
 * const result = await sendPasswordResetEmail({
 *   to: 'john@example.com',
 *   firstName: 'John',
 *   resetUrl: 'https://portal.ranz.org.nz/reset-password?token=abc123...',
 *   requestedIp: '192.168.1.1',
 * });
 *
 * if (result.error) {
 *   console.error('Failed to send reset email:', result.error);
 * }
 * ```
 */
export async function sendPasswordResetEmail(
  params: PasswordResetEmailParams
): Promise<EmailSendResult> {
  const resend = getResendClient();

  try {
    const response = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: 'Reset your password - RANZ Quality Program',
      react: PasswordResetEmail({
        firstName: params.firstName,
        resetUrl: params.resetUrl,
        requestedIp: params.requestedIp,
      }),
    });

    if (response.error) {
      return { error: response.error.message };
    }

    return { id: response.data?.id };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send password changed confirmation email.
 *
 * Notifies user that their password was changed with security notice
 * to contact support if they didn't make the change.
 *
 * @param params - Email parameters
 * @returns Resend response for error handling
 *
 * @example
 * ```typescript
 * const result = await sendPasswordChangedEmail({
 *   to: 'john@example.com',
 *   firstName: 'John',
 *   changedAt: new Date().toISOString(),
 *   changedIp: '192.168.1.1',
 * });
 *
 * if (result.error) {
 *   console.error('Failed to send confirmation email:', result.error);
 * }
 * ```
 */
export async function sendPasswordChangedEmail(
  params: PasswordChangedEmailParams
): Promise<EmailSendResult> {
  const resend = getResendClient();

  try {
    const response = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: 'Your password has been changed - RANZ Quality Program',
      react: PasswordChangedEmail({
        firstName: params.firstName,
        changedAt: params.changedAt,
        changedIp: params.changedIp,
      }),
    });

    if (response.error) {
      return { error: response.error.message };
    }

    return { id: response.data?.id };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
