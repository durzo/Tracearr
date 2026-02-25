import { useState, useCallback } from 'react';

export type CardId = 'cpu' | 'ram' | 'bandwidth';

export interface ResourceCardLayout {
  rows: CardId[][];
}

export const STORAGE_KEY = 'tracearr_resource_card_layout';
export const VALID_IDS = new Set<CardId>(['cpu', 'ram', 'bandwidth']);

export const DEFAULT_LAYOUT: ResourceCardLayout = {
  rows: [['cpu', 'ram', 'bandwidth']],
};

export function loadLayout(): ResourceCardLayout {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_LAYOUT;

    const parsed = JSON.parse(stored) as ResourceCardLayout;
    if (!Array.isArray(parsed.rows)) return DEFAULT_LAYOUT;

    const allIds = parsed.rows.flat();

    if (
      parsed.rows.every((row) => Array.isArray(row) && row.length > 0) &&
      allIds.length === 3 &&
      allIds.every((id) => VALID_IDS.has(id)) &&
      new Set(allIds).size === 3
    ) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_LAYOUT;
}

export function persistLayout(layout: ResourceCardLayout) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // ignore quota errors
  }
}

export function useResourceCardLayout() {
  const [layout, setLayoutState] = useState<ResourceCardLayout>(loadLayout);

  const setLayout = useCallback((next: ResourceCardLayout) => {
    persistLayout(next);
    setLayoutState(next);
  }, []);

  return { layout, setLayout };
}
