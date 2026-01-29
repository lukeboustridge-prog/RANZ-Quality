/**
 * Device Fingerprint Utility
 *
 * Parses user agent strings to identify browser, OS, and device type.
 * Used for suspicious login detection to track known devices.
 *
 * Note: This is a lightweight fingerprint for user familiarity tracking,
 * not a security fingerprint for fraud detection.
 *
 * Usage:
 * ```typescript
 * import { parseDevice, formatDevice } from '@/lib/auth/security/device-fingerprint';
 *
 * const device = parseDevice(request.headers.get('user-agent'));
 * console.log(formatDevice(device)); // "Chrome on Windows"
 * ```
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const UAParser = require('ua-parser-js');

export interface DeviceInfo {
  browser: string;
  os: string;
  deviceType: string;
  fingerprint: string;
}

/**
 * Parse user agent string into device information.
 *
 * @param userAgent - User agent string from request headers
 * @returns Device information including browser, OS, type, and fingerprint
 */
export function parseDevice(userAgent: string | null): DeviceInfo {
  if (!userAgent) {
    return {
      browser: 'Unknown',
      os: 'Unknown',
      deviceType: 'unknown',
      fingerprint: 'unknown-unknown-unknown',
    };
  }

  // UAParser can be called as function (returns IResult directly)
  // or as constructor (returns UAParserInstance with getResult method)
  const result = UAParser(userAgent) as {
    browser: { name?: string };
    os: { name?: string };
    device: { type?: string };
  };

  const browser = result.browser.name || 'Unknown';
  const os = result.os.name || 'Unknown';
  const deviceType = result.device.type || 'desktop';

  // Create fingerprint from browser, OS, and device type
  // This is a basic fingerprint - not for security, just for tracking familiar devices
  const fingerprint = `${browser}-${os}-${deviceType}`
    .toLowerCase()
    .replace(/\s+/g, '-');

  return {
    browser,
    os,
    deviceType,
    fingerprint,
  };
}

/**
 * Format device info for display in email notifications.
 *
 * @param device - Device info from parseDevice
 * @returns Human-readable device string (e.g., "Chrome on Windows")
 */
export function formatDevice(device: DeviceInfo): string {
  return `${device.browser} on ${device.os}`;
}
