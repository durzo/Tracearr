/**
 * Resolution Normalizer
 *
 * Normalizes video resolution from various sources (Plex, Jellyfin, Emby)
 * into consistent, display-friendly labels for Tracearr.
 *
 * Uses "max of width-based and height-based" logic to correctly classify:
 * - Widescreen/anamorphic content (e.g., 1920x804 should be "1080p", not "720p")
 * - 4:3 aspect ratio content (e.g., 1440x1080 should be "1080p", not "720p")
 *
 * This utility is used by:
 * - Session mapper (for live sessions)
 * - History imports (Tautulli, Jellystat)
 */

export interface ResolutionInput {
  /** Resolution string from API (e.g., "1080", "1080p", "4k", "sd") */
  resolution?: string;
  /** Video width in pixels (preferred - handles widescreen correctly) */
  width?: number;
  /** Video height in pixels (fallback) */
  height?: number;
}

// Resolution tier values for comparison (higher = better quality)
const RESOLUTION_TIERS = {
  '4K': 4,
  '1080p': 3,
  '720p': 2,
  '480p': 1,
  SD: 0,
} as const;

type ResolutionLabel = keyof typeof RESOLUTION_TIERS;

/**
 * Get resolution tier from width (for widescreen detection)
 */
function getResolutionFromWidth(width: number): ResolutionLabel {
  if (width >= 3840) return '4K';
  if (width >= 1920) return '1080p';
  if (width >= 1280) return '720p';
  if (width >= 854) return '480p';
  return 'SD';
}

/**
 * Get resolution tier from height (standard classification)
 * Resolution names (720p, 1080p) are HEIGHT-based per broadcast standards
 */
function getResolutionFromHeight(height: number): ResolutionLabel {
  if (height >= 2160) return '4K';
  if (height >= 1080) return '1080p';
  if (height >= 720) return '720p';
  if (height >= 480) return '480p';
  return 'SD';
}

/**
 * Normalize video resolution to a display-friendly label
 *
 * Priority: width/height dimensions over resolution strings. This correctly
 * classifies widescreen/scope content where Plex's height-based resolution
 * string is misleading (e.g., Plex sends "720" for 1920x800 scope content).
 *
 * Uses MAX of width-based and height-based classification to handle all cases:
 * - Widescreen: 1920x800 → max(1080p by width, 720p by height) = 1080p ✓
 * - 4:3 content: 1440x1080 → max(720p by width, 1080p by height) = 1080p ✓
 * - Standard 16:9: 1920x1080 → max(1080p by width, 1080p by height) = 1080p ✓
 *
 * @param input - Resolution data from media server
 * @returns Normalized resolution string (e.g., "4K", "1080p", "720p", "SD") or null
 *
 * @example
 * normalizeResolution({ width: 1920, height: 800 })      // "1080p" (widescreen 2.40:1)
 * normalizeResolution({ width: 1920, height: 804 })      // "1080p" (widescreen 2.39:1)
 * normalizeResolution({ width: 1440, height: 1080 })     // "1080p" (4:3 aspect ratio)
 * normalizeResolution({ width: 1920, height: 1080 })     // "1080p" (16:9 standard)
 * normalizeResolution({ width: 3840, height: 1600 })     // "4K" (ultrawide)
 * normalizeResolution({ resolution: '1080p' })           // "1080p" (string fallback)
 * // Width/height takes precedence over resolution string:
 * normalizeResolution({ resolution: '720', width: 1920, height: 800 }) // "1080p"
 */
export function normalizeResolution(input: ResolutionInput): string | null {
  const { resolution, width, height } = input;

  // 1. Width + Height available → use MAX of both (handles all aspect ratios)
  // This correctly classifies widescreen (scope) and 4:3 content:
  // - Widescreen 1920x800: max(1080p, 720p) = 1080p (width indicates source quality)
  // - 4:3 content 1440x1080: max(720p, 1080p) = 1080p (height indicates source quality)
  if (width && height) {
    const widthRes = getResolutionFromWidth(width);
    const heightRes = getResolutionFromHeight(height);

    // Return the higher quality tier
    return RESOLUTION_TIERS[widthRes] >= RESOLUTION_TIERS[heightRes] ? widthRes : heightRes;
  }

  // 2. Width-only → widescreen detection
  if (width) {
    return getResolutionFromWidth(width);
  }

  // 3. Height-only → standard classification by vertical pixels
  if (height) {
    return getResolutionFromHeight(height);
  }

  // 4. Resolution string fallback (when no dimensions available)
  if (resolution) {
    const lower = resolution.toLowerCase();

    // Handle 4K/UHD variants
    if (lower === '4k' || lower === '2160' || lower === '2160p' || lower === 'uhd') {
      return '4K';
    }

    // Handle standard resolutions
    if (lower === '1080' || lower === '1080p' || lower === 'fhd') {
      return '1080p';
    }
    if (lower === '720' || lower === '720p' || lower === 'hd') {
      return '720p';
    }
    if (lower === '480' || lower === '480p') {
      return '480p';
    }
    if (lower === 'sd') {
      return 'SD';
    }

    // Handle numeric-only values (e.g., "576" -> "576p")
    if (/^\d+$/.test(lower)) {
      return `${lower}p`;
    }

    // Return as-is if already formatted
    return resolution;
  }

  return null;
}

/**
 * Build quality display string from session quality data
 *
 * @param quality - Session quality object
 * @returns Quality string for display (e.g., "4K", "1080p", "54 Mbps", "Direct")
 */
export function formatQualityString(quality: {
  videoResolution?: string;
  videoWidth?: number;
  videoHeight?: number;
  bitrate?: number;
  isTranscode?: boolean;
  streamVideoDetails?: { width?: number; height?: number };
}): string {
  const effectiveWidth = quality.isTranscode
    ? (quality.streamVideoDetails?.width ?? quality.videoWidth)
    : quality.videoWidth;
  const effectiveHeight = quality.isTranscode
    ? (quality.streamVideoDetails?.height ?? quality.videoHeight)
    : quality.videoHeight;

  // Prefer resolution-based display
  const resolution = normalizeResolution({
    resolution: quality.videoResolution,
    width: effectiveWidth,
    height: effectiveHeight,
  });

  if (resolution) {
    return resolution;
  }

  // Fall back to bitrate if available
  if (quality.bitrate && quality.bitrate > 0) {
    const mbps = quality.bitrate / 1000;
    const formatted = mbps % 1 === 0 ? mbps.toFixed(0) : mbps.toFixed(1);
    return `${formatted} Mbps`;
  }

  // Last resort: transcode status
  return quality.isTranscode ? 'Transcoding' : 'Direct';
}
