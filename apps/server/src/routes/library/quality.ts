/**
 * Library Quality Evolution Route
 *
 * GET /quality - Quality distribution over time from library_items
 *
 * Uses library_items.video_resolution and created_at for accurate quality tracking
 * based on when items were actually added to the media server.
 *
 * Supports filtering by media type:
 * - 'all': All video content (movies + TV)
 * - 'movies': Only movies
 * - 'shows': Only episodes
 */

import type { FastifyPluginAsync } from 'fastify';
import { sql } from 'drizzle-orm';
import {
  REDIS_KEYS,
  CACHE_TTL,
  TIME_MS,
  libraryQualityQuerySchema,
  type LibraryQualityQueryInput,
} from '@tracearr/shared';
import { db } from '../../db/client.js';
import { validateServerAccess } from '../../utils/serverFiltering.js';
import { buildLibraryCacheKey } from './utils.js';

/** Single data point in quality timeline */
interface QualityDataPoint {
  day: string;
  totalItems: number;
  // Absolute counts
  count4k: number;
  count1080p: number;
  count720p: number;
  countSd: number;
  // Percentages
  pct4k: number;
  pct1080p: number;
  pct720p: number;
  pctSd: number;
  // Codec counts
  hevcCount: number;
  h264Count: number;
  av1Count: number;
}

/** Library quality evolution response */
interface LibraryQualityResponse {
  period: string;
  mediaType: 'all' | 'movies' | 'shows';
  data: QualityDataPoint[];
}

/**
 * Calculate start date based on period string.
 */
function getStartDate(period: '7d' | '30d' | '90d' | '1y' | 'all'): Date | null {
  const now = new Date();
  switch (period) {
    case '7d':
      return new Date(now.getTime() - 7 * TIME_MS.DAY);
    case '30d':
      return new Date(now.getTime() - 30 * TIME_MS.DAY);
    case '90d':
      return new Date(now.getTime() - 90 * TIME_MS.DAY);
    case '1y':
      return new Date(now.getTime() - 365 * TIME_MS.DAY);
    case 'all':
      return null;
  }
}

