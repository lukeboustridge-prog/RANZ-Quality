/**
 * Secure Token Generation Utility
 *
 * Provides cryptographically secure token generation for password resets
 * and account activation. Uses Web Crypto API for maximum compatibility
 * with Edge runtimes.
 *
 * Security features:
 * - 32 bytes of randomness (64 hex chars)
 * - SHA-256 hashing for storage (only hash stored in DB)
 * - Configurable expiry times
 * - Single-use enforcement via usedAt tracking
 *
 * Usage:
 * ```typescript
 * import { generatePasswordResetToken, validatePasswordResetToken } from '@/lib/auth/tokens';
 *
 * // Generate a reset token
 * const { token, tokenHash, expiresAt } = await generatePasswordResetToken(userId);
 *
 * // Send `token` to user via email
 * // Store `tokenHash` and `expiresAt` in database
 *
 * // Later, validate the token from the email link
 * const result = await validatePasswordResetToken(tokenFromUrl);
 * if (result.valid) {
 *   // Allow password reset for result.userId
 * }
 * ```
 */

import { db } from '@/lib/db';

/**
 * Convert ArrayBuffer to hex string.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a SHA-256 hash of the given string.
 * Returns hex-encoded hash.
 */
async function sha256Hash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  return bufferToHex(hashBuffer);
}

/**
 * Generate cryptographically secure random bytes as hex string.
 * Uses Web Crypto API for Edge runtime compatibility.
 *
 * @param bytes - Number of random bytes to generate
 * @returns Hex-encoded random string
 */
function generateSecureRandomHex(bytes: number): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return bufferToHex(buffer.buffer);
}

/**
 * Result of token generation.
 */
export interface TokenGenerationResult {
  /** The plain token to send to user (via email) */
  token: string;
  /** SHA-256 hash of token (store in database) */
  tokenHash: string;
  /** When the token expires */
  expiresAt: Date;
}

/**
 * Result of token validation.
 */
export interface TokenValidationResult {
  /** Whether the token is valid */
  valid: boolean;
  /** User ID associated with the token (if valid) */
  userId?: string;
  /** Reason for invalidity (if invalid) */
  reason?: 'token_not_found' | 'token_already_used' | 'token_expired';
}

/**
 * Generate a password reset token.
 *
 * Creates a 64-character hex token (32 bytes of randomness) and stores
 * its SHA-256 hash in the database. Previous unused tokens for the user
 * are invalidated.
 *
 * Per AUTH-04: Token expires in 1 hour.
 *
 * @param userId - ID of the user requesting password reset
 * @param requestedIp - Optional IP address of the request
 * @returns Token, hash, and expiry for email/storage
 *
 * @example
 * ```typescript
 * const { token, tokenHash, expiresAt } = await generatePasswordResetToken(
 *   user.id,
 *   '192.168.1.1'
 * );
 *
 * // Store in database
 * await db.authPasswordReset.create({
 *   data: {
 *     userId: user.id,
 *     tokenHash,
 *     expiresAt,
 *     requestedIp: '192.168.1.1',
 *   },
 * });
 *
 * // Send `token` via email
 * await sendPasswordResetEmail({
 *   to: user.email,
 *   firstName: user.firstName,
 *   resetUrl: `https://portal.ranz.co.nz/reset-password?token=${token}`,
 * });
 * ```
 */
export async function generatePasswordResetToken(
  userId: string,
  requestedIp?: string
): Promise<TokenGenerationResult> {
  // Generate 32 bytes of randomness (64 hex chars)
  const token = generateSecureRandomHex(32);

  // Hash the token for storage
  const tokenHash = await sha256Hash(token);

  // Expire in 1 hour per AUTH-04
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  // Invalidate any existing unused tokens for this user
  await db.authPasswordReset.updateMany({
    where: {
      userId,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
      usedIp: 'invalidated',
    },
  });

  // Create the new reset record
  await db.authPasswordReset.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      requestedIp: requestedIp ?? null,
    },
  });

  return { token, tokenHash, expiresAt };
}

/**
 * Validate a password reset token.
 *
 * Checks that the token:
 * - Exists in the database
 * - Has not been used
 * - Has not expired
 *
 * @param token - The plain token from the reset URL
 * @returns Validation result with userId if valid
 *
 * @example
 * ```typescript
 * const result = await validatePasswordResetToken(tokenFromUrl);
 *
 * if (!result.valid) {
 *   if (result.reason === 'token_expired') {
 *     return { error: 'This reset link has expired. Please request a new one.' };
 *   }
 *   return { error: 'Invalid reset link.' };
 * }
 *
 * // Token is valid, proceed with password reset for result.userId
 * ```
 */
export async function validatePasswordResetToken(
  token: string
): Promise<TokenValidationResult> {
  // Hash the provided token
  const tokenHash = await sha256Hash(token);

  // Look up the token
  const resetRecord = await db.authPasswordReset.findUnique({
    where: { tokenHash },
  });

  // Token not found
  if (!resetRecord) {
    return { valid: false, reason: 'token_not_found' };
  }

  // Token already used (single-use per OWASP)
  if (resetRecord.usedAt !== null) {
    return { valid: false, reason: 'token_already_used' };
  }

  // Token expired
  if (resetRecord.expiresAt < new Date()) {
    return { valid: false, reason: 'token_expired' };
  }

  // Token is valid
  return { valid: true, userId: resetRecord.userId };
}

/**
 * Mark a password reset token as used.
 *
 * Call this after successfully resetting the password to prevent reuse.
 * Single-use enforcement per OWASP guidelines.
 *
 * @param tokenHash - The hash of the token (from database lookup)
 * @param usedIp - IP address where the reset was completed
 *
 * @example
 * ```typescript
 * // After password is successfully changed
 * await consumePasswordResetToken(tokenHash, clientIp);
 * ```
 */
export async function consumePasswordResetToken(
  tokenHash: string,
  usedIp: string
): Promise<void> {
  await db.authPasswordReset.update({
    where: { tokenHash },
    data: {
      usedAt: new Date(),
      usedIp,
    },
  });
}

/**
 * Generate an account activation token.
 *
 * Similar to password reset but with configurable expiry.
 * Default 7 days per research recommendation for AUTH-09.
 *
 * Note: This function generates the token and returns the data,
 * but does NOT create a database record - the caller handles storage
 * (e.g., in a separate activation tokens table or reusing password reset).
 *
 * @param userId - ID of the user to activate
 * @param expiresInDays - Days until expiry (default 7)
 * @returns Token, hash, and expiry
 *
 * @example
 * ```typescript
 * const { token, tokenHash, expiresAt } = await generateActivationToken(newUser.id);
 *
 * // Send activation email with token
 * await sendWelcomeEmail({
 *   to: newUser.email,
 *   firstName: newUser.firstName,
 *   activationUrl: `https://portal.ranz.co.nz/activate?token=${token}`,
 * });
 * ```
 */
export async function generateActivationToken(
  userId: string,
  expiresInDays: number = 7
): Promise<TokenGenerationResult> {
  // Generate 32 bytes of randomness (64 hex chars)
  const token = generateSecureRandomHex(32);

  // Hash the token for storage
  const tokenHash = await sha256Hash(token);

  // Calculate expiry
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  return { token, tokenHash, expiresAt };
}
