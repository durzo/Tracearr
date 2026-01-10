/**
 * Server sync service - imports users and libraries from Plex/Jellyfin
 *
 * Uses generic syncServerUsers function for both Plex and Jellyfin,
 * delegating user operations to userService.
 */

import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { servers } from '../db/schema.js';
import { createMediaServerClient, PlexClient, type MediaUser } from './mediaServer/index.js';
import { syncUserFromMediaServer, type SyncUserOptions } from './userService.js';

export interface SyncResult {
  usersAdded: number;
  usersUpdated: number;
  usersSkipped: number;
  librariesSynced: number;
  errors: string[];
}

export interface SyncOptions {
  syncUsers?: boolean;
  syncLibraries?: boolean;
}

/**
 * Generic user sync - works for both Plex and Jellyfin
 *
 * For Plex servers (isPlexServer=true):
 * - Matches by plexAccountId, then externalId (same for shared users), then username
 * - Creates new users with dual IDs: externalId (local PMS) + plexAccountId (plex.tv)
 * - For shared users: plex.tv ID = local PMS ID
 * - For owner: plex.tv ID ≠ local PMS ID (owner is always "1" locally)
 *
 * For Jellyfin/Emby servers:
 * - Creates new users if not found
 * - Uses externalId for matching
 */
async function syncServerUsers(
  serverId: string,
  mediaUsers: MediaUser[],
  options: SyncUserOptions = {}
): Promise<{ added: number; updated: number; skipped: number; errors: string[] }> {
  const errors: string[] = [];
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const mediaUser of mediaUsers) {
    try {
      const result = await syncUserFromMediaServer(serverId, mediaUser, options);
      if (result === null) {
        // Plex sync skipped new user (will be created by poller)
        skipped++;
      } else if (result.created) {
        added++;
      } else {
        updated++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Failed to sync user ${mediaUser.username}: ${message}`);
    }
  }

  return { added, updated, skipped, errors };
}

/**
 * Fetch Plex users from server (Plex has special API via Plex.tv)
 */
async function fetchPlexUsers(token: string, serverUrl: string): Promise<MediaUser[]> {
  // Get server machine identifier for shared_servers API
  const response = await fetch(serverUrl, {
    headers: {
      'X-Plex-Token': token,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to connect to Plex server: ${response.status}`);
  }

  const serverInfo = (await response.json()) as {
    MediaContainer?: { machineIdentifier?: string };
  };
  const machineIdentifier = serverInfo.MediaContainer?.machineIdentifier;

  if (!machineIdentifier) {
    throw new Error('Could not get server machine identifier');
  }

  return PlexClient.getAllUsersWithLibraries(token, machineIdentifier);
}

/**
 * Sync users from Plex server to local database
 *
 * Uses isPlexServer=true to:
 * - Match by plexAccountId, externalId, then username
 * - Create new users with dual IDs (externalId + plexAccountId)
 * - For shared users: plex.tv ID = local PMS ID (same)
 */
async function syncPlexUsers(
  serverId: string,
  token: string,
  serverUrl: string
): Promise<{ added: number; updated: number; skipped: number; errors: string[] }> {
  try {
    const plexUsers = await fetchPlexUsers(token, serverUrl);
    return syncServerUsers(serverId, plexUsers, { isPlexServer: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { added: 0, updated: 0, skipped: 0, errors: [`Plex user sync failed: ${message}`] };
  }
}

/**
 * Sync users from Jellyfin or Emby server to local database
 * Both use the same IMediaServerClient interface via createMediaServerClient
 */
async function syncMediaServerUsers(
  serverId: string,
  serverType: 'jellyfin' | 'emby',
  serverUrl: string,
  token: string
): Promise<{ added: number; updated: number; skipped: number; errors: string[] }> {
  const serverName = serverType.charAt(0).toUpperCase() + serverType.slice(1);
  try {
    const client = createMediaServerClient({
      type: serverType,
      url: serverUrl,
      token,
    });
    const users = await client.getUsers();
    return syncServerUsers(serverId, users); // isPlexServer defaults to false
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      added: 0,
      updated: 0,
      skipped: 0,
      errors: [`${serverName} user sync failed: ${message}`],
    };
  }
}

/**
 * Sync a single server (users and libraries)
 */
export async function syncServer(
  serverId: string,
  options: SyncOptions = { syncUsers: true, syncLibraries: true }
): Promise<SyncResult> {
  const result: SyncResult = {
    usersAdded: 0,
    usersUpdated: 0,
    usersSkipped: 0,
    librariesSynced: 0,
    errors: [],
  };

  // Get server details
  const serverRows = await db.select().from(servers).where(eq(servers.id, serverId)).limit(1);
  const server = serverRows[0];

  if (!server) {
    result.errors.push(`Server not found: ${serverId}`);
    return result;
  }

  const token = server.token;
  const serverUrl = server.url.replace(/\/$/, '');

  // Sync users
  if (options.syncUsers) {
    if (server.type === 'plex') {
      const userResult = await syncPlexUsers(serverId, token, serverUrl);
      result.usersAdded = userResult.added;
      result.usersUpdated = userResult.updated;
      result.usersSkipped = userResult.skipped;
      result.errors.push(...userResult.errors);
    } else if (server.type === 'jellyfin' || server.type === 'emby') {
      const userResult = await syncMediaServerUsers(serverId, server.type, serverUrl, server.token);
      result.usersAdded = userResult.added;
      result.usersUpdated = userResult.updated;
      result.usersSkipped = userResult.skipped;
      result.errors.push(...userResult.errors);
    }
  }

  // Sync libraries (just count for now - libraries stored on server)
  if (options.syncLibraries) {
    try {
      const client = createMediaServerClient({
        type: server.type,
        url: serverUrl,
        token: server.token,
      });
      const libraries = await client.getLibraries();
      result.librariesSynced = libraries.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      result.errors.push(`Library sync failed: ${message}`);
    }
  }

  return result;
}

/**
 * Sync all configured servers
 */
export async function syncAllServers(
  options: SyncOptions = { syncUsers: true, syncLibraries: true }
): Promise<Map<string, SyncResult>> {
  const results = new Map<string, SyncResult>();

  const allServers = await db.select().from(servers);

  for (const server of allServers) {
    const result = await syncServer(server.id, options);
    results.set(server.id, result);
  }

  return results;
}
