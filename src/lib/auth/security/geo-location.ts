/**
 * Geo-location Utility
 *
 * Provides IP-to-location lookup using geoip-lite (bundled MaxMind database).
 * No external API calls required - all lookups are local.
 *
 * Usage:
 * ```typescript
 * import { getLocation, formatLocation } from '@/lib/auth/security/geo-location';
 *
 * const location = getLocation('203.118.150.50');
 * console.log(formatLocation(location)); // "Auckland, NZ"
 * ```
 */

import * as geoip from 'geoip-lite';

export interface GeoLocation {
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  ll: [number, number] | null; // [latitude, longitude]
}

/**
 * Get location information from IP address.
 * Uses MaxMind GeoLite database (bundled with geoip-lite).
 *
 * @param ipAddress - IPv4 or IPv6 address
 * @returns Location information (may be partial or empty for private/unknown IPs)
 */
export function getLocation(ipAddress: string): GeoLocation {
  // Skip for localhost/private IPs
  if (isPrivateIP(ipAddress)) {
    return {
      country: null,
      region: null,
      city: null,
      timezone: 'Pacific/Auckland', // Default for NZ
      ll: null,
    };
  }

  const geo = geoip.lookup(ipAddress);

  if (!geo) {
    return {
      country: null,
      region: null,
      city: null,
      timezone: null,
      ll: null,
    };
  }

  return {
    country: geo.country,
    region: geo.region,
    city: geo.city,
    timezone: geo.timezone,
    ll: geo.ll,
  };
}

/**
 * Format location for display in emails and logs.
 *
 * @param geo - Location data from getLocation
 * @returns Human-readable location string (e.g., "Auckland, NZ")
 */
export function formatLocation(geo: GeoLocation): string {
  if (geo.city && geo.country) {
    return `${geo.city}, ${geo.country}`;
  }
  if (geo.country) {
    return geo.country;
  }
  return 'Unknown location';
}

/**
 * Check if IP is private/localhost.
 * These IPs cannot be geolocated and are treated as local.
 */
function isPrivateIP(ip: string): boolean {
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.2') ||
    ip.startsWith('172.30.') ||
    ip.startsWith('172.31.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('169.254.') ||
    ip === 'localhost'
  );
}
