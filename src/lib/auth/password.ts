/**
 * Password Utilities
 *
 * Secure password hashing and validation using bcrypt-ts-edge.
 * Edge-compatible implementation for serverless deployment.
 *
 * Requirements:
 * - SECR-04: Password complexity (8 chars, uppercase, number, special)
 * - SECR-04: bcrypt with 12 rounds
 */

import { hashSync, compareSync, genSaltSync } from 'bcrypt-ts-edge';
import { PasswordValidationResult, DEFAULT_AUTH_CONFIG } from './types';

/**
 * Hash a password using bcrypt.
 *
 * @param password - Plain text password to hash
 * @param rounds - Number of bcrypt rounds (default: 12)
 * @returns Bcrypt hash string
 */
export function hashPassword(
  password: string,
  rounds: number = DEFAULT_AUTH_CONFIG.bcryptRounds
): string {
  const salt = genSaltSync(rounds);
  return hashSync(password, salt);
}

/**
 * Verify a password against a bcrypt hash.
 *
 * @param password - Plain text password to verify
 * @param hash - Bcrypt hash to compare against
 * @returns true if password matches hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  return compareSync(password, hash);
}

// Password complexity requirements per SECR-04
const PASSWORD_MIN_LENGTH = 8;
const HAS_UPPERCASE = /[A-Z]/;
const HAS_LOWERCASE = /[a-z]/;
const HAS_NUMBER = /[0-9]/;
const HAS_SPECIAL = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/;

/**
 * Validate password complexity requirements.
 *
 * Requirements (SECR-04):
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 *
 * @param password - Password to validate
 * @returns Validation result with success flag and any errors
 */
export function validatePasswordComplexity(
  password: string
): PasswordValidationResult {
  const errors: string[] = [];

  if (!password) {
    return {
      valid: false,
      errors: ['Password is required'],
    };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }

  if (!HAS_UPPERCASE.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!HAS_LOWERCASE.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!HAS_NUMBER.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!HAS_SPECIAL.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a secure random password that meets complexity requirements.
 * Used for temporary passwords in staff-issued credential workflow.
 *
 * @param length - Password length (default: 16, minimum: 12)
 * @returns Random password string
 */
export function generateSecurePassword(length: number = 16): string {
  const minLength = 12;
  const actualLength = Math.max(length, minLength);

  const uppercaseChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excludes I, O (confusing)
  const lowercaseChars = 'abcdefghjkmnpqrstuvwxyz'; // Excludes i, l, o (confusing)
  const numberChars = '23456789'; // Excludes 0, 1 (confusing)
  const specialChars = '!@#$%^&*-_=+';

  // Ensure at least one of each required character type
  const required = [
    uppercaseChars[Math.floor(Math.random() * uppercaseChars.length)],
    lowercaseChars[Math.floor(Math.random() * lowercaseChars.length)],
    numberChars[Math.floor(Math.random() * numberChars.length)],
    specialChars[Math.floor(Math.random() * specialChars.length)],
  ];

  // Fill remaining length with random characters from all sets
  const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
  const remainingLength = actualLength - required.length;
  const remaining: string[] = [];

  for (let i = 0; i < remainingLength; i++) {
    remaining.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  // Combine and shuffle
  const combined = [...required, ...remaining];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.join('');
}

/**
 * Check if a password has been compromised (stub for future Have I Been Pwned integration).
 * Currently returns false (not compromised) for all passwords.
 *
 * @param password - Password to check
 * @returns Promise resolving to true if password is compromised
 */
export async function isPasswordCompromised(
  _password: string
): Promise<boolean> {
  // TODO: Integrate with Have I Been Pwned API in future enhancement
  // https://haveibeenpwned.com/API/v3#PwnedPasswords
  return false;
}
