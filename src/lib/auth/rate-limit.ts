/**
 * Rate Limiting Infrastructure
 *
 * Distributed rate limiting using Upstash Redis.
 * Fixes CONCERNS.md tech debt: "Rate limiting uses in-memory store (broken for distributed deployment)"
 *
 * Requirements:
 * - SECR-06: IP-based rate limiting across all accounts
 * - Progressive lockout: 5 attempts/15 min for login
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// =============================================================================
// Redis Client
// =============================================================================

/**
 * Create Redis client from environment variables.
 * Uses Upstash's HTTP-based client which works in Edge and Node.js.
 *
 * Required env vars:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 */
function createRedisClient(): Redis {
  // Check for required environment variables
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // In development without Upstash, return a mock that always allows
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        'Upstash Redis not configured. Rate limiting disabled in development. ' +
        'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for production.'
      );
      // Return a minimal mock that satisfies the Redis interface for rate limiting
      // The mock implements just enough to make Ratelimit work
      return {
        eval: async () => ({ success: true, remaining: 999, reset: Date.now() + 60000 }),
      } as unknown as Redis;
    }

    throw new Error(
      'Upstash Redis not configured. ' +
      'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables. ' +
      'Create a database at https://console.upstash.com'
    );
  }

  return Redis.fromEnv();
}

// Lazy initialization to avoid errors during module load
let redisClient: Redis | null = null;

function getRedis(): Redis {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
}

// =============================================================================
// Rate Limiters
// =============================================================================

/**
 * Rate limiters for different auth endpoints.
 *
 * Configuration per SECR-06 and progressive lockout requirements:
 * - Login: 5 attempts per 15 minutes per IP+email combo
 * - Password reset: 3 requests per hour per email
 * - Token refresh: 10 per minute per user (to prevent abuse)
 * - Account lockout: 5 attempts, then progressive lockout
 */

// Lazy initialization for rate limiters
let _loginRateLimiter: Ratelimit | null = null;
let _passwordResetRateLimiter: Ratelimit | null = null;
let _tokenRefreshRateLimiter: Ratelimit | null = null;
let _ipGlobalRateLimiter: Ratelimit | null = null;

/**
 * Login rate limiter: 5 attempts per 15 minutes.
 * Uses sliding window to prevent timing attacks.
 */
function getLoginRateLimiter(): Ratelimit {
  if (!_loginRateLimiter) {
    _loginRateLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(5, '15m'),
      prefix: '@ranz/auth:login',
      analytics: true,
    });
  }
  return _loginRateLimiter;
}

/**
 * Password reset rate limiter: 3 requests per hour.
 * Prevents email bombing and enumeration attacks.
 */
function getPasswordResetRateLimiter(): Ratelimit {
  if (!_passwordResetRateLimiter) {
    _passwordResetRateLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(3, '1h'),
      prefix: '@ranz/auth:reset',
      analytics: true,
    });
  }
  return _passwordResetRateLimiter;
}

/**
 * Token refresh rate limiter: 10 per minute.
 * Prevents token refresh abuse.
 */
function getTokenRefreshRateLimiter(): Ratelimit {
  if (!_tokenRefreshRateLimiter) {
    _tokenRefreshRateLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(10, '1m'),
      prefix: '@ranz/auth:refresh',
      analytics: true,
    });
  }
  return _tokenRefreshRateLimiter;
}

/**
 * Global IP rate limiter: 100 requests per minute.
 * Catches aggressive bots and DDoS attempts.
 */
function getIPGlobalRateLimiter(): Ratelimit {
  if (!_ipGlobalRateLimiter) {
    _ipGlobalRateLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(100, '1m'),
      prefix: '@ranz/auth:ip-global',
      analytics: true,
    });
  }
  return _ipGlobalRateLimiter;
}

/**
 * Exported rate limiters object for easy access.
 */
export const authRateLimiters = {
  get login() { return getLoginRateLimiter(); },
  get passwordReset() { return getPasswordResetRateLimiter(); },
  get tokenRefresh() { return getTokenRefreshRateLimiter(); },
  get ipGlobal() { return getIPGlobalRateLimiter(); },
};

// =============================================================================
// Rate Limit Checking
// =============================================================================

/**
 * Result of a rate limit check.
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of requests remaining in the window */
  remaining: number;
  /** When the rate limit resets (Unix timestamp ms) */
  reset: number;
  /** Time until reset in seconds */
  retryAfter: number;
}

