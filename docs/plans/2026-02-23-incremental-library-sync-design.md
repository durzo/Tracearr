# Incremental Library Sync

Speed up recurring library syncs by only fetching items added or changed since the last sync. Initial syncs remain full scans. Includes staggered scheduling and minor performance tuning.

## Problem

Library sync currently does a full scan every time — fetching every item from every library on every server. A 100K-item library takes ~5 minutes even when nothing changed. Users with large Plex/Jellyfin/Emby servers report syncs running for hours or days.

The 150ms batch delay between API calls accounts for ~47% of total sync time. Combined with sequential processing and no incremental fetching, nightly syncs are unnecessarily slow.

## API Support

Both Plex and Jellyfin/Emby support date-filtered library queries. The current clients don't use them.

**Plex:** `/library/sections/{id}/all?addedAt>>=<unix_epoch>&includeGuids=1`

**Jellyfin/Emby:** `/Items?minDateLastSaved=<ISO_8601>&ParentId=<id>&Recursive=true&...`

Both support the same pagination they already use. Same response format. Same fields.

## Client Interface

Add optional methods to `IMediaServerClient`:

```typescript
getLibraryItemsSince?(
  libraryId: string,
  since: Date,
  options?: { offset?: number; limit?: number }
): Promise<{ items: MediaLibraryItem[]; totalCount: number }>;

getLibraryLeavesSince?(
  libraryId: string,
  since: Date,
  options?: { offset?: number; limit?: number }
): Promise<{ items: MediaLibraryItem[]; totalCount: number }>;
```

Optional (`?`) so existing behavior is untouched when the method isn't available.

### Plex Implementation

Same endpoint, same headers, one extra query param:

```
addedAt>>=<Math.floor(since.getTime() / 1000)>
```

### Jellyfin/Emby Implementation

Same endpoint, same params, one extra query param:

```
minDateLastSaved=<since.toISOString()>
```

Both implementations reuse the existing parsing and pagination logic.

## Sync State

Track per server+library in Redis:

```
tracearr:library:sync:last:{serverId}:{libraryId}   → ISO timestamp
tracearr:library:sync:count:{serverId}:{libraryId}   → integer
```

TTL: 30 days. If the key expires (no sync in 30 days), next sync is a full scan.

When storing `lastSyncedAt`, subtract 5 minutes from the actual completion time. This overlap window catches items that were being added to the server while the previous sync was running. Re-fetching a few items is harmless — the upsert is idempotent.

## Sync Decision Tree

When `syncLibrary()` runs:

```
1. Fetch totalCount from API (limit=1 call — already happens today)
2. Load lastSyncedAt + lastItemCount from Redis

3. Pick sync mode:
   - No lastSyncedAt?           → FULL (first sync)
   - totalCount < lastItemCount? → FULL (items removed, need delta detection)
   - Manual trigger?             → FULL (user expects thorough sync)
   - Otherwise                   → INCREMENTAL (fetch since lastSyncedAt)

4. If INCREMENTAL and 0 new items AND totalCount == lastItemCount:
   - Skip snapshot, skip delta detection
   - Update lastSyncedAt in Redis
   - Done (single API call per library)

5. After sync: store new lastSyncedAt (minus 5 min) + totalCount in Redis
```

Full scan path is the exact current code — nothing changes. Incremental path uses `getLibraryItemsSince()` with the same batch loop, same upsert, same snapshot creation.

For TV/Music libraries: the leaves fetch (`getLibraryLeavesSince()`) follows the same incremental logic.

## Fallback Safety

If anything goes wrong with incremental sync, fall back to full scan:

- `getLibraryItemsSince()` throws → catch, log, call `getLibraryItems()` instead
- Redis key missing or corrupt → first sync → full scan
- Server doesn't support the date filter (returns all items) → upsert handles it correctly (idempotent)
- Incremental returns unexpected count → full scan

No new failure modes. The date filter is added to the same endpoint. If the filter is ignored by an older server version, we get back all items — same as today.

## Scheduled Sync Staggering

Currently all servers share one cron (`10 */12 * * *`) and fire simultaneously. Change to per-server offsets:

```
Server 0: 10 */12 * * *  (at :10 past)
Server 1: 14 */12 * * *  (at :14 past)
Server 2: 18 */12 * * *  (at :18 past)
```

4-minute gap between servers. Calculated as `10 + (serverIndex * 4)` minutes past the hour. Spreads DB, Redis, and API load.

Boot sync stagger (10s per server) already exists and stays unchanged.

## Performance Tuning

**Batch delay for incremental syncs:** Reduce from 150ms to 50ms. Incremental syncs fetch far fewer items — no need to be as conservative with the media server API.

**Skip-when-unchanged:** When incremental sync finds 0 new items and totalCount matches, skip `getPreviousItemKeys()`, `createSnapshot()`, and `markItemsRemoved()`. Turns a no-change nightly sync into one API call per library (~50ms total).

**Full scan delay stays at 150ms.** Initial syncs and removal-detection scans should respect the media server's load.

## Expected Impact

| Scenario                      | Current                 | After                       |
| ----------------------------- | ----------------------- | --------------------------- |
| Nightly sync, nothing changed | 5+ min per 100K items   | ~50ms per library           |
| Nightly sync, 50 new items    | 5+ min per 100K items   | ~2-3 seconds                |
| Initial sync (first add)      | 5+ min per 100K items   | Same (full scan, unchanged) |
| 3 servers scheduled sync      | All fire simultaneously | Staggered 4 min apart       |

## Validation Plan

**Before writing code:**

1. Test date-filtered API calls against real Plex, Jellyfin, and Emby servers
2. Confirm response format is identical to unfiltered calls
3. Confirm pagination works with date filters

**After implementation:**

- Run full scan and incremental scan against same library, compare DB state — must be identical
- Unit tests for the decision tree, Redis state management, and fallback paths
- Mock tests for each client's `*Since()` methods

## Files Changed

| File                                                                   | Change                                                    |
| ---------------------------------------------------------------------- | --------------------------------------------------------- |
| `apps/server/src/services/mediaServer/types.ts`                        | Add optional `*Since` methods to interface                |
| `apps/server/src/services/mediaServer/plex/client.ts`                  | Implement `getLibraryItemsSince`, `getLibraryLeavesSince` |
| `apps/server/src/services/mediaServer/shared/baseMediaServerClient.ts` | Implement `getLibraryItemsSince`, `getLibraryLeavesSince` |
| `apps/server/src/services/librarySync.ts`                              | Decision tree, Redis state, reduced delay for incremental |
| `apps/server/src/jobs/librarySyncQueue.ts`                             | Per-server cron offset calculation                        |
| `packages/shared/src/constants.ts`                                     | New Redis key patterns for sync state                     |
