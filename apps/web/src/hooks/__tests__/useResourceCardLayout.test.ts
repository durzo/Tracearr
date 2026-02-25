import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadLayout,
  persistLayout,
  STORAGE_KEY,
  DEFAULT_LAYOUT,
  type ResourceCardLayout,
} from '../useResourceCardLayout';

// Stub localStorage for Node environment
const storage = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
});

beforeEach(() => {
  storage.clear();
});

describe('loadLayout', () => {
  it('returns default when nothing is stored', () => {
    expect(loadLayout()).toEqual(DEFAULT_LAYOUT);
  });

  it('returns default for invalid JSON', () => {
    storage.set(STORAGE_KEY, 'not-json');
    expect(loadLayout()).toEqual(DEFAULT_LAYOUT);
  });

  it('returns default when rows is not an array', () => {
    storage.set(STORAGE_KEY, '{"rows": "string"}');
    expect(loadLayout()).toEqual(DEFAULT_LAYOUT);
  });

  it('returns default when rows is null', () => {
    storage.set(STORAGE_KEY, '{"rows": null}');
    expect(loadLayout()).toEqual(DEFAULT_LAYOUT);
  });

  it('returns default for wrong number of IDs', () => {
    storage.set(STORAGE_KEY, '{"rows": [["cpu", "ram"]]}');
    expect(loadLayout()).toEqual(DEFAULT_LAYOUT);
  });

  it('returns default for duplicate IDs', () => {
    storage.set(STORAGE_KEY, '{"rows": [["cpu", "cpu", "ram"]]}');
    expect(loadLayout()).toEqual(DEFAULT_LAYOUT);
  });

  it('returns default for invalid card ID', () => {
    storage.set(STORAGE_KEY, '{"rows": [["cpu", "ram", "disk"]]}');
    expect(loadLayout()).toEqual(DEFAULT_LAYOUT);
  });

  it('returns default when a row is empty', () => {
    storage.set(STORAGE_KEY, '{"rows": [[], ["cpu", "ram", "bandwidth"]]}');
    expect(loadLayout()).toEqual(DEFAULT_LAYOUT);
  });

  it('returns valid single-row layout', () => {
    const layout = { rows: [['cpu', 'ram', 'bandwidth']] };
    storage.set(STORAGE_KEY, JSON.stringify(layout));
    expect(loadLayout()).toEqual(layout);
  });

  it('returns valid two-row layout', () => {
    const layout = { rows: [['cpu'], ['ram', 'bandwidth']] };
    storage.set(STORAGE_KEY, JSON.stringify(layout));
    expect(loadLayout()).toEqual(layout);
  });

  it('returns valid three-row layout', () => {
    const layout = { rows: [['cpu'], ['ram'], ['bandwidth']] };
    storage.set(STORAGE_KEY, JSON.stringify(layout));
    expect(loadLayout()).toEqual(layout);
  });

  it('accepts reordered card IDs', () => {
    const layout = { rows: [['bandwidth', 'ram', 'cpu']] };
    storage.set(STORAGE_KEY, JSON.stringify(layout));
    expect(loadLayout()).toEqual(layout);
  });
});

describe('persistLayout', () => {
  it('writes layout to localStorage', () => {
    const layout: ResourceCardLayout = { rows: [['cpu', 'ram', 'bandwidth']] };
    persistLayout(layout);
    expect(storage.get(STORAGE_KEY)).toBe(JSON.stringify(layout));
  });

  it('round-trips with loadLayout', () => {
    const layout: ResourceCardLayout = { rows: [['bandwidth'], ['cpu', 'ram']] };
    persistLayout(layout);
    expect(loadLayout()).toEqual(layout);
  });
});
