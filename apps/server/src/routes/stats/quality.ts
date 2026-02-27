/**
 * Quality Statistics Route
 *
 * GET /quality - Direct play / direct stream / transcode breakdown
 * Uses prepared statement for 10-30% query plan reuse speedup (when no server filter)
 */

import type { FastifyPluginAsync } from 'fastify';
import { sql } from 'drizzle-orm';
import { statsQuerySchema } from '@tracearr/shared';
import { qualityStatsSince } from '../../db/prepared.js';
import { db } from '../../db/client.js';
import { resolveDateRange } from './utils.js';
import { MEDIA_TYPE_SQL_FILTER } from '../../constants/index.js';
import { validateServerAccess, buildServerFilterFragment } from '../../utils/serverFiltering.js';

export const qualityRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /quality - Direct play / direct stream / transcode breakdown
   * Uses prepared statement for better performance when no server filter
   */
  app.get('/quality', { preHandler: [app.authenticate] }, async (request, reply) => {
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
    const needsServerFilter = serverId || authUser.role !== 'owner';

    let qualityStats: { tier: string; count: number }[];

    // For 'all' period (no start date) OR when server filtering is needed, use raw query
    // Prepared statements don't support dynamic server filtering
    if (!dateRange.start || needsServerFilter) {
      const result = await db.execute(sql`
        SELECT
          CASE
            WHEN is_transcode = true THEN 'transcode'
            WHEN video_decision = 'copy' OR audio_decision = 'copy' THEN 'copy'
            ELSE 'directplay'
          END AS tier,
          COUNT(DISTINCT COALESCE(reference_id, id))::int as count
        FROM sessions
        WHERE true
        ${MEDIA_TYPE_SQL_FILTER}
        ${serverFilter}
        ${dateRange.start ? sql`AND started_at >= ${dateRange.start}` : sql``}
        GROUP BY tier
      `);
      qualityStats = (result.rows as { tier: string; count: number }[]).map((r) => ({
        tier: r.tier,
        count: r.count,
      }));
    } else {
      // No server filter needed and has date range - use prepared statement for performance
      qualityStats = await qualityStatsSince.execute({ since: dateRange.start });
    }

    const directPlay = qualityStats.find((q) => q.tier === 'directplay')?.count ?? 0;
    const directStream = qualityStats.find((q) => q.tier === 'copy')?.count ?? 0;
    const transcode = qualityStats.find((q) => q.tier === 'transcode')?.count ?? 0;
    const total = directPlay + directStream + transcode;

    return {
      directPlay,
      directStream,
      transcode,
      total,
      directPlayPercent: total > 0 ? Math.round((directPlay / total) * 100) : 0,
      directStreamPercent: total > 0 ? Math.round((directStream / total) * 100) : 0,
      transcodePercent: total > 0 ? Math.round((transcode / total) * 100) : 0,
    };
  });
};
