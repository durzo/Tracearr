/**
 * Test database connection pool management
 *
 * Provides isolated connections for parallel test workers with
 * schema-per-worker isolation for concurrent integration tests.
 */

import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const { Pool } = pg;

let testPool: pg.Pool | null = null;
let testDb: ReturnType<typeof drizzle> | null = null;

/**
 * Get or create the test database connection pool
 */
export function getTestPool(): pg.Pool {
  if (!testPool) {
    // Use port 5433 for test database (docker-compose.test.yml) to avoid conflicts with dev
    const connectionString =
      process.env.TEST_DATABASE_URL ||
      process.env.DATABASE_URL ||
      'postgresql://test:test@localhost:5433/tracearr_test';

    testPool = new Pool({
      connectionString,
      max: 5, // Lower for tests to avoid connection exhaustion
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });

    testPool.on('error', (err) => {
      console.error('[Test DB Pool Error]', err.message);
    });
  }

  return testPool;
}

/**
 * Get the Drizzle ORM instance for tests
 *
 * Note: Schema must be imported dynamically by the test setup
 * to avoid circular dependencies with the main app.
 */
export function getTestDb<T extends Record<string, unknown>>(schema: T) {
  if (!testDb) {
    testDb = drizzle(getTestPool(), { schema });
  }
  return testDb as ReturnType<typeof drizzle<T>>;
}

/**
 * Close the test database pool
 *
 * Call this in global teardown to release connections.
 */
export async function closeTestPool(): Promise<void> {
  if (testPool) {
    await testPool.end();
    testPool = null;
    testDb = null;
  }
}

/**
 * Execute raw SQL on the test database
 *
 * Useful for schema setup, truncation, and other DDL operations.
 */
export async function executeRawSql(sql: string): Promise<pg.QueryResult> {
  const pool = getTestPool();
  return pool.query(sql);
}
