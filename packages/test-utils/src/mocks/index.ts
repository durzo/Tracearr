/**
 * Mock utilities for testing
 *
 * @module @tracearr/test-utils/mocks
 */

// Import reset functions for local use in resetAllMocks()
import { resetMockRedis } from './redis.js';
import { resetMockMediaCounters } from './mediaServer.js';
import { resetExpoPushCounter } from './expoPush.js';
import { resetSocketCounter } from './websocket.js';

// Redis mocks
export {
  getMockRedis,
  createMockRedis,
  resetMockRedis,
  createSimpleMockRedis,
  type SimpleMockRedis,
} from './redis.js';

// Media server mocks (Plex, Jellyfin, Emby)
export {
  createMockMediaServerClient,
  createMockPlexClient,
  createMockJellyfinClient,
  createMockEmbyClient,
  buildMockSession,
  buildMockUser,
  buildMockLibrary,
  resetMockMediaCounters,
  type IMediaServerClient,
  type MediaSession,
  type MediaUser,
  type MediaLibrary,
  type MockMediaServerClient,
  type MockMediaServerOptions,
} from './mediaServer.js';

// Expo Push notification mocks
export {
  createMockExpoPushClient,
  createMockPushNotificationService,
  resetExpoPushCounter,
  type PushTicket,
  type PushReceipt,
  type PushMessage,
  type SentNotification,
  type MockExpoPushClient,
  type MockExpoPushOptions,
  type MockPushNotificationService,
} from './expoPush.js';

// WebSocket/Socket.io mocks
export {
  createMockSocketClient,
  createMockSocketServer,
  createMockGetIO,
  createMockBroadcasters,
  resetSocketCounter,
  waitForEvent,
  collectEvents,
  type SocketEvent,
  type MockSocketClient,
  type MockSocketServer,
  type TracearrServerEvent,
  type TracearrClientEvent,
} from './websocket.js';

/**
 * Reset all mock counters and state
 *
 * Call this in beforeEach() for clean test isolation
 */
export function resetAllMocks(): void {
  resetMockRedis();
  resetMockMediaCounters();
  resetExpoPushCounter();
  resetSocketCounter();
}
