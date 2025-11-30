import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    clearMocks: true,
    restoreMocks: true,
    // Use github-actions reporter in CI for annotations, default locally
    reporters: isCI ? ['default', 'github-actions'] : ['default'],
    coverage: {
      provider: 'v8',
      // Include json-summary for CI coverage reporting
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/services/**/*.ts', 'src/routes/**/*.ts', 'src/jobs/**/*.ts'],
      exclude: ['**/*.test.ts', '**/test/**'],
      // Coverage thresholds - applied per-file for tested modules
      thresholds: {
        // Global thresholds match current coverage levels
        // Per-file thresholds below enforce high standards on tested files
        statements: 10,
        branches: 10,
        functions: 15,
        lines: 10,
        // Per-file thresholds - paths must match coverage report format
        // Coverage reports paths relative to included directories (without src/ prefix)
        'services/rules.ts': {
          statements: 95,
          branches: 90,
          functions: 95,
          lines: 95,
        },
        'routes/rules.ts': {
          statements: 90,
          branches: 80,
          functions: 95,
          lines: 90,
        },
        'routes/violations.ts': {
          statements: 90,
          branches: 80,
          functions: 95,
          lines: 90,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@tracearr/shared': resolve(__dirname, '../../packages/shared/src'),
    },
  },
});
