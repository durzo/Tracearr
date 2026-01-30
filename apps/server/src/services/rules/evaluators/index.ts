import type {
  Condition,
  ConditionField,
  VideoResolution,
  DeviceType,
  Platform,
} from '@tracearr/shared';
import type { ConditionEvaluator, EvaluationContext } from '../types.js';
import { compare } from '../comparisons.js';
import { geoipService } from '../../geoip.js';
import { normalizeResolution } from '../../../utils/resolutionNormalizer.js';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate distance between two points using the Haversine formula.
 * @returns Distance in kilometers, or null if coordinates are missing.
 */
function calculateDistanceKm(
  lat1: number | null,
  lon1: number | null,
  lat2: number | null,
  lon2: number | null
): number | null {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) {
    return null;
  }

  const EARTH_RADIUS_KM = 6371;
  const toRadians = (deg: number): number => (deg * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Get normalized resolution from dimensions using the standard normalizer.
 * Returns 'unknown' if dimensions are missing.
 */
function getResolution(width: number | null, height: number | null): VideoResolution {
  const result = normalizeResolution({ width: width ?? undefined, height: height ?? undefined });
  return (result as VideoResolution) ?? 'unknown';
}

/**
 * Convert resolution string to numeric value for comparison.
 */
function resolutionToNumber(resolution: VideoResolution): number {
  const map: Record<VideoResolution, number> = {
    '4K': 2160,
    '1080p': 1080,
    '720p': 720,
    '480p': 480,
    SD: 360,
    unknown: 0,
  };
  return map[resolution] ?? 0;
}

/**
 * Normalize device type from session device/platform info.
 */
function normalizeDeviceType(device: string | null, platform: string | null): DeviceType {
  const deviceLower = (device ?? '').toLowerCase();
  const platformLower = (platform ?? '').toLowerCase();

  // TV detection
  if (
    deviceLower.includes('tv') ||
    platformLower.includes('tv') ||
    platformLower.includes('roku') ||
    platformLower.includes('webos') ||
    platformLower.includes('tizen') ||
    platformLower.includes('firetv') ||
    platformLower.includes('chromecast') ||
    platformLower.includes('androidtv')
  ) {
    return 'tv';
  }

  // Mobile detection
  if (
    deviceLower.includes('iphone') ||
    deviceLower.includes('phone') ||
    platformLower === 'ios' ||
    platformLower === 'android'
  ) {
    // Check if it's a tablet
    if (deviceLower.includes('ipad') || deviceLower.includes('tablet')) {
      return 'tablet';
    }
    return 'mobile';
  }

  // Tablet detection
  if (deviceLower.includes('ipad') || deviceLower.includes('tablet')) {
    return 'tablet';
  }

  // Desktop detection
  if (
    platformLower.includes('windows') ||
    platformLower.includes('macos') ||
    platformLower.includes('linux')
  ) {
    return 'desktop';
  }

  // Browser detection (web players)
  if (
    deviceLower.includes('browser') ||
    deviceLower.includes('chrome') ||
    deviceLower.includes('firefox') ||
    deviceLower.includes('safari') ||
    deviceLower.includes('edge')
  ) {
    return 'browser';
  }

  return 'unknown';
}

/**
 * Normalize platform string to Platform enum value.
 */
function normalizePlatform(platform: string | null): Platform {
  if (!platform) return 'unknown';

  const lower = platform.toLowerCase();

  if (lower.includes('ios') || lower === 'iphone' || lower === 'ipad') return 'ios';
  if (lower.includes('android')) {
    if (lower.includes('tv')) return 'androidtv';
    return 'android';
  }
  if (lower.includes('windows')) return 'windows';
  if (lower.includes('macos') || lower.includes('mac os') || lower === 'darwin') return 'macos';
  if (lower.includes('linux')) return 'linux';
  if (lower.includes('tvos') || lower.includes('apple tv')) return 'tvos';
  if (lower.includes('roku')) return 'roku';
  if (lower.includes('webos')) return 'webos';
  if (lower.includes('tizen')) return 'tizen';

  return 'unknown';
}

// ============================================================================
// Session Behavior Evaluators
// ============================================================================

const evaluateConcurrentStreams: ConditionEvaluator = (
  context: EvaluationContext,
  condition: Condition
): boolean => {
  const { activeSessions, serverUser } = context;

  // Count active sessions for this user
  const userActiveSessions = activeSessions.filter((s) => s.serverUserId === serverUser.id);
  const count = userActiveSessions.length;

  return compare(count, condition.operator, condition.value);
};

const evaluateActiveSessionDistanceKm: ConditionEvaluator = (
  context: EvaluationContext,
  condition: Condition
): boolean => {
  const { session, activeSessions, serverUser } = context;

  // Get other active sessions for this user
  const otherSessions = activeSessions.filter(
    (s) => s.serverUserId === serverUser.id && s.id !== session.id
  );

  if (otherSessions.length === 0) {
    return compare(0, condition.operator, condition.value);
  }

  // Calculate max distance from current session to any other active session
  let maxDistance = 0;
  for (const other of otherSessions) {
    const distance = calculateDistanceKm(
      session.geoLat,
      session.geoLon,
      other.geoLat,
      other.geoLon
    );
    if (distance !== null && distance > maxDistance) {
      maxDistance = distance;
    }
  }

  return compare(maxDistance, condition.operator, condition.value);
};

const evaluateTravelSpeedKmh: ConditionEvaluator = (
  context: EvaluationContext,
  condition: Condition
): boolean => {
  const { session, recentSessions, serverUser } = context;

  // Get the most recent previous session for this user
  const previousSessions = recentSessions
    .filter((s) => s.serverUserId === serverUser.id && s.id !== session.id)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  if (previousSessions.length === 0) {
    return compare(0, condition.operator, condition.value);
  }

  const previous = previousSessions[0];
  if (!previous) {
    return compare(0, condition.operator, condition.value);
  }

  const distance = calculateDistanceKm(
    session.geoLat,
    session.geoLon,
    previous.geoLat,
    previous.geoLon
  );

  if (distance === null) {
    return compare(0, condition.operator, condition.value);
  }

  const timeDeltaMs =
    new Date(session.startedAt).getTime() - new Date(previous.startedAt).getTime();
  const timeDeltaHours = timeDeltaMs / (1000 * 60 * 60);

  if (timeDeltaHours <= 0) {
    // If sessions are at the same time with distance, speed is effectively infinite
    return distance > 0
      ? compare(Infinity, condition.operator, condition.value)
      : compare(0, condition.operator, condition.value);
  }

  const speedKmh = distance / timeDeltaHours;
  return compare(speedKmh, condition.operator, condition.value);
};

const evaluateUniqueIpsInWindow: ConditionEvaluator = (
  context: EvaluationContext,
  condition: Condition
): boolean => {
  const { session, recentSessions, serverUser } = context;
  const windowHours = condition.params?.window_hours ?? 24;

  const windowMs = windowHours * 60 * 60 * 1000;
  const cutoff = new Date(new Date(session.startedAt).getTime() - windowMs);

  // Get sessions within the window for this user
  const sessionsInWindow = recentSessions.filter(
    (s) => s.serverUserId === serverUser.id && new Date(s.startedAt) >= cutoff
  );

  // Include the current session
  const allIps = new Set<string>();
  allIps.add(session.ipAddress);

  for (const s of sessionsInWindow) {
    allIps.add(s.ipAddress);
  }

  return compare(allIps.size, condition.operator, condition.value);
};

const evaluateUniqueDevicesInWindow: ConditionEvaluator = (
  context: EvaluationContext,
  condition: Condition
): boolean => {
  const { session, recentSessions, serverUser } = context;
  const windowHours = condition.params?.window_hours ?? 24;

  const windowMs = windowHours * 60 * 60 * 1000;
  const cutoff = new Date(new Date(session.startedAt).getTime() - windowMs);

  // Get sessions within the window for this user
  const sessionsInWindow = recentSessions.filter(
    (s) => s.serverUserId === serverUser.id && new Date(s.startedAt) >= cutoff
  );

  // Count unique devices (by deviceId, falling back to playerName)
  const devices = new Set<string>();
  const addDevice = (deviceId: string | null, playerName: string | null) => {
    const identifier = deviceId ?? playerName ?? 'unknown';
    devices.add(identifier);
  };

  addDevice(session.deviceId, session.playerName);
  for (const s of sessionsInWindow) {
    addDevice(s.deviceId, s.playerName);
  }

  return compare(devices.size, condition.operator, condition.value);
};

const evaluateInactiveDays: ConditionEvaluator = (
  context: EvaluationContext,
  condition: Condition
): boolean => {
  const { serverUser } = context;

  if (!serverUser.lastActivityAt) {
    // Never had activity - treat as maximum inactivity
    const accountAgeDays = Math.floor(
      (Date.now() - new Date(serverUser.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return compare(accountAgeDays, condition.operator, condition.value);
  }

  const inactiveDays = Math.floor(
    (Date.now() - new Date(serverUser.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return compare(inactiveDays, condition.operator, condition.value);
};

// ============================================================================
// Stream Quality Evaluators
// ============================================================================

const evaluateSourceResolution: ConditionEvaluator = (
  context: EvaluationContext,
  condition: Condition
): boolean => {
  const { session } = context;

  const resolution = getResolution(session.sourceVideoWidth, session.sourceVideoHeight);
  const resolutionValue = resolutionToNumber(resolution);
  const targetValue =
    typeof condition.value === 'string'
      ? resolutionToNumber(condition.value as VideoResolution)
      : condition.value;

  // For 'in' and 'not_in' operators, compare strings directly
  if (condition.operator === 'in' || condition.operator === 'not_in') {
    return compare(resolution, condition.operator, condition.value);
  }

  return compare(resolutionValue, condition.operator, targetValue);
};

const evaluateOutputResolution: ConditionEvaluator = (
  context: EvaluationContext,
  condition: Condition
): boolean => {
  const { session } = context;

  // Use stream video details for output resolution
  const width = session.streamVideoDetails?.width ?? null;
  const height = session.streamVideoDetails?.height ?? null;

  const resolution = getResolution(width, height);
  const resolutionValue = resolutionToNumber(resolution);
  const targetValue =
    typeof condition.value === 'string'
      ? resolutionToNumber(condition.value as VideoResolution)
      : condition.value;

  // For 'in' and 'not_in' operators, compare strings directly
  if (condition.operator === 'in' || condition.operator === 'not_in') {
    return compare(resolution, condition.operator, condition.value);
  }

  return compare(resolutionValue, condition.operator, targetValue);
};

const evaluateIsTranscoding: ConditionEvaluator = (
  context: EvaluationContext,
  condition: Condition
): boolean => {
  const { session } = context;

  return compare(session.isTranscode, condition.operator, condition.value);
};

const evaluateIsTranscodeDowngrade: ConditionEvaluator = (
  context: EvaluationContext,
  condition: Condition
): boolean => {
  const { session } = context;

  if (!session.isTranscode) {
    return compare(false, condition.operator, condition.value);
  }

  // Compare source resolution to output resolution
  const sourceRes = getResolution(session.sourceVideoWidth, session.sourceVideoHeight);
  const outputWidth = session.streamVideoDetails?.width ?? null;
  const outputHeight = session.streamVideoDetails?.height ?? null;
  const outputRes = getResolution(outputWidth, outputHeight);

  const isDowngrade = resolutionToNumber(sourceRes) > resolutionToNumber(outputRes);

  return compare(isDowngrade, condition.operator, condition.value);
};

const evaluateSourceBitrateMbps: ConditionEvaluator = (
  context: EvaluationContext,
  condition: Condition
): boolean => {
  const { session } = context;

  // Use source video details bitrate if available, otherwise fall back to session bitrate
  const bitrateBps = session.sourceVideoDetails?.bitrate ?? session.bitrate ?? 0;
  const bitrateMbps = bitrateBps / 1_000_000;

  return compare(bitrateMbps, condition.operator, condition.value);
};

// ============================================================================
// User Attribute Evaluators
// ============================================================================

const evaluateUserId: ConditionEvaluator = (
  context: EvaluationContext,
  condition: Condition
): boolean => {
  const { serverUser } = context;

  return compare(serverUser.id, condition.operator, condition.value);
};

const evaluateTrustScore: ConditionEvaluator = (
  context: EvaluationContext,
  condition: Condition
): boolean => {
  const { serverUser } = context;

  return compare(serverUser.trustScore, condition.operator, condition.value);
};

const evaluateAccountAgeDays: ConditionEvaluator = (
  context: EvaluationContext,
  condition: Condition
): boolean => {
  const { serverUser } = context;

  const ageDays = Math.floor(
    (Date.now() - new Date(serverUser.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return compare(ageDays, condition.operator, condition.value);
};

// ============================================================================
// Device/Client Evaluators
// ============================================================================

const evaluateDeviceType: ConditionEvaluator = (
  context: EvaluationContext,
  condition: Condition
): boolean => {
  const { session } = context;

  const deviceType = normalizeDeviceType(session.device, session.platform);

  return compare(deviceType, condition.operator, condition.value);
};

const evaluateClientName: ConditionEvaluator = (
  context: EvaluationContext,
  condition: Condition
): boolean => {
  const { session } = context;

  // Use product as client name (e.g., "Plex for iOS", "Plex Web")
  const clientName = session.product ?? session.playerName ?? '';

  return compare(clientName, condition.operator, condition.value);
};

const evaluatePlatform: ConditionEvaluator = (
  context: EvaluationContext,
  condition: Condition
): boolean => {
  const { session } = context;

  const platform = normalizePlatform(session.platform);

  return compare(platform, condition.operator, condition.value);
};

// ============================================================================
// Network/Location Evaluators
// ============================================================================

const evaluateIsLocalNetwork: ConditionEvaluator = (
  context: EvaluationContext,
  condition: Condition
): boolean => {
  const { session } = context;

  const isLocal = geoipService.isPrivateIP(session.ipAddress);

  return compare(isLocal, condition.operator, condition.value);
};

const evaluateCountry: ConditionEvaluator = (
  context: EvaluationContext,
  condition: Condition
): boolean => {
  const { session } = context;

  const country = session.geoCountry ?? '';

  return compare(country, condition.operator, condition.value);
};

/**
 * Parse an IPv4 address into a 32-bit number.
 */
function ipv4ToNumber(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;

  let result = 0;
  for (const part of parts) {
    const num = parseInt(part, 10);
    if (isNaN(num) || num < 0 || num > 255) return null;
    result = (result << 8) + num;
  }
  return result >>> 0; // Convert to unsigned 32-bit
}

/**
 * Check if an IP address is within a CIDR range.
 * Supports IPv4 only. Returns false for IPv6 or invalid input.
 */
function isIpInCidr(ip: string, cidr: string): boolean {
  const ipNum = ipv4ToNumber(ip);
  if (ipNum === null) return false;

  const [rangeIp, prefixStr] = cidr.split('/');
  if (!rangeIp || !prefixStr) return false;

  const rangeNum = ipv4ToNumber(rangeIp);
  if (rangeNum === null) return false;

  const prefix = parseInt(prefixStr, 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;

  // Create mask: for prefix=24, mask = 0xFFFFFF00
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;

  return (ipNum & mask) === (rangeNum & mask);
}

const evaluateIpInRange: ConditionEvaluator = (
  context: EvaluationContext,
  condition: Condition
): boolean => {
  const { session } = context;
  const ip = session.ipAddress;

  if (!ip) return false;

  // Handle 'in' and 'not_in' operators with array of CIDR ranges
  if (condition.operator === 'in' || condition.operator === 'not_in') {
    if (!Array.isArray(condition.value)) return false;

    const inRange = condition.value.some((cidr) => {
      if (typeof cidr !== 'string') return false;
      return isIpInCidr(ip, cidr);
    });

    return condition.operator === 'in' ? inRange : !inRange;
  }

  // Handle 'eq' operator with single CIDR range
  if (condition.operator === 'eq' && typeof condition.value === 'string') {
    return isIpInCidr(ip, condition.value);
  }

  // Handle 'neq' operator with single CIDR range
  if (condition.operator === 'neq' && typeof condition.value === 'string') {
    return !isIpInCidr(ip, condition.value);
  }

  return false;
};

// ============================================================================
// Scope Evaluators
// ============================================================================

const evaluateServerId: ConditionEvaluator = (
  context: EvaluationContext,
  condition: Condition
): boolean => {
  const { server } = context;

  return compare(server.id, condition.operator, condition.value);
};

const evaluateLibraryId: ConditionEvaluator = (
  _context: EvaluationContext,
  condition: Condition
): boolean => {
  // Note: Session type doesn't have libraryId based on the types.ts file
  // This would need to be added to the Session type or fetched separately
  // For now, this is a placeholder that always returns false
  // TODO: Add libraryId to Session type or context
  return compare('', condition.operator, condition.value);
};

const evaluateMediaType: ConditionEvaluator = (
  context: EvaluationContext,
  condition: Condition
): boolean => {
  const { session } = context;

  return compare(session.mediaType, condition.operator, condition.value);
};

// ============================================================================
// Evaluator Registry
// ============================================================================

export const evaluatorRegistry: Record<ConditionField, ConditionEvaluator> = {
  // Session behavior
  concurrent_streams: evaluateConcurrentStreams,
  active_session_distance_km: evaluateActiveSessionDistanceKm,
  travel_speed_kmh: evaluateTravelSpeedKmh,
  unique_ips_in_window: evaluateUniqueIpsInWindow,
  unique_devices_in_window: evaluateUniqueDevicesInWindow,
  inactive_days: evaluateInactiveDays,

  // Stream quality
  source_resolution: evaluateSourceResolution,
  output_resolution: evaluateOutputResolution,
  is_transcoding: evaluateIsTranscoding,
  is_transcode_downgrade: evaluateIsTranscodeDowngrade,
  source_bitrate_mbps: evaluateSourceBitrateMbps,

  // User attributes
  user_id: evaluateUserId,
  trust_score: evaluateTrustScore,
  account_age_days: evaluateAccountAgeDays,

  // Device/client
  device_type: evaluateDeviceType,
  client_name: evaluateClientName,
  platform: evaluatePlatform,

  // Network/location
  is_local_network: evaluateIsLocalNetwork,
  country: evaluateCountry,
  ip_in_range: evaluateIpInRange,

  // Scope
  server_id: evaluateServerId,
  library_id: evaluateLibraryId,
  media_type: evaluateMediaType,
};

// Export helper functions for testing
export {
  calculateDistanceKm,
  getResolution,
  resolutionToNumber,
  normalizeDeviceType,
  normalizePlatform,
};
