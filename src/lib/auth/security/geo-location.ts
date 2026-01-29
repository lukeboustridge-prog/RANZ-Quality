/**
 * Geo-location Utility
 *
 * Provides IP-to-location lookup with multiple fallback strategies:
 * 1. Vercel/Cloudflare geolocation headers (serverless-compatible)
 * 2. geoip-lite (local development)
 * 3. Graceful fallback to "Unknown"
 *
 * Usage:
 * ```typescript
 * import { getLocation, getLocationFromHeaders, formatLocation } from '@/lib/auth/security/geo-location';
 *
 * // From request headers (recommended for serverless)
 * const location = getLocationFromHeaders(request.headers);
 *
 * // From IP address (local development only)
 * const location = getLocation('203.118.150.50');
 * console.log(formatLocation(location)); // "Auckland, NZ"
 * ```
 */

// geoip-lite is loaded dynamically to avoid serverless bundling issues
let geoip: typeof import('geoip-lite') | null = null;
let geoipLoadAttempted = false;

function loadGeoIP(): typeof import('geoip-lite') | null {
  if (geoipLoadAttempted) return geoip;
  geoipLoadAttempted = true;

  try {
    // Dynamic require to avoid bundling issues in serverless
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    geoip = require('geoip-lite');
    return geoip;
  } catch {
    // geoip-lite data files not available in serverless environment
    console.warn('geoip-lite not available, using header-based geolocation');
    return null;
  }
}

export interface GeoLocation {
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  ll: [number, number] | null; // [latitude, longitude]
}

/**
 * Get location from request headers (Vercel/Cloudflare).
 * This is the preferred method for serverless environments.
 *
 * @param headers - Request headers object
 * @returns Location information from edge network
 */
export function getLocationFromHeaders(headers: Headers | Record<string, string | undefined>): GeoLocation {
  const getHeader = (name: string): string | null => {
    if (headers instanceof Headers) {
      return headers.get(name);
    }
    return headers[name] ?? null;
  };

  // Vercel provides these headers automatically
  const country = getHeader('x-vercel-ip-country') || getHeader('cf-ipcountry');
  const city = getHeader('x-vercel-ip-city');
  const region = getHeader('x-vercel-ip-country-region');
  const latitude = getHeader('x-vercel-ip-latitude');
  const longitude = getHeader('x-vercel-ip-longitude');
  const timezone = getHeader('x-vercel-ip-timezone');

  return {
    country: country || null,
    region: region || null,
    city: city ? decodeURIComponent(city) : null,
    timezone: timezone || (country === 'NZ' ? 'Pacific/Auckland' : null),
    ll: latitude && longitude
      ? [parseFloat(latitude), parseFloat(longitude)]
      : null,
  };
}

/**
 * Get location information from IP address.
 * Falls back gracefully when geoip-lite data files are unavailable.
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

  // Try to load geoip-lite (will fail gracefully in serverless)
  const geoipModule = loadGeoIP();

  if (!geoipModule) {
    // geoip-lite not available, return unknown
    return {
      country: null,
      region: null,
      city: null,
      timezone: null,
      ll: null,
    };
  }

  const geo = geoipModule.lookup(ipAddress);

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
