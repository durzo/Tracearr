/**
 * DNS Cache Utility
 *
 * When DNS_CACHE_MAX_TTL is set, configures a global undici dispatcher with
 * DNS caching via cacheable-lookup. All fetch() calls then use cached resolution.
 *
 * Each record's TTL from the authoritative DNS server is respected — records
 * expire when the zone's TTL says they should. DNS_CACHE_MAX_TTL only caps
 * the upper bound (e.g., if a zone returns a 1-hour TTL, we still expire
 * after maxTtl seconds). It does not override shorter TTLs.
 *
 * Errors (NXDOMAIN, SERVFAIL) are cached for only 0.15s by default,
 * so transient DNS failures do not persist across poll cycles.
 *
 * Import this module early in server startup (side-effect import).
 */

import type dns from 'node:dns';

if (process.env.DNS_CACHE_MAX_TTL) {
  const maxTtl = parseInt(process.env.DNS_CACHE_MAX_TTL, 10);
  const { default: CacheableLookup } = await import('cacheable-lookup');
  const { Agent, setGlobalDispatcher } = await import('undici');

  const cacheable = new CacheableLookup({ maxTtl });

  setGlobalDispatcher(
    new Agent({
      connect: { lookup: cacheable.lookup.bind(cacheable) as typeof dns.lookup },
    })
  );

  console.info(`[DNS] Cache enabled (max TTL: ${maxTtl}s)`);
}
