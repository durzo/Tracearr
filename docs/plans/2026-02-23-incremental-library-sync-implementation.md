# Incremental Library Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make recurring library syncs near-instant by only fetching items added since the last sync, with safe fallback to full scan.

**Architecture:** Extend existing media server clients with date-filtered fetch methods. Track sync timestamps in Redis. The sync decision tree picks incremental or full based on item count comparison. Stagger scheduled syncs across servers.

**Tech Stack:** Fastify, BullMQ, Redis (ioredis), Drizzle ORM, Vitest

**Code style:** Write like a human. No AI-flavored comments. No "comprehensive" or "robust" in comments. DRY where it makes sense. Match existing patterns in whatever file you're editing. Commits have no attribution lines.

---

### Task 1: Add Redis Key Constants for Sync State

**Files:**

- Modify: `packages/shared/src/constants.ts:188-190` (after LIBRARY_RESOLUTION getter)

**Step 1: Add the key factory functions**

After the `LIBRARY_RESOLUTION` getter (line 190), add:

```typescript
  // Library sync state (incremental sync tracking)
  LIBRARY_SYNC_LAST: (serverId: string, libraryId: string) =>
    `${_redisPrefix}tracearr:library:sync:last:${serverId}:${libraryId}`,
  LIBRARY_SYNC_COUNT: (serverId: string, libraryId: string) =>
    `${_redisPrefix}tracearr:library:sync:count:${serverId}:${libraryId}`,
```

**Step 2: Run typecheck**

Run: `pnpm --filter @tracearr/shared typecheck`
Expected: PASS

**Step 3: Commit**

```
Add Redis key constants for sync state tracking
```

---

### Task 2: Add `getLibraryItemsSince` and `getLibraryLeavesSince` to Interface

**Files:**

- Modify: `apps/server/src/services/mediaServer/types.ts:440-447` (after `getLibraryLeaves`)

**Step 1: Add optional methods to IMediaServerClient**

After `getLibraryLeaves?` (line 447), add:

```typescript
  /**
   * Get items added or changed since a given date. Used for incremental sync.
   * Optional — falls back to full fetch if not implemented.
   */
  getLibraryItemsSince?(
    libraryId: string,
    since: Date,
    options?: { offset?: number; limit?: number }
  ): Promise<{ items: MediaLibraryItem[]; totalCount: number }>;

  /**
   * Get leaf items (episodes/tracks) added or changed since a given date.
   * Optional — falls back to full fetch if not implemented.
   */
  getLibraryLeavesSince?(
    libraryId: string,
    since: Date,
    options?: { offset?: number; limit?: number }
  ): Promise<{ items: MediaLibraryItem[]; totalCount: number }>;
```

**Step 2: Run typecheck**

Run: `pnpm --filter @tracearr/server typecheck`
Expected: PASS (methods are optional, no implementations required yet)

**Step 3: Commit**

```
Add incremental fetch methods to media server client interface
```

---

### Task 3: Implement Plex `getLibraryItemsSince` and `getLibraryLeavesSince`

**Files:**

- Modify: `apps/server/src/services/mediaServer/plex/client.ts`

**Step 1: Write tests for Plex incremental fetch**

Create: `apps/server/src/services/mediaServer/plex/__tests__/client.incremental.test.ts`

Test that the Plex client:

1. Adds `addedAt>>=<epoch>` param when `since` is provided
2. Uses the same endpoint (`/library/sections/{id}/all`)
3. Converts Date to unix epoch seconds (not milliseconds)
4. Still includes `includeGuids=1`
5. Still returns `{ items, totalCount }` in the same shape

Use the same mock patterns from `apps/server/src/services/__tests__/librarySync.test.ts` — mock `fetchJson` and verify the URL params.

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @tracearr/server test:unit -- --run apps/server/src/services/mediaServer/plex/__tests__/client.incremental.test.ts`
Expected: FAIL — methods don't exist yet

**Step 3: Implement `getLibraryItemsSince` in PlexClient**

Add after `getLibraryItems` (line 211):

```typescript
  async getLibraryItemsSince(
    libraryId: string,
    since: Date,
    options?: { offset?: number; limit?: number }
  ): Promise<{ items: MediaLibraryItem[]; totalCount: number }> {
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;

    const params = new URLSearchParams({
      includeGuids: '1',
      'X-Plex-Container-Start': String(offset),
      'X-Plex-Container-Size': String(limit),
      'addedAt>>=': String(Math.floor(since.getTime() / 1000)),
    });

    const data = await fetchJson<unknown>(
      `${this.baseUrl}/library/sections/${libraryId}/all?${params}`,
      {
        headers: this.buildHeaders(),
        service: 'plex',
        timeout: 30000,
      }
    );

    const container = data as { MediaContainer?: { totalSize?: number } };
    const totalCount = container?.MediaContainer?.totalSize ?? 0;
    const items = parseLibraryItemsResponse(data);

    return { items, totalCount };
  }
