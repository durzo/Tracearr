/**
 * Concurrent Streams Statistics Route
 *
 * GET /concurrent - Concurrent stream history
 */

import type { FastifyPluginAsync } from 'fastify';
import { sql } from 'drizzle-orm';
import { statsQuerySchema } from '@tracearr/shared';
import { db } from '../../db/client.js';
import { resolveDateRange } from './utils.js';
import { MEDIA_TYPE_SQL_FILTER } from '../../constants/index.js';
import { validateServerAccess, buildServerFilterFragment } from '../../utils/serverFiltering.js';

/**
 * Get bucket interval based on the requested period.
 * Returns interval string for TimescaleDB time_bucket().
 */
function getBucketInterval(period: string): string {
  switch (period) {
    case 'day':
      return '1 hour';
    case 'week':
      return '6 hours';
    case 'month':
    case 'year':
      return '1 day';
    case 'all':
    default:
      return '1 week';
  }
}

export const concurrentRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /concurrent - Concurrent stream history (true concurrency)
   *
   * Uses an event-based algorithm: treats each session start as +1 and stop as -1,
   * calculates running totals, then finds peak per time bucket.
   * This scans the sessions table once instead of per-sample-point.
   */
  app.get('/concurrent', { preHandler: [app.authenticate] }, async (request, reply) => {
    const query = statsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.badRequest('Invalid query parameters');
    }

    const { period, startDate, endDate, serverId } = query.data;
    const authUser = request.user;
    const dateRange = resolveDateRange(period, startDate, endDate);

    // Validate server access if specific server requested
    if (serverId) {
      const error = validateServerAccess(authUser, serverId);
      if (error) {
        return reply.forbidden(error);
      }
    }

    const serverFilter = buildServerFilterFragment(serverId, authUser);
    const bucketInterval = getBucketInterval(period);

    // Build date filters - for event-based, we need sessions that overlap the range
    const rangeStart = dateRange.start;
    const rangeEnd = dateRange.end ?? new Date();

    // Event-based concurrent calculation:
    // 1. Create +1 events for session starts, -1 events for session stops
    // 2. Calculate running totals with window functions
    // 3. Find peak per bucket
    const result = await db.execute(sql`
      WITH filtered_sessions AS (
        SELECT started_at, stopped_at, is_transcode, video_decision, audio_decision
        FROM sessions
        WHERE stopped_at IS NOT NULL
          ${MEDIA_TYPE_SQL_FILTER}
          ${serverFilter}
          ${rangeStart ? sql`AND stopped_at >= ${rangeStart}` : sql``}
          AND started_at <= ${rangeEnd}
      ),
      events AS (
        SELECT started_at AS event_time,
               CASE WHEN is_transcode = false AND COALESCE(video_decision, 'directplay') != 'copy' AND COALESCE(audio_decision, 'directplay') != 'copy' THEN 1 ELSE 0 END AS direct_delta,
               CASE WHEN is_transcode = false AND (COALESCE(video_decision, 'directplay') = 'copy' OR COALESCE(audio_decision, 'directplay') = 'copy') THEN 1 ELSE 0 END AS copy_delta,
               CASE WHEN is_transcode = true THEN 1 ELSE 0 END AS transcode_delta
        FROM filtered_sessions
        UNION ALL
        SELECT stopped_at AS event_time,
               CASE WHEN is_transcode = false AND COALESCE(video_decision, 'directplay') != 'copy' AND COALESCE(audio_decision, 'directplay') != 'copy' THEN -1 ELSE 0 END AS direct_delta,
               CASE WHEN is_transcode = false AND (COALESCE(video_decision, 'directplay') = 'copy' OR COALESCE(audio_decision, 'directplay') = 'copy') THEN -1 ELSE 0 END AS copy_delta,
               CASE WHEN is_transcode = true THEN -1 ELSE 0 END AS transcode_delta
        FROM filtered_sessions
      ),
      running AS (
        SELECT
          event_time,
          SUM(direct_delta) OVER (ORDER BY event_time, direct_delta DESC) AS direct,
          SUM(copy_delta) OVER (ORDER BY event_time, copy_delta DESC) AS copy,
          SUM(transcode_delta) OVER (ORDER BY event_time, transcode_delta DESC) AS transcode
        FROM events
      ),
      with_total AS (
        SELECT
          event_time,
          direct,
          copy,
          transcode,
          (direct + copy + transcode) AS total
        FROM running
        ${rangeStart ? sql`WHERE event_time >= ${rangeStart}` : sql``}
      ),
      ranked AS (
        SELECT
          time_bucket(${bucketInterval}::interval, event_time) AS bucket,
          direct,
          copy,
          transcode,
          total,
          ROW_NUMBER() OVER (
            PARTITION BY time_bucket(${bucketInterval}::interval, event_time)
            ORDER BY total DESC, event_time
          ) AS rn
        FROM with_total
      )
      SELECT
        bucket::text AS hour,
        total::int,
        direct::int,
        copy::int AS direct_stream,
        transcode::int
      FROM ranked
      WHERE rn = 1
      ORDER BY bucket
    `);

    const hourlyData = (
      result.rows as {
        hour: string;
        total: number;
        direct: number;
        direct_stream: number;
        transcode: number;
      }[]
    ).map((r) => ({
      hour: r.hour,
      total: r.total,
      direct: r.direct,
      directStream: r.direct_stream,
      transcode: r.transcode,
    }));

    return { data: hourlyData };
  });
};
