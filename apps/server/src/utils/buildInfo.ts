import { readFileSync, existsSync } from 'node:fs';

interface BuildInfo {
  version: string;
  tag: string | null;
  commit: string | null;
  buildDate: string | null;
}

const BUILD_INFO_PATH = '/app/.build-info.json';

function loadBuildInfo(): BuildInfo {
  if (existsSync(BUILD_INFO_PATH)) {
    try {
      const content = readFileSync(BUILD_INFO_PATH, 'utf-8');
      const parsed = JSON.parse(content) as Record<string, string>;
      return {
        version: parsed.version || '0.0.0',
        tag: parsed.tag || null,
        commit: parsed.commit || null,
        buildDate: parsed.buildDate || null,
      };
    } catch {
      // Fall through to ENV fallback
    }
  }

  return {
    version: process.env.APP_VERSION ?? '0.0.0',
    tag: process.env.APP_TAG ?? null,
    commit: process.env.APP_COMMIT ?? null,
    buildDate: process.env.APP_BUILD_DATE ?? null,
  };
}

const buildInfo = loadBuildInfo();

export function getCurrentVersion(): string {
  return buildInfo.version;
}

export function getCurrentTag(): string | null {
  return buildInfo.tag;
}

export function getCurrentCommit(): string | null {
  return buildInfo.commit;
}

export function getBuildDate(): string | null {
  return buildInfo.buildDate;
}

export function getBuildInfo(): BuildInfo {
  return { ...buildInfo };
}
