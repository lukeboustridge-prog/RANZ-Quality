/**
 * Suspicious Login Detection
 *
 * Analyzes login patterns for anomalies and triggers email notifications
 * when suspicious activity is detected. This satisfies SECR-07.
 *
 * Detection criteria:
 * - New device (browser/OS combination not seen before)
 * - New location (country/city not seen before)
 * - Unusual time (outside 5am-11pm NZ time)
 * - Impossible travel (different country within 2 hours)
 *
 * Known devices and locations are stored per-user in Redis with 90-day TTL.
 *
 * Usage:
 * ```typescript
 * import { analyzeLogin, handleSuspiciousLogin } from '@/lib/auth/security/suspicious-login';
 *
 * const suspicion = await analyzeLogin({
 *   userId: user.id,
 *   userEmail: user.email,
 *   ipAddress: '203.118.150.50',
 *   userAgent: request.headers.get('user-agent'),
 *   timestamp: new Date(),
 * });
 *
 * if (suspicion.isSuspicious) {
 *   await handleSuspiciousLogin(context, suspicion);
 * }
 * ```
 */

import { Redis } from '@upstash/redis';
import { getLocation, getLocationFromHeaders, formatLocation, type GeoLocation } from './geo-location';
import { parseDevice, formatDevice, type DeviceInfo } from './device-fingerprint';
import { sendSuspiciousLoginEmail } from '../email';
import { logAuthEvent } from '../audit';

// Lazy init Redis client (same pattern as rate-limit.ts)
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      'Upstash Redis not configured - suspicious login detection disabled'
    );
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

const DEVICE_KEY_PREFIX = 'auth:device:';
const LOCATION_KEY_PREFIX = 'auth:location:';
const LAST_LOGIN_KEY_PREFIX = 'auth:lastlogin:';
const KNOWN_TTL = 60 * 60 * 24 * 90; // 90 days

export interface LoginContext {
  userId: string;
  userEmail: string;
  ipAddress: string;
  userAgent: string | null;
  timestamp: Date;
  /** Request headers for serverless geolocation (Vercel/Cloudflare) */
  headers?: Headers | Record<string, string | undefined>;
}

export interface SuspicionResult {
  isSuspicious: boolean;
  reasons: string[];
  newDevice: boolean;
  newLocation: boolean;
  unusualTime: boolean;
  impossibleTravel: boolean;
  device: DeviceInfo;
  location: GeoLocation;
}

/**
 * Analyze login for suspicious patterns.
 * Checks: new device, new location, unusual time, impossible travel.
 *
 * @param context - Login context with user, IP, UA, and timestamp
 * @returns Suspicion result with flags and reasons
 */
