/**
 * Media Server Mock for Testing
 *
 * Mock implementation of IMediaServerClient interface for Plex, Jellyfin, and Emby.
 * Provides configurable responses and call tracking.
 */

import type { ServerType } from '@tracearr/shared';

export interface MediaSession {
  sessionKey: string;
  userId: string;
  username: string;
  mediaTitle: string;
  mediaType: 'movie' | 'episode' | 'track';
  grandparentTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  year?: number;
  thumbPath?: string;
  ratingKey?: string;
  state: 'playing' | 'paused' | 'stopped';
  progressMs: number;
  totalDurationMs: number;
  ipAddress: string;
  playerName?: string;
  deviceId?: string;
  product?: string;
  device?: string;
  platform?: string;
  quality?: string;
  isTranscode: boolean;
  bitrate?: number;
}

export interface MediaUser {
  id: string;
  name: string;
  email?: string;
  thumb?: string;
  isAdmin: boolean;
}

export interface MediaLibrary {
  id: string;
  name: string;
  type: 'movie' | 'show' | 'music' | 'photo';
  itemCount: number;
}

export interface IMediaServerClient {
  readonly serverType: ServerType;
  getSessions(): Promise<MediaSession[]>;
  getUsers(): Promise<MediaUser[]>;
  getLibraries(): Promise<MediaLibrary[]>;
  testConnection(): Promise<boolean>;
}

export interface MockMediaServerOptions {
  serverType?: ServerType;
  sessions?: MediaSession[];
  users?: MediaUser[];
  libraries?: MediaLibrary[];
  connectionStatus?: boolean;
  sessionError?: Error;
  userError?: Error;
  libraryError?: Error;
  connectionError?: Error;
}

export interface MockMediaServerClient extends IMediaServerClient {
  _calls: {
    getSessions: number;
    getUsers: number;
    getLibraries: number;
    testConnection: number;
  };
  _setSessions: (sessions: MediaSession[]) => void;
  _setUsers: (users: MediaUser[]) => void;
  _setLibraries: (libraries: MediaLibrary[]) => void;
  _setConnectionStatus: (status: boolean) => void;
  _setSessionError: (error: Error | null) => void;
  _setUserError: (error: Error | null) => void;
  _setLibraryError: (error: Error | null) => void;
  _setConnectionError: (error: Error | null) => void;
  _reset: () => void;
}

/**
 * Create a mock media server client
 */
export function createMockMediaServerClient(
  options: MockMediaServerOptions = {}
): MockMediaServerClient {
  let sessions = options.sessions ?? [];
  let users = options.users ?? [];
  let libraries = options.libraries ?? [];
  let connectionStatus = options.connectionStatus ?? true;
  let sessionError = options.sessionError ?? null;
  let userError = options.userError ?? null;
  let libraryError = options.libraryError ?? null;
  let connectionError = options.connectionError ?? null;

  const calls = {
    getSessions: 0,
    getUsers: 0,
    getLibraries: 0,
    testConnection: 0,
  };

  return {
    serverType: options.serverType ?? 'plex',
    _calls: calls,

    async getSessions() {
      calls.getSessions++;
      if (sessionError) throw sessionError;
      return [...sessions];
    },

    async getUsers() {
      calls.getUsers++;
      if (userError) throw userError;
      return [...users];
    },

    async getLibraries() {
      calls.getLibraries++;
      if (libraryError) throw libraryError;
      return [...libraries];
    },

    async testConnection() {
      calls.testConnection++;
      if (connectionError) throw connectionError;
      return connectionStatus;
    },

    _setSessions(newSessions: MediaSession[]) {
      sessions = newSessions;
    },

    _setUsers(newUsers: MediaUser[]) {
      users = newUsers;
    },

    _setLibraries(newLibraries: MediaLibrary[]) {
      libraries = newLibraries;
    },

    _setConnectionStatus(status: boolean) {
      connectionStatus = status;
    },

    _setSessionError(error: Error | null) {
      sessionError = error;
    },

    _setUserError(error: Error | null) {
      userError = error;
    },

    _setLibraryError(error: Error | null) {
      libraryError = error;
    },

    _setConnectionError(error: Error | null) {
      connectionError = error;
    },

    _reset() {
      sessions = [];
      users = [];
      libraries = [];
      connectionStatus = true;
      sessionError = null;
      userError = null;
      libraryError = null;
      connectionError = null;
      calls.getSessions = 0;
      calls.getUsers = 0;
      calls.getLibraries = 0;
      calls.testConnection = 0;
    },
  };
}

let sessionCounter = 0;

/**
 * Build a mock media session with defaults
 */
export function buildMockSession(overrides: Partial<MediaSession> = {}): MediaSession {
  const index = ++sessionCounter;
  return {
    sessionKey: `session-${index}`,
    userId: `user-${index}`,
    username: `testuser${index}`,
    mediaTitle: `Test Movie ${index}`,
    mediaType: 'movie',
    state: 'playing',
    progressMs: 0,
    totalDurationMs: 7200000,
    ipAddress: `192.168.1.${100 + (index % 155)}`,
    isTranscode: false,
    ...overrides,
  };
}

let userCounter = 0;

/**
 * Build a mock media user with defaults
 */
export function buildMockUser(overrides: Partial<MediaUser> = {}): MediaUser {
  const index = ++userCounter;
  return {
    id: `user-${index}`,
    name: `testuser${index}`,
    isAdmin: false,
    ...overrides,
  };
}

let libraryCounter = 0;

/**
 * Build a mock library with defaults
 */
export function buildMockLibrary(overrides: Partial<MediaLibrary> = {}): MediaLibrary {
  const index = ++libraryCounter;
  return {
    id: `lib-${index}`,
    name: `Library ${index}`,
    type: 'movie',
    itemCount: 100,
    ...overrides,
  };
}

/**
 * Reset all mock counters
 */
export function resetMockMediaCounters(): void {
  sessionCounter = 0;
  userCounter = 0;
  libraryCounter = 0;
}

/**
 * Create a mock Plex client
 */
export function createMockPlexClient(options: Omit<MockMediaServerOptions, 'serverType'> = {}) {
  return createMockMediaServerClient({ ...options, serverType: 'plex' });
}

/**
 * Create a mock Jellyfin client
 */
export function createMockJellyfinClient(options: Omit<MockMediaServerOptions, 'serverType'> = {}) {
  return createMockMediaServerClient({ ...options, serverType: 'jellyfin' });
}

/**
 * Create a mock Emby client
 */
export function createMockEmbyClient(options: Omit<MockMediaServerOptions, 'serverType'> = {}) {
  return createMockMediaServerClient({ ...options, serverType: 'emby' });
}
