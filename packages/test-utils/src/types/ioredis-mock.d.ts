/**
 * Type declarations for ioredis-mock
 *
 * This module provides a mock implementation of ioredis for testing.
 */

declare module 'ioredis-mock' {
  import type { RedisOptions } from 'ioredis';

  // eslint-disable-next-line @typescript-eslint/no-extraneous-class
  class RedisMock {
    constructor(options?: RedisOptions);
    // The mock implements the same interface as Redis
    // We use it via `as unknown as Redis` casting
  }

  export = RedisMock;
}