```

**Step 4: Implement `getLibraryLeavesSince` in PlexClient**

Add after `getLibraryLeaves` (line 251):

```typescript
  async getLibraryLeavesSince(
    libraryId: string,
    since: Date,
    options?: { offset?: number; limit?: number }
  ): Promise<{ items: MediaLibraryItem[]; totalCount: number }> {
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;

    const params = new URLSearchParams({
      includeGuids: '1',
      'X-Plex-Container-Start': String(offset),
      'X-Plex-Container-Size': String(limit),
      'addedAt>>=': String(Math.floor(since.getTime() / 1000)),
    });

    const data = await fetchJson<unknown>(
      `${this.baseUrl}/library/sections/${libraryId}/allLeaves?${params}`,
      {
        headers: this.buildHeaders(),
        service: 'plex',
        timeout: 30000,
      }
    );

    const container = data as { MediaContainer?: { totalSize?: number } };
    const totalCount = container?.MediaContainer?.totalSize ?? 0;
    const items = parseLibraryItemsResponse(data);

    return { items, totalCount };
  }
```

Note: These are nearly identical to the existing methods — the only difference is the `addedAt>>=` param. This is intentional. DRY would mean extracting a shared helper, but the methods are short and the duplication is obvious. If a third variant appears later, refactor then.

**Step 5: Run tests**

Run: `pnpm --filter @tracearr/server test:unit -- --run apps/server/src/services/mediaServer/plex/__tests__/client.incremental.test.ts`
Expected: PASS

**Step 6: Commit**

```
Add incremental fetch methods to Plex client
```

---

### Task 4: Implement Jellyfin/Emby `getLibraryItemsSince` and `getLibraryLeavesSince`

**Files:**

- Modify: `apps/server/src/services/mediaServer/shared/baseMediaServerClient.ts`

**Step 1: Write tests for Jellyfin incremental fetch**

Create: `apps/server/src/services/mediaServer/shared/__tests__/baseMediaServerClient.incremental.test.ts`

Test that the base client:

1. Adds `minDateLastSaved=<ISO_8601>` param when `since` is provided
2. Uses the same `/Items` endpoint
3. Converts Date to ISO 8601 string
4. Still includes all existing params (`ParentId`, `Recursive`, `IncludeItemTypes`, etc.)
5. Returns `{ items, totalCount }` in the same shape

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @tracearr/server test:unit -- --run apps/server/src/services/mediaServer/shared/__tests__/baseMediaServerClient.incremental.test.ts`
Expected: FAIL

**Step 3: Implement `getLibraryItemsSince` in BaseMediaServerClient**

Add after `getLibraryItems` (line 225):

```typescript
  async getLibraryItemsSince(
    libraryId: string,
    since: Date,
    options?: { offset?: number; limit?: number }
  ): Promise<{ items: MediaLibraryItem[]; totalCount: number }> {
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;

    const params = new URLSearchParams({
      ParentId: libraryId,
      Recursive: 'true',
      IncludeItemTypes: 'Movie,Series,MusicArtist,MusicAlbum,Audio',
      IsMissing: 'false',
      Fields:
        'ProviderIds,Path,MediaSources,DateCreated,ProductionYear,SeriesName,SeriesId,ParentIndexNumber,IndexNumber,Album,AlbumArtist,Artists',
      StartIndex: String(offset),
      Limit: String(limit),
      minDateLastSaved: since.toISOString(),
    });

    const data = await fetchJson<{ Items?: unknown[]; TotalRecordCount?: number }>(
      `${this.baseUrl}/Items?${params}`,
      {
        headers: this.buildHeaders(),
        service: this.serverType,
        timeout: 30000,
      }
    );

    const items = this.parsers.parseLibraryItemsResponse(data.Items ?? []);
    const totalCount = data.TotalRecordCount ?? items.length;

    return { items, totalCount };
  }
```

**Step 4: Implement `getLibraryLeavesSince` in BaseMediaServerClient**

Add after `getLibraryLeaves` (line 270):

