/**
 * JWT Utilities
 *
 * RSA-2048 JWT signing and verification using jose library.
 * Quality Program signs tokens with private key.
 * Satellite apps (Roofing Report) verify with public key only.
 *
 * Requirements:
 * - AUTH-06: 8-hour session lifetime
 * - XAPP-06: Cross-app verification via public key
 */

import {
  SignJWT,
  jwtVerify,
  importPKCS8,
  importSPKI,
  generateKeyPair,
  exportPKCS8,
  exportSPKI,
  type JWTVerifyResult,
} from 'jose';
import { JWTPayload, DEFAULT_AUTH_CONFIG } from './types';

const ALGORITHM = 'RS256';

// Cache imported keys to avoid re-parsing on every call
let cachedPrivateKey: CryptoKey | null = null;
let cachedPublicKey: CryptoKey | null = null;

/**
 * Generate a new RSA-2048 key pair for JWT signing.
 * Run this once to generate keys, then store in environment variables.
 *
 * @returns PEM-encoded private and public keys
 */
export async function generateRSAKeyPair(): Promise<{
  privateKey: string;
  publicKey: string;
}> {
  const { publicKey, privateKey } = await generateKeyPair(ALGORITHM, {
    modulusLength: 2048,
    extractable: true, // Required for exporting to PEM format
  });

  const privateKeyPem = await exportPKCS8(privateKey);
  const publicKeyPem = await exportSPKI(publicKey);

  return {
    privateKey: privateKeyPem,
    publicKey: publicKeyPem,
  };
}

/**
 * Get the private key from environment, with caching.
 * Only Quality Program (primary domain) should have the private key.
 */
async function getPrivateKey(): Promise<CryptoKey> {
  if (cachedPrivateKey) return cachedPrivateKey;

  const privateKeyPem = process.env.JWT_PRIVATE_KEY;
  if (!privateKeyPem) {
    throw new Error(
      'JWT_PRIVATE_KEY environment variable is not set. ' +
      'This is required for token signing. ' +
      'Generate a key pair using generateRSAKeyPair().'
    );
  }

  // Handle escaped newlines in env vars
  const normalizedKey = privateKeyPem.replace(/\\n/g, '\n');
  cachedPrivateKey = await importPKCS8(normalizedKey, ALGORITHM);
  return cachedPrivateKey;
}

/**
 * Get the public key from environment, with caching.
 * All applications can verify tokens using the public key.
 */
async function getPublicKey(): Promise<CryptoKey> {
  if (cachedPublicKey) return cachedPublicKey;

  const publicKeyPem = process.env.JWT_PUBLIC_KEY;
  if (!publicKeyPem) {
    throw new Error(
      'JWT_PUBLIC_KEY environment variable is not set. ' +
      'This is required for token verification.'
    );
  }

  // Handle escaped newlines in env vars
  const normalizedKey = publicKeyPem.replace(/\\n/g, '\n');
  cachedPublicKey = await importSPKI(normalizedKey, ALGORITHM);
  return cachedPublicKey;
}

/**
 * Clear the key cache. Useful for testing or key rotation.
 */
export function clearKeyCache(): void {
  cachedPrivateKey = null;
  cachedPublicKey = null;
}

/**
 * Sign a JWT with the private key.
 * Only called by Quality Program (primary authentication domain).
 *
 * @param payload - The JWT payload to sign
 * @param config - Optional auth configuration override
 * @returns Signed JWT string
 */
export async function signToken(
  payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss' | 'aud' | 'jti'>,
  config = DEFAULT_AUTH_CONFIG
): Promise<string> {
  const privateKey = await getPrivateKey();
  const keyId = process.env.JWT_KEY_ID || 'ranz-auth-key-1';

  const token = await new SignJWT({
    ...payload,
  })
    .setProtectedHeader({ alg: ALGORITHM, kid: keyId })
    .setIssuedAt()
    .setIssuer(config.jwtIssuer)
    .setAudience(config.jwtAudience)
    .setExpirationTime(config.accessTokenLifetime)
    .setJti(crypto.randomUUID())
    .sign(privateKey);

  return token;
}

/**
 * Verify a JWT and extract the payload.
 * Can be called by any application with the public key.
 *
 * @param token - The JWT string to verify
 * @param config - Optional auth configuration override
 * @returns Verified payload or null if invalid
 */
export async function verifyToken(
  token: string,
  config = DEFAULT_AUTH_CONFIG
): Promise<JWTPayload | null> {
  try {
    const publicKey = await getPublicKey();

    const result: JWTVerifyResult = await jwtVerify(token, publicKey, {
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
    });

    // Type assertion - we know the payload structure
    return result.payload as unknown as JWTPayload;
  } catch (error) {
    // Log for debugging but don't expose error details
    if (process.env.NODE_ENV === 'development') {
      console.error('JWT verification failed:', error);
    }
    return null;
  }
}

/**
 * Decode a JWT without verification.
 * Useful for extracting claims for logging/debugging.
 * DO NOT use for authorization decisions.
 *
 * @param token - The JWT string to decode
 * @returns Decoded payload or null if malformed
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );

    return payload as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Check if a token is expired without full verification.
 *
 * @param token - The JWT string to check
 * @returns true if expired or invalid, false if still valid
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) return true;

  // exp is Unix timestamp in seconds
  const expirationTime = payload.exp * 1000;
  return Date.now() >= expirationTime;
}

/**
 * Extract the session ID from a token without verification.
 * Used for session revocation lookups.
 *
 * @param token - The JWT string
 * @returns Session ID or null
 */
export function getSessionIdFromToken(token: string): string | null {
  const payload = decodeToken(token);
  return payload?.sessionId ?? null;
}

/**
 * Create a SHA-256 hash of a token for database storage.
 * We store the hash, not the token itself, for security.
 *
 * @param token - The token string to hash
 * @returns Hex-encoded SHA-256 hash
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
