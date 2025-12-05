/**
 * Vitest Setup for Integration Tests
 *
 * This file is imported by vitest.config.ts to set up the test environment.
 * For integration tests, it handles database setup, migration, and cleanup.
 *
 * Usage in vitest.config.ts:
 *   setupFiles: ['@tracearr/test-utils/vitest.setup']
 */

import { beforeEach, afterEach } from 'vitest';
import { installMatchers } from './matchers/index.js';
import { resetAllFactoryCounters } from './factories/index.js';
import { resetAllMocks } from './mocks/index.js';
import type { SeedResult } from './db/seed.js';

// Install custom matchers
installMatchers();

/**
 * Shared test lifecycle hooks
 *
 * These provide reasonable defaults but can be overridden in individual test files.
 */

// Reset factories and mocks before each test
beforeEach(() => {
  resetAllFactoryCounters();
  resetAllMocks();
});

// Clean up after each test
afterEach(() => {
  // Any per-test cleanup
});

/**
 * Integration test setup (requires database)
 *
 * Call this in your integration test's beforeAll/afterAll hooks:
 *
 * ```typescript
 * import { setupIntegrationTests } from '@tracearr/test-utils/vitest.setup';
 *
 * const cleanup = setupIntegrationTests();
 *
 * afterAll(() => cleanup());
 * ```
 */
export async function setupIntegrationTests(): Promise<() => Promise<void>> {
  const { setupTestDb } = await import('./db/setup.js');
  const { closeTestPool } = await import('./db/pool.js');

  // Set up database before all tests
  await setupTestDb();

  // Return cleanup function
  return async () => {
    await closeTestPool();
  };
}

/**
 * Per-test database reset for integration tests
 *
 * Call this in beforeEach for tests that need a clean database:
 *
 * ```typescript
 * import { resetDatabaseBeforeEach } from '@tracearr/test-utils/vitest.setup';
 *
 * beforeEach(async () => {
 *   await resetDatabaseBeforeEach();
 * });
 * ```
 */
export async function resetDatabaseBeforeEach(): Promise<void> {
  const { resetTestDb } = await import('./db/reset.js');
  await resetTestDb();
  resetAllFactoryCounters();
}

/**
 * Seed database with standard test data
 *
 * Call this after resetDatabaseBeforeEach if you need pre-populated data:
 *
 * ```typescript
 * import { resetDatabaseBeforeEach, seedDatabaseForTest } from '@tracearr/test-utils/vitest.setup';
 *
 * beforeEach(async () => {
 *   await resetDatabaseBeforeEach();
 *   const data = await seedDatabaseForTest();
 *   // data.userId, data.serverId, data.serverUserId are now available
 * });
 * ```
 */
export async function seedDatabaseForTest(): Promise<SeedResult> {
  const { seedBasicOwner } = await import('./db/seed.js');
  return seedBasicOwner();
}

/**
 * Unit test setup (no database required)
 *
 * For unit tests that only need mocks and helpers.
 * This is automatically applied via the global beforeEach above.
 */
export function setupUnitTests(): void {
  installMatchers();
  resetAllFactoryCounters();
  resetAllMocks();
}

/**
 * Create test context for integration tests
 *
 * Provides a convenient way to set up and tear down test context:
 *
 * ```typescript
 * import { createTestContext } from '@tracearr/test-utils/vitest.setup';
 *
 * describe('MyFeature', () => {
 *   const ctx = createTestContext();
 *
 *   it('should work', async () => {
 *     const { owner, server } = await ctx.seed();
 *     // test using seeded data
 *   });
 * });
 * ```
 */
export function createTestContext() {
  let seededData: SeedResult | null = null;
  let cleanupFn: (() => Promise<void>) | null = null;

  return {
    async setup() {
      cleanupFn = await setupIntegrationTests();
    },

    async reset() {
      await resetDatabaseBeforeEach();
      seededData = null;
    },

    async seed() {
      await this.reset();
      seededData = await seedDatabaseForTest();
      return seededData;
    },

    getData() {
      if (!seededData) {
        throw new Error('Test data not seeded. Call ctx.seed() first.');
      }
      return seededData;
    },

    async cleanup() {
      if (cleanupFn) {
        await cleanupFn();
      }
    },
  };
}

// Export types for consumers
export type TestContext = ReturnType<typeof createTestContext>;
