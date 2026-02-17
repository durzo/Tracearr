/**
 * BASE_PATH compliance tests — CI guardrails
 *
 * Static analysis tests that scan source files for patterns that would break
 * when BASE_PATH is set. These catch regressions before they ship.
 *
 * No DB, Redis, or Fastify required — just file reads.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';

const PROJECT_ROOT = resolve(import.meta.dirname, '../../../../..');
const WEB_SRC = resolve(PROJECT_ROOT, 'apps/web/src');
const SERVER_SRC = resolve(PROJECT_ROOT, 'apps/server/src');

/** Recursively collect all .ts/.tsx files under a directory */
function collectFiles(dir: string, ext: string[] = ['.ts', '.tsx']): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '__tests__') {
      files.push(...collectFiles(full, ext));
    } else if (entry.isFile() && ext.some((e) => entry.name.endsWith(e))) {
      files.push(full);
    }
  }
  return files;
}

// ==========================================================================
// Frontend: no hardcoded fetch('/...') calls
// ==========================================================================
describe('frontend: no hardcoded fetch URLs', () => {
  // Matches fetch('/anything') or fetch("/anything") — direct fetch calls that
  // bypass the API client and don't use BASE_PATH.
  // Allowed: fetch(`${BASE_PATH}/...`) or fetch(`${someVar}/...`)
  const HARDCODED_FETCH = /fetch\(\s*['"]\/[^'"]*/g;

  const files = collectFiles(WEB_SRC);

  it('has frontend source files to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('no fetch() calls with hardcoded absolute paths', () => {
    const violations: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        if (HARDCODED_FETCH.test(line)) {
          const rel = relative(PROJECT_ROOT, file);
          violations.push(`${rel}:${i + 1}: ${line.trim()}`);
        }
        // Reset regex lastIndex since we use /g flag
        HARDCODED_FETCH.lastIndex = 0;
      }
    }

    expect(violations).toEqual([]);
  });
});

// ==========================================================================
// Frontend: notification agent imagePaths use BASE_URL
// ==========================================================================
describe('frontend: notification agent imagePaths use BASE_URL', () => {
  const agentConfigPath = resolve(
    WEB_SRC,
    'components/settings/notification-agents/agent-config.ts'
  );

  it('agent-config.ts exists', () => {
    expect(() => readFileSync(agentConfigPath, 'utf-8')).not.toThrow();
  });

  it('all imagePath values use BASE_URL prefix', () => {
    const content = readFileSync(agentConfigPath, 'utf-8');

    // Extract all imagePath assignments
    const imagePathPattern = /imagePath:\s*(.+),/g;
    const matches = [...content.matchAll(imagePathPattern)];

    // There should be at least a few agents with images
    expect(matches.length).toBeGreaterThanOrEqual(3);

    const violations: string[] = [];
    for (const match of matches) {
      const value = match[1]!.trim();
      // Must be a template literal using BASE_URL
      if (!value.includes('BASE_URL')) {
        violations.push(`imagePath value does not use BASE_URL: ${value}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it('imports BASE_URL from basePath module', () => {
    const content = readFileSync(agentConfigPath, 'utf-8');
    expect(content).toMatch(/import\s*\{[^}]*BASE_URL[^}]*\}\s*from\s*['"]@\/lib\/basePath['"]/);
  });
});

// ==========================================================================
// Server: no hardcoded redirect paths (outside of basePath-aware code)
// ==========================================================================
describe('server: redirects use BASE_PATH', () => {
  it('all reply.redirect() calls reference BASE_PATH or basePath variable', () => {
    const files = collectFiles(SERVER_SRC);
    const violations: string[] = [];

    // Match reply.redirect('...') with a hardcoded string
    const HARDCODED_REDIRECT = /reply\.redirect\(\s*['"]\/[^'"]*['"]\s*\)/g;

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        if (HARDCODED_REDIRECT.test(line)) {
          const rel = relative(PROJECT_ROOT, file);
          violations.push(`${rel}:${i + 1}: ${line.trim()}`);
        }
        HARDCODED_REDIRECT.lastIndex = 0;
      }
    }

    expect(violations).toEqual([]);
  });
});