export async function analyzeLogin(
  context: LoginContext
): Promise<SuspicionResult> {
  const redisClient = getRedis();
  const reasons: string[] = [];

  // Parse device and location
  const device = parseDevice(context.userAgent);
  // Prefer header-based geolocation (serverless-compatible) over IP lookup
  const location = context.headers
    ? getLocationFromHeaders(context.headers)
    : getLocation(context.ipAddress);

  // Default result for no Redis (dev mode)
  if (!redisClient) {
    return {
      isSuspicious: false,
      reasons: [],
      newDevice: false,
      newLocation: false,
      unusualTime: false,
      impossibleTravel: false,
      device,
      location,
    };
  }

  // 1. Check if device is known
  const deviceKey = `${DEVICE_KEY_PREFIX}${context.userId}`;
  const knownDevices = (await redisClient.smembers(deviceKey)) as string[];
  const isNewDevice = !knownDevices.includes(device.fingerprint);

  if (isNewDevice) {
    reasons.push(`New device: ${formatDevice(device)}`);
  }

  // 2. Check if location is known
  const locationKey = `${LOCATION_KEY_PREFIX}${context.userId}`;
  const knownLocations = (await redisClient.smembers(locationKey)) as string[];
  const locationString = formatLocation(location);
  const isNewLocation =
    location.country !== null && !knownLocations.includes(locationString);

  if (isNewLocation) {
    reasons.push(`New location: ${locationString}`);
  }

  // 3. Check for unusual time (outside 5am-11pm NZ time)
  // Convert to NZ timezone
  const nzTime = new Date(
    context.timestamp.toLocaleString('en-US', { timeZone: 'Pacific/Auckland' })
  );
  const hour = nzTime.getHours();
  const isUnusualTime = hour < 5 || hour >= 23;

  if (isUnusualTime) {
    reasons.push(`Unusual login time: ${nzTime.toLocaleTimeString('en-NZ')}`);
  }

  // 4. Check for impossible travel (different country within 2 hours)
  const lastLoginKey = `${LAST_LOGIN_KEY_PREFIX}${context.userId}`;
  const lastLoginData = (await redisClient.get(lastLoginKey)) as string | null;
  let isImpossibleTravel = false;

  if (lastLoginData && location.country) {
    try {
      const lastLogin = JSON.parse(lastLoginData);
      const timeDiff =
        context.timestamp.getTime() - new Date(lastLogin.timestamp).getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // Different country within 2 hours is suspicious
      if (
        hoursDiff < 2 &&
        lastLogin.country &&
        lastLogin.country !== location.country
      ) {
        isImpossibleTravel = true;
        reasons.push(
          `Login from ${location.country} only ${hoursDiff.toFixed(1)} hours after login from ${lastLogin.country}`
        );
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Update last login location (always, for impossible travel detection)
  await redisClient.set(
    lastLoginKey,
    JSON.stringify({
      country: location.country,
      city: location.city,
      timestamp: context.timestamp.toISOString(),
      ip: context.ipAddress,
    }),
    { ex: 60 * 60 * 24 }
  ); // 24 hour TTL

  // If NOT suspicious, add device/location to known list
  // (We learn from non-suspicious logins)
  if (reasons.length === 0) {
    await redisClient.sadd(deviceKey, device.fingerprint);
    await redisClient.expire(deviceKey, KNOWN_TTL);

    if (location.country) {
      await redisClient.sadd(locationKey, locationString);
      await redisClient.expire(locationKey, KNOWN_TTL);
    }
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons,
    newDevice: isNewDevice,
    newLocation: isNewLocation,
    unusualTime: isUnusualTime,
    impossibleTravel: isImpossibleTravel,
    device,
    location,
  };
}

/**
 * Handle suspicious login - log event and send email notification (SECR-07).
 *
 * @param context - Login context
 * @param suspicion - Suspicion analysis result
 */
export async function handleSuspiciousLogin(
  context: LoginContext,
  suspicion: SuspicionResult
): Promise<void> {
  // Log the suspicious activity
  await logAuthEvent({
    action: 'SUSPICIOUS_LOGIN_DETECTED',
    actorId: context.userId,
    actorEmail: context.userEmail,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent || undefined,
    metadata: JSON.parse(
      JSON.stringify({
        reasons: suspicion.reasons,
        newDevice: suspicion.newDevice,
        newLocation: suspicion.newLocation,
        unusualTime: suspicion.unusualTime,
        impossibleTravel: suspicion.impossibleTravel,
        device: suspicion.device,
        location: suspicion.location,
      })
    ),
  });

  // Send email notification (SECR-07 requirement)
  await sendSuspiciousLoginEmail({
    to: context.userEmail,
    deviceName: formatDevice(suspicion.device),
    location: formatLocation(suspicion.location),
    ipAddress: context.ipAddress,
    timestamp: context.timestamp,
    reasons: suspicion.reasons,
  });
}

/**
 * Seed known devices/locations for a user.
 * Useful during migration to prevent false positives for existing users.
 *
 * @param userId - User ID
 * @param devices - Array of device fingerprints to add as known
 * @param locations - Array of location strings to add as known
 */
export async function seedKnownDevicesAndLocations(
  userId: string,
  devices: string[],
  locations: string[]
): Promise<void> {
  const redisClient = getRedis();
  if (!redisClient) return;

  if (devices.length > 0) {
    const deviceKey = `${DEVICE_KEY_PREFIX}${userId}`;
    for (const device of devices) {
      await redisClient.sadd(deviceKey, device);
    }
    await redisClient.expire(deviceKey, KNOWN_TTL);
  }

  if (locations.length > 0) {
    const locationKey = `${LOCATION_KEY_PREFIX}${userId}`;
    for (const location of locations) {
      await redisClient.sadd(locationKey, location);
    }
    await redisClient.expire(locationKey, KNOWN_TTL);
  }
}
