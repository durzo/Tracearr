/**
 * Dashboard Statistics Route
 *
 * GET /dashboard - Dashboard summary metrics (active streams, plays, watch time, alerts)
 */

import type { FastifyPluginAsync } from 'fastify';
import { gte, sql, and, inArray } from 'drizzle-orm';
import { REDIS_KEYS, TIME_MS, type DashboardStats, dashboardQuerySchema } from '@tracearr/shared';
import { db } from '../../db/client.js';
import { sessions } from '../../db/schema.js';
import {
  playsCountSince,
  watchTimeSince,
  violationsCountSince,
  uniqueUsersSince,
} from '../../db/prepared.js';
import {
  resolveServerIds,
  buildMultiServerCondition,
  buildMultiServerFragment,
} from '../../utils/serverFiltering.js';
import { getCacheService } from '../../services/cache.js';
import { getStartOfDayInTimezone } from './utils.js';
import { PRIMARY_MEDIA_TYPES, MEDIA_TYPE_SQL_FILTER } from '../../constants/index.js';

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /dashboard - Dashboard summary metrics
   *
   * Query params:
   * - serverId: Optional UUID to filter stats to a specific server
   */
  app.get('/dashboard', { preHandler: [app.authenticate] }, async (request, reply) => {
    const query = dashboardQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.badRequest('Invalid query parameters');
    }

    const { serverId: legacyServerId, serverIds: rawServerIds, timezone } = query.data;
    const authUser = request.user;
    // Default to UTC for backwards compatibility
    const tz = timezone ?? 'UTC';

    const resolvedIds = resolveServerIds(authUser, legacyServerId, rawServerIds);

    // Build cache key (includes server IDs and timezone for correct caching)
    const cacheKeySegment = resolvedIds === undefined ? 'all' : resolvedIds.sort().join(',');
    const cacheKey = `${REDIS_KEYS.DASHBOARD_STATS}:${cacheKeySegment}:${tz}`;

    // Try cache first
    const cached = await app.redis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as DashboardStats;
      } catch {
        // Fall through to compute
      }
    }

    // Get active streams count - filter by server access
    let activeStreams = 0;
    const cacheService = getCacheService();
    if (cacheService) {
      try {
        let activeSessions = await cacheService.getAllActiveSessions();
        if (resolvedIds !== undefined) {
          const idSet = new Set(resolvedIds);
          activeSessions = activeSessions.filter((s) => idSet.has(s.serverId));
        }
        // else: owner with no filter, keep all
        activeStreams = activeSessions.length;
      } catch {
        // Ignore cache errors - activeStreams stays 0
      }
    }

    // Get today's plays and watch time (using user's timezone for "today")
    const todayStart = getStartOfDayInTimezone(tz);
    const last24h = new Date(Date.now() - TIME_MS.DAY);

    // If no serverId and user is owner, use prepared statements for performance
    // Otherwise, use dynamic queries with server filtering
    let todayPlays: number; // Validated plays (>= 2 min sessions only)
    let todaySessions: number; // Raw session count
    let watchTimeHours: number;
    let alertsLast24h: number;
    let activeUsersToday: number;

    const MIN_PLAY_DURATION_MS = 120000;

    if (resolvedIds === undefined && authUser.role === 'owner') {
      const [
        todayPlaysResult,
        watchTimeResult,
        alertsResult,
        activeUsersResult,
        validatedPlaysResult,
      ] = await Promise.all([
        playsCountSince.execute({ since: todayStart }),
        watchTimeSince.execute({ since: todayStart }),
        violationsCountSince.execute({ since: last24h }),
        uniqueUsersSince.execute({ since: todayStart }),
        db.execute(sql`
            SELECT COUNT(DISTINCT COALESCE(reference_id, id))::int as count
            FROM sessions
            WHERE (started_at AT TIME ZONE ${tz})::date = (NOW() AT TIME ZONE ${tz})::date
              AND duration_ms >= ${MIN_PLAY_DURATION_MS}
              ${MEDIA_TYPE_SQL_FILTER}
          `),
      ]);

      todaySessions = todayPlaysResult[0]?.count ?? 0;
      todayPlays = (validatedPlaysResult.rows[0] as { count: number })?.count ?? 0;
      watchTimeHours =
        Math.round((Number(watchTimeResult[0]?.totalMs ?? 0) / (1000 * 60 * 60)) * 10) / 10;
      alertsLast24h = alertsResult[0]?.count ?? 0;
      activeUsersToday = activeUsersResult[0]?.count ?? 0;
    } else {
      // Build server filter conditions for dynamic queries
      const buildSessionConditions = (since: Date) => {
        const conditions = [
          gte(sessions.startedAt, since),
          // Exclude live TV and music tracks from dashboard stats
          inArray(sessions.mediaType, PRIMARY_MEDIA_TYPES),
        ];

        const serverCondition = buildMultiServerCondition(resolvedIds, sessions.serverId);
        if (serverCondition) {
          conditions.push(serverCondition);
        }

        return conditions;
      };

      const violationServerFilter = buildMultiServerFragment(resolvedIds, 'su.server_id');
      const sessionServerFilter = buildMultiServerFragment(resolvedIds);

      // Execute dynamic queries in parallel
      const [
        todaySessionsResult,
        watchTimeResult,
        alertsResult,
        activeUsersResult,
        validatedPlaysResult,
      ] = await Promise.all([
        // Session count (raw)
        db
          .select({
            count: sql<number>`count(DISTINCT COALESCE(reference_id, id))::int`,
          })
          .from(sessions)
          .where(and(...buildSessionConditions(todayStart))),

        // Watch time
        db
          .select({
            totalMs: sql<number>`COALESCE(SUM(duration_ms), 0)::bigint`,
          })
          .from(sessions)
          .where(and(...buildSessionConditions(todayStart))),

        // Violations count (join through serverUsers for server filtering)
        db
          .execute(
            sql`
            SELECT count(*)::int as count
            FROM violations v
            INNER JOIN server_users su ON su.id = v.server_user_id
            WHERE v.created_at >= ${last24h}
            ${violationServerFilter}
          `
          )
          .then((r) => [{ count: (r.rows[0] as { count: number })?.count ?? 0 }]),

        // Unique users
        db
          .select({
            count: sql<number>`count(DISTINCT server_user_id)::int`,
          })
          .from(sessions)
          .where(and(...buildSessionConditions(todayStart))),

        db.execute(sql`
            SELECT COUNT(DISTINCT COALESCE(reference_id, id))::int as count
            FROM sessions
            WHERE (started_at AT TIME ZONE ${tz})::date = (NOW() AT TIME ZONE ${tz})::date
              AND duration_ms >= ${MIN_PLAY_DURATION_MS}
              ${MEDIA_TYPE_SQL_FILTER}
            ${sessionServerFilter}
          `),
      ]);

      todaySessions = todaySessionsResult[0]?.count ?? 0;
      todayPlays = (validatedPlaysResult.rows[0] as { count: number })?.count ?? 0;
      watchTimeHours =
        Math.round((Number(watchTimeResult[0]?.totalMs ?? 0) / (1000 * 60 * 60)) * 10) / 10;
      alertsLast24h = alertsResult[0]?.count ?? 0;
      activeUsersToday = activeUsersResult[0]?.count ?? 0;
    }

    const stats: DashboardStats = {
      activeStreams,
      todayPlays,
      todaySessions,
      watchTimeHours,
      alertsLast24h,
      activeUsersToday,
    };

    // Cache for 60 seconds
    await app.redis.setex(cacheKey, 60, JSON.stringify(stats));

    return stats;
  });
};