```typescript
  async getLibraryLeavesSince(
    libraryId: string,
    since: Date,
    options?: { offset?: number; limit?: number }
  ): Promise<{ items: MediaLibraryItem[]; totalCount: number }> {
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;

    const params = new URLSearchParams({
      ParentId: libraryId,
      Recursive: 'true',
      IncludeItemTypes: 'Episode',
      IsMissing: 'false',
      Fields:
        'ProviderIds,Path,MediaSources,DateCreated,ProductionYear,SeriesName,SeriesId,ParentIndexNumber,IndexNumber',
      StartIndex: String(offset),
      Limit: String(limit),
      minDateLastSaved: since.toISOString(),
    });

    const data = await fetchJson<{ Items?: unknown[]; TotalRecordCount?: number }>(
      `${this.baseUrl}/Items?${params}`,
      {
        headers: this.buildHeaders(),
        service: this.serverType,
        timeout: 30000,
      }
    );

    const items = this.parsers.parseLibraryItemsResponse(data.Items ?? []);
    const totalCount = data.TotalRecordCount ?? items.length;

    return { items, totalCount };
  }
```

**Step 5: Run tests**

Run: `pnpm --filter @tracearr/server test:unit -- --run apps/server/src/services/mediaServer/shared/__tests__/baseMediaServerClient.incremental.test.ts`
Expected: PASS

**Step 6: Run typecheck**

Run: `pnpm --filter @tracearr/server typecheck`
Expected: PASS

**Step 7: Commit**

```
Add incremental fetch methods to Jellyfin/Emby client
```

---

### Task 5: Add Sync Mode to LibrarySyncService

This is the main logic change. Modify `syncLibrary()` to support incremental mode.

**Files:**

- Modify: `apps/server/src/services/librarySync.ts`

**Step 1: Write tests for sync mode decision logic**

Add to `apps/server/src/services/__tests__/librarySync.test.ts`, new describe block:

```typescript
describe('incremental sync', () => {
  it('does full scan when no lastSyncedAt exists', async () => { ... });
  it('does full scan when totalCount < lastItemCount', async () => { ... });
  it('does incremental scan when totalCount >= lastItemCount and lastSyncedAt exists', async () => { ... });
  it('skips snapshot when incremental finds 0 new items and count matches', async () => { ... });
  it('falls back to full scan when getLibraryItemsSince throws', async () => { ... });
  it('stores lastSyncedAt with 5-minute safety margin', async () => { ... });
});
```

Mock Redis (`ioredis`) for get/set operations on the sync state keys. Mock the client's `getLibraryItemsSince` method.

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter @tracearr/server test:unit -- --run apps/server/src/services/__tests__/librarySync.test.ts`
Expected: New tests FAIL

**Step 3: Add imports and constants**

At top of `apps/server/src/services/librarySync.ts`, add Redis import and constants:

```typescript
import { REDIS_KEYS } from '@tracearr/shared';
import { getRedisClient } from '../plugins/redis.js';

const BATCH_DELAY_MS_INCREMENTAL = 50;
const SYNC_SAFETY_MARGIN_MS = 5 * 60 * 1000; // 5 minutes
const SYNC_STATE_TTL = 30 * 24 * 60 * 60; // 30 days in seconds
```

**Step 4: Add sync state helpers**

Add private methods to `LibrarySyncService`:

```typescript
  private async getSyncState(
    serverId: string,
    libraryId: string
  ): Promise<{ lastSyncedAt: Date | null; lastItemCount: number | null }> {
    const redis = getRedisClient();
    if (!redis) return { lastSyncedAt: null, lastItemCount: null };

    const [lastStr, countStr] = await Promise.all([
      redis.get(REDIS_KEYS.LIBRARY_SYNC_LAST(serverId, libraryId)),
      redis.get(REDIS_KEYS.LIBRARY_SYNC_COUNT(serverId, libraryId)),
    ]);

    return {
      lastSyncedAt: lastStr ? new Date(lastStr) : null,
      lastItemCount: countStr ? parseInt(countStr, 10) : null,
    };
  }

  private async saveSyncState(
    serverId: string,
    libraryId: string,
    itemCount: number
  ): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;

    const safeTimestamp = new Date(Date.now() - SYNC_SAFETY_MARGIN_MS).toISOString();

    await Promise.all([
      redis.set(
        REDIS_KEYS.LIBRARY_SYNC_LAST(serverId, libraryId),
        safeTimestamp,
        'EX',
        SYNC_STATE_TTL
      ),
      redis.set(
        REDIS_KEYS.LIBRARY_SYNC_COUNT(serverId, libraryId),
        String(itemCount),
        'EX',
        SYNC_STATE_TTL
      ),
    ]);
  }