/**
 * Check rate limit for a given identifier.
 *
 * @param limiter - The rate limiter to check against
 * @param identifier - Unique identifier (e.g., IP, email, IP+email)
 * @returns Rate limit result with allowed status and metadata
 *
 * @example
 * ```typescript
 * const result = await checkRateLimit(authRateLimiters.login, `${ip}:${email}`);
 * if (!result.allowed) {
 *   return Response.json(
 *     { error: 'Too many attempts', retryAfter: result.retryAfter },
 *     { status: 429, headers: { 'Retry-After': String(result.retryAfter) } }
 *   );
 * }
 * ```
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<RateLimitResult> {
  const { success, remaining, reset } = await limiter.limit(identifier);

  const retryAfter = Math.ceil((reset - Date.now()) / 1000);

  return {
    allowed: success,
    remaining,
    reset,
    retryAfter: Math.max(0, retryAfter),
  };
}

// =============================================================================
// Identifier Generation
// =============================================================================

/**
 * Get rate limit identifier from request.
 *
 * For IP-based limiting:
 * - Uses X-Forwarded-For header (set by Vercel, Cloudflare, etc.)
 * - Falls back to X-Real-IP
 * - Falls back to 'unknown' (should log warning)
 *
 * @param request - The incoming request
 * @returns IP address string
 */
export function getIPFromRequest(request: Request): string {
  // Vercel/Cloudflare set X-Forwarded-For
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // X-Forwarded-For can be comma-separated; first is client IP
    return forwarded.split(',')[0].trim();
  }

  // Some proxies use X-Real-IP
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }

  // Fallback - should not happen in production
  console.warn('Could not determine client IP from request headers');
  return 'unknown';
}

/**
 * Generate a rate limit identifier combining IP and another factor.
 *
 * @param request - The incoming request
 * @param factor - Additional factor (e.g., email address)
 * @returns Combined identifier string
 */
export function getRateLimitIdentifier(
  request: Request,
  factor?: string
): string {
  const ip = getIPFromRequest(request);
  return factor ? `${ip}:${factor}` : ip;
}

// =============================================================================
// Progressive Lockout
// =============================================================================

/**
 * Lockout duration tiers for progressive lockout.
 * After each tier, the lockout duration increases.
 */
const LOCKOUT_TIERS = [
  { attempts: 5, duration: 5 * 60 * 1000 },      // 5 min after 5 attempts
  { attempts: 10, duration: 15 * 60 * 1000 },    // 15 min after 10 attempts
  { attempts: 15, duration: 60 * 60 * 1000 },    // 1 hour after 15 attempts
  { attempts: 20, duration: Infinity },           // Admin unlock after 20 attempts
];

/**
 * Get lockout duration based on failed attempt count.
 *
 * @param failedAttempts - Number of failed login attempts
 * @returns Lockout duration in milliseconds, or Infinity for admin-unlock
 */
export function getLockoutDuration(failedAttempts: number): number {
  for (const tier of LOCKOUT_TIERS) {
    if (failedAttempts < tier.attempts) {
      return 0; // Not locked out yet
    }
    if (failedAttempts >= tier.attempts) {
      // Check if we've exceeded this tier's threshold
      const nextTier = LOCKOUT_TIERS.find(t => t.attempts > tier.attempts);
      if (!nextTier || failedAttempts < nextTier.attempts) {
        return tier.duration;
      }
    }
  }
  return Infinity; // Admin unlock required
}

/**
 * Check if an account is currently locked out.
 *
 * @param lockedUntil - The lockout expiration timestamp (or null if not locked)
 * @returns true if account is locked
 */
export function isAccountLocked(lockedUntil: Date | null): boolean {
  if (!lockedUntil) return false;
  return new Date() < lockedUntil;
}

/**
 * Calculate when lockout expires based on failed attempts.
 *
 * @param failedAttempts - Number of failed login attempts
 * @returns Lockout expiration date, or null if admin-unlock required
 */
export function calculateLockoutExpiry(
  failedAttempts: number
): Date | null {
  const duration = getLockoutDuration(failedAttempts);
  if (duration === 0) return null; // Not locked
  if (duration === Infinity) return null; // Admin unlock - no expiry
  return new Date(Date.now() + duration);
}

// =============================================================================
// Response Helpers
// =============================================================================

/**
 * Create a 429 Too Many Requests response.
 *
 * @param result - Rate limit result
 * @param message - Custom error message
 * @returns Response object with proper headers
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  message: string = 'Too many requests'
): Response {
  return Response.json(
    {
      error: message,
      retryAfter: result.retryAfter,
      remaining: result.remaining,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfter),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.reset),
      },
    }
  );
}

/**
 * Add rate limit headers to a successful response.
 *
 * @param response - The response to add headers to
 * @param result - Rate limit result
 * @returns New response with rate limit headers
 */
export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult
): Response {
  const headers = new Headers(response.headers);
  headers.set('X-RateLimit-Remaining', String(result.remaining));
  headers.set('X-RateLimit-Reset', String(result.reset));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
