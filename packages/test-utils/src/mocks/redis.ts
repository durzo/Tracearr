/**
 * Redis Mock for Testing
 *
 * Uses ioredis-mock for in-memory Redis operations.
 * Provides both mock instance and factory functions.
 */

import RedisMock from 'ioredis-mock';
import type { Redis } from 'ioredis';

let mockRedisInstance: Redis | null = null;

/**
 * Get or create a singleton mock Redis instance
 */
export function getMockRedis(): Redis {
  if (!mockRedisInstance) {
    mockRedisInstance = new RedisMock() as unknown as Redis;
  }
  return mockRedisInstance;
}

/**
 * Create a fresh mock Redis instance
 * Use when you need isolated Redis state per test
 */
export function createMockRedis(): Redis {
  return new RedisMock() as unknown as Redis;
}

/**
 * Reset the singleton mock Redis instance
 * Clears all data and creates a new instance
 */
export function resetMockRedis(): void {
  if (mockRedisInstance) {
    // ioredis-mock supports flushall - fire and forget for reset
    void (mockRedisInstance as Redis & { flushall: () => Promise<string> }).flushall?.();
  }
  mockRedisInstance = new RedisMock() as unknown as Redis;
}

/**
 * Simple mock Redis without ioredis-mock dependency
 * Useful for unit tests that don't need full Redis compatibility
 */
export function createSimpleMockRedis(): SimpleMockRedis {
  const store = new Map<string, string>();
  const sets = new Map<string, Set<string>>();
  const ttls = new Map<string, number>();
  const messageCallbacks: Array<(channel: string, message: string) => void> = [];

  return {
    // Storage access for assertions
    _store: store,
    _sets: sets,
    _ttls: ttls,

    // String operations
    get: async (key: string) => store.get(key) ?? null,
    set: async (key: string, value: string) => {
      store.set(key, value);
      return 'OK';
    },
    setex: async (key: string, seconds: number, value: string) => {
      store.set(key, value);
      ttls.set(key, seconds);
      return 'OK';
    },
    del: async (...keys: string[]) => {
      let count = 0;
      for (const key of keys) {
        if (store.delete(key) || sets.delete(key)) count++;
      }
      return count;
    },
    keys: async (pattern: string) => {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return Array.from(store.keys()).filter((k) => regex.test(k));
    },
    exists: async (...keys: string[]) => {
      return keys.filter((k) => store.has(k) || sets.has(k)).length;
    },
    expire: async (key: string, seconds: number) => {
      ttls.set(key, seconds);
      return store.has(key) || sets.has(key) ? 1 : 0;
    },
    ttl: async (key: string) => {
      return ttls.get(key) ?? -2;
    },

    // Set operations
    sadd: async (key: string, ...members: string[]) => {
      if (!sets.has(key)) sets.set(key, new Set());
      const set = sets.get(key)!;
      let added = 0;
      for (const member of members) {
        if (!set.has(member)) {
          set.add(member);
          added++;
        }
      }
      return added;
    },
    srem: async (key: string, ...members: string[]) => {
      const set = sets.get(key);
      if (!set) return 0;
      let removed = 0;
      for (const member of members) {
        if (set.delete(member)) removed++;
      }
      return removed;
    },
    smembers: async (key: string) => {
      const set = sets.get(key);
      return set ? Array.from(set) : [];
    },
    sismember: async (key: string, member: string) => {
      return sets.get(key)?.has(member) ? 1 : 0;
    },
    scard: async (key: string) => {
      return sets.get(key)?.size ?? 0;
    },

    // Pub/Sub
    publish: async (_channel: string, _message: string) => 1,
    subscribe: async (_channel: string) => undefined,
    unsubscribe: async (_channel: string) => undefined,
    on: (event: string, callback: (channel: string, message: string) => void) => {
      if (event === 'message') {
        messageCallbacks.push(callback);
      }
    },

    // Helper to simulate incoming message
    _simulateMessage: (channel: string, message: string) => {
      for (const cb of messageCallbacks) {
        cb(channel, message);
      }
    },

    // Health
    ping: async () => 'PONG',

    // Cleanup
    flushall: async () => {
      store.clear();
      sets.clear();
      ttls.clear();
      return 'OK';
    },

    // Connection (no-op for mock)
    quit: async () => 'OK',
    disconnect: () => undefined,
  };
}

export interface SimpleMockRedis {
  _store: Map<string, string>;
  _sets: Map<string, Set<string>>;
  _ttls: Map<string, number>;
  _simulateMessage: (channel: string, message: string) => void;

  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<string>;
  setex: (key: string, seconds: number, value: string) => Promise<string>;
  del: (...keys: string[]) => Promise<number>;
  keys: (pattern: string) => Promise<string[]>;
  exists: (...keys: string[]) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<number>;
  ttl: (key: string) => Promise<number>;

  sadd: (key: string, ...members: string[]) => Promise<number>;
  srem: (key: string, ...members: string[]) => Promise<number>;
  smembers: (key: string) => Promise<string[]>;
  sismember: (key: string, member: string) => Promise<number>;
  scard: (key: string) => Promise<number>;

  publish: (channel: string, message: string) => Promise<number>;
  subscribe: (channel: string) => Promise<void>;
  unsubscribe: (channel: string) => Promise<void>;
  on: (event: string, callback: (channel: string, message: string) => void) => void;

  ping: () => Promise<string>;
  flushall: () => Promise<string>;
  quit: () => Promise<string>;
  disconnect: () => void;
}