```

**Step 5: Modify `syncServer` to pass `triggeredBy`**

Change the `syncServer` signature and pass `triggeredBy` through to `syncLibrary`:

```typescript
async syncServer(
  serverId: string,
  onProgress?: OnProgressCallback,
  triggeredBy: 'manual' | 'scheduled' = 'scheduled'
): Promise<SyncResult[]> {
```

Pass it through in the `syncLibrary` call.

**Step 6: Modify `syncLibrary` for incremental support**

The key change. `syncLibrary` gains a `triggeredBy` parameter and the decision tree at the top:

1. Fetch `totalCount` (already done)
2. Load sync state from Redis
3. Decide: `isIncremental` based on the tree
4. If incremental: use `getLibraryItemsSince` instead of `getLibraryItems`, use `BATCH_DELAY_MS_INCREMENTAL` instead of `BATCH_DELAY_MS`
5. If incremental and 0 items fetched and count matches: skip delta/snapshot, save state, return early
6. If incremental fetch throws: catch, log, fall back to full scan path
7. After sync: call `saveSyncState`

The full scan path stays exactly as-is. The incremental path replaces only the fetch calls and the delay constant.

**Step 7: Run tests**

Run: `pnpm --filter @tracearr/server test:unit -- --run apps/server/src/services/__tests__/librarySync.test.ts`
Expected: ALL PASS

**Step 8: Run typecheck**

Run: `pnpm --filter @tracearr/server typecheck`
Expected: PASS

**Step 9: Commit**

```
Add incremental sync mode to library sync service
```

---

### Task 6: Pass `triggeredBy` from BullMQ Worker to SyncService

**Files:**

- Modify: `apps/server/src/jobs/librarySyncQueue.ts:172`

**Step 1: Update the worker to pass triggeredBy**

Line 172 currently:

```typescript
const results = await librarySyncService.syncServer(serverId, onProgress);
```

Change to:

```typescript
const results = await librarySyncService.syncServer(serverId, onProgress, triggeredBy);
```

`triggeredBy` is already destructured from `job.data` on line 140.

**Step 2: Run typecheck**

Run: `pnpm --filter @tracearr/server typecheck`
Expected: PASS

**Step 3: Commit**

```
Pass sync trigger source through to sync service
```

---

### Task 7: Stagger Scheduled Sync Cron Per Server

**Files:**

- Modify: `apps/server/src/jobs/librarySyncQueue.ts` — `scheduleAutoSync` function (line 325-395)

**Step 1: Write test for cron staggering**

Test that servers get different cron patterns with 4-minute offsets.

**Step 2: Implement staggered cron**

In the `scheduleAutoSync` loop where servers get their repeatable jobs, change from a fixed cron to a per-server offset:

```typescript
for (let i = 0; i < allServers.length; i++) {
  const server = allServers[i]!;
  const minuteOffset = 10 + i * 4; // Server 0: :10, Server 1: :14, Server 2: :18, ...

  await librarySyncQueue.add(
    `auto-sync-${server.id}`,
    {
      serverId: server.id,
      triggeredBy: 'scheduled',
    },
    {
      repeat: {
        pattern: `${minuteOffset} */12 * * *`,
        tz: 'UTC',
      },
      jobId: `scheduled-${server.id}`,
    }
  );
}
```

Cap at 59 minutes: `const minuteOffset = Math.min(10 + i * 4, 59);`

**Step 3: Run tests**

Run: `pnpm --filter @tracearr/server test:unit -- --run`
Expected: ALL PASS

**Step 4: Commit**

```
Stagger scheduled library syncs across servers
```

---

### Task 8: Full Test Suite Pass + Typecheck

**Files:** None (verification only)

**Step 1: Run full unit tests**

Run: `pnpm test:unit`
Expected: ALL PASS

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Run lint**

Run: `pnpm lint`
Expected: PASS (fix any issues)

**Step 4: Commit any fixes**

---

### Task 9: Manual API Validation (Before Merge)

This task requires real server credentials. The user will provide API access to Plex, Jellyfin, and Emby servers.

**Step 1: Test Plex date filter**

Using curl or a test script, hit the Plex API with the `addedAt>>=` filter and verify:

- Response format matches unfiltered response
- `totalSize` in `MediaContainer` reflects the filtered count
- Pagination works correctly with the filter

**Step 2: Test Jellyfin date filter**

Hit the Jellyfin API with `minDateLastSaved=` and verify:

- Response format matches unfiltered response
- `TotalRecordCount` reflects the filtered count
- `StartIndex`/`Limit` pagination works with the filter

**Step 3: Test Emby date filter**

Same as Jellyfin (shared API).

**Step 4: Document any differences**

If any API behaves differently than expected, note it and adjust the implementation.