export const libraryQualityRoute: FastifyPluginAsync = async (app) => {
  /**
   * GET /quality - Quality evolution timeline
   *
   * Returns daily quality distribution snapshots showing resolution breakdowns.
   * Uses library_stats_daily continuous aggregate with media type filtering.
   *
   * Media type filtering:
   * - 'all': All video libraries (movie_count > 0 OR episode_count > 0)
   * - 'movies': Only movie libraries (movie_count > 0 AND episode_count = 0)
   * - 'shows': Only TV libraries (episode_count > 0)
   */
  app.get<{ Querystring: LibraryQualityQueryInput }>(
    '/quality',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const query = libraryQualityQuerySchema.safeParse(request.query);
      if (!query.success) {
        return reply.badRequest('Invalid query parameters');
      }

      const { serverId, period, mediaType, timezone } = query.data;
      const authUser = request.user;
      const tz = timezone ?? 'UTC';

      // Validate server access if specific server requested
      if (serverId) {
        const error = validateServerAccess(authUser, serverId);
        if (error) {
          return reply.forbidden(error);
        }
      }

      // Build cache key with all varying params including mediaType
      const cacheKey = buildLibraryCacheKey(
        REDIS_KEYS.LIBRARY_QUALITY,
        serverId,
        `${period}:${mediaType}`,
        tz
      );

      // Try cache first
      const cached = await app.redis.get(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached) as LibraryQualityResponse;
        } catch {
          // Fall through to compute
        }
      }

      // Calculate date range
      const startDate = getStartDate(period);
      const endDate = new Date();

      // Build server filter for library_items table
      const serverFilter = serverId
        ? sql`AND li.server_id = ${serverId}::uuid`
        : authUser.serverIds?.length
          ? sql`AND li.server_id = ANY(${authUser.serverIds}::uuid[])`
          : sql``;

      // Media type filter - filter by item type
      let mediaTypeFilter: ReturnType<typeof sql>;
      switch (mediaType) {
        case 'movies':
          mediaTypeFilter = sql`AND li.media_type = 'movie'`;
          break;
        case 'shows':
          mediaTypeFilter = sql`AND li.media_type = 'episode'`;
          break;
        case 'all':
        default:
          // Include movies and episodes (video content only)
          mediaTypeFilter = sql`AND li.media_type IN ('movie', 'episode')`;
          break;
      }

      // For 'all' period, find the earliest item date from the database
      // Match storage route exactly - use file_size filter, no media type filter
      // This ensures date range is consistent across all library charts
      let effectiveStartDate: Date;
      if (startDate) {
        effectiveStartDate = startDate;
      } else {
        const earliestResult = await db.execute(sql`
          SELECT MIN(created_at)::date AS earliest
          FROM library_items li
          WHERE li.file_size IS NOT NULL
            ${serverFilter}
        `);
        const earliest = (earliestResult.rows[0] as { earliest: string | null })?.earliest;
        effectiveStartDate = earliest ? new Date(earliest) : new Date('2020-01-01');
      }

      // Query with continuous date series for cumulative quality calculation
      const result = await db.execute(sql`
        WITH date_series AS (
          -- Generate all dates in the range
          SELECT d::date AS day
          FROM generate_series(
            ${effectiveStartDate.toISOString()}::date,
            ${endDate.toISOString()}::date,
            '1 day'::interval
          ) d
        ),
        quality_before_period AS (
          -- Count of items by quality BEFORE the period
          SELECT
            COALESCE(SUM(CASE WHEN li.video_resolution = '4k' THEN 1 ELSE 0 END), 0)::int AS count_4k_before,
            COALESCE(SUM(CASE WHEN li.video_resolution = '1080p' THEN 1 ELSE 0 END), 0)::int AS count_1080p_before,
            COALESCE(SUM(CASE WHEN li.video_resolution = '720p' THEN 1 ELSE 0 END), 0)::int AS count_720p_before,
            COALESCE(SUM(CASE WHEN li.video_resolution IN ('480p', 'sd') OR (li.video_resolution IS NOT NULL AND li.video_resolution NOT IN ('4k', '1080p', '720p')) THEN 1 ELSE 0 END), 0)::int AS count_sd_before
          FROM library_items li
          WHERE li.video_resolution IS NOT NULL
            ${serverFilter}
            ${mediaTypeFilter}
            AND li.created_at < ${effectiveStartDate.toISOString()}::timestamptz
        ),
        daily_additions AS (
          -- Count of items added per day by quality
          SELECT
            DATE(li.created_at AT TIME ZONE ${tz}) AS day,
            COALESCE(SUM(CASE WHEN li.video_resolution = '4k' THEN 1 ELSE 0 END), 0)::int AS added_4k,
            COALESCE(SUM(CASE WHEN li.video_resolution = '1080p' THEN 1 ELSE 0 END), 0)::int AS added_1080p,
            COALESCE(SUM(CASE WHEN li.video_resolution = '720p' THEN 1 ELSE 0 END), 0)::int AS added_720p,
            COALESCE(SUM(CASE WHEN li.video_resolution IN ('480p', 'sd') OR (li.video_resolution IS NOT NULL AND li.video_resolution NOT IN ('4k', '1080p', '720p')) THEN 1 ELSE 0 END), 0)::int AS added_sd
          FROM library_items li
          WHERE li.video_resolution IS NOT NULL
            ${serverFilter}
            ${mediaTypeFilter}
            AND li.created_at >= ${effectiveStartDate.toISOString()}::timestamptz
          GROUP BY 1
        ),
        filled_data AS (
          -- Join grid with actual data, fill nulls with 0
          SELECT
            ds.day,
            COALESCE(da.added_4k, 0)::int AS added_4k,
            COALESCE(da.added_1080p, 0)::int AS added_1080p,
            COALESCE(da.added_720p, 0)::int AS added_720p,
            COALESCE(da.added_sd, 0)::int AS added_sd
          FROM date_series ds
          LEFT JOIN daily_additions da ON da.day = ds.day
        )
        SELECT
          fd.day::text,
          (qbp.count_4k_before + SUM(fd.added_4k) OVER (ORDER BY fd.day))::int AS count_4k,
          (qbp.count_1080p_before + SUM(fd.added_1080p) OVER (ORDER BY fd.day))::int AS count_1080p,
          (qbp.count_720p_before + SUM(fd.added_720p) OVER (ORDER BY fd.day))::int AS count_720p,
          (qbp.count_sd_before + SUM(fd.added_sd) OVER (ORDER BY fd.day))::int AS count_sd
        FROM filled_data fd
        CROSS JOIN quality_before_period qbp
        ORDER BY fd.day ASC
      `);

      const rows = result.rows as Array<{
        day: string;
        count_4k: number;
        count_1080p: number;
        count_720p: number;
        count_sd: number;
      }>;

      // Calculate percentages in application code
      // totalItems = sum of all quality tiers (we filter out music libraries in the query)
      const data: QualityDataPoint[] = rows.map((row) => {
        const videoTotal = row.count_4k + row.count_1080p + row.count_720p + row.count_sd;
        const total = videoTotal || 1; // Avoid division by zero
        return {
          day: row.day,
          totalItems: videoTotal,
          // Absolute counts
          count4k: row.count_4k,
          count1080p: row.count_1080p,
          count720p: row.count_720p,
          countSd: row.count_sd,
          // Percentages (rounded to 2 decimal places)
          pct4k: Math.round((row.count_4k / total) * 10000) / 100,
          pct1080p: Math.round((row.count_1080p / total) * 10000) / 100,
          pct720p: Math.round((row.count_720p / total) * 10000) / 100,
          pctSd: Math.round((row.count_sd / total) * 10000) / 100,
          // Codec counts not available per-library (set to 0)
          // Codec distribution is shown separately in CodecDistributionSection
          hevcCount: 0,
          h264Count: 0,
          av1Count: 0,
        };
      });

      const response: LibraryQualityResponse = {
        period,
        mediaType,
        data,
      };

      // Cache for 5 minutes
      await app.redis.setex(cacheKey, CACHE_TTL.LIBRARY_QUALITY, JSON.stringify(response));

      return response;
    }
  );
};
