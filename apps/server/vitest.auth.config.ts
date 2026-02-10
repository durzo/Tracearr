/**
 * Auth Tests Configuration
 *
 * Authentication and authorization route tests with mocked database:
 * - routes/auth/__tests__/* (local, plex, jellyfin auth, claim code)
 *
 * Run: pnpm test:auth
 */

import { defineConfig, mergeConfig } from 'vitest/config';
import { sharedConfig } from './vitest.shared.js';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: 'auth',
      include: ['src/routes/auth/__tests__/*.test.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'json-summary'],
        reportsDirectory: './coverage/auth',
        include: ['src/routes/auth/**/*.ts'],
        exclude: ['**/*.test.ts', '**/test/**'],
      },
    },
  })
);
