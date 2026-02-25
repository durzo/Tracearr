import { describe, it, expect } from 'vitest';
import {
  getFlexBasis,
  findCardRowInLayout,
  computeNewLayout,
  ROW_GAP_PREFIX,
} from '../DraggableResourceCards';
import type { CardId } from '@/hooks/useResourceCardLayout';

describe('getFlexBasis', () => {
  it('returns 33% calc for 3 cards', () => {
    expect(getFlexBasis(3)).toBe('calc(33.333% - 0.667rem)');
  });

  it('returns 50% calc for 2 cards', () => {
    expect(getFlexBasis(2)).toBe('calc(50% - 0.5rem)');
  });

  it('returns 100% for 1 card', () => {
    expect(getFlexBasis(1)).toBe('100%');
  });

  it('returns 100% for unexpected values', () => {
    expect(getFlexBasis(0)).toBe('100%');
    expect(getFlexBasis(4)).toBe('100%');
  });
});

describe('findCardRowInLayout', () => {
  it('finds card in single-row layout', () => {
    expect(findCardRowInLayout([['cpu', 'ram', 'bandwidth']], 'ram')).toBe(0);
  });

  it('finds card in correct row of multi-row layout', () => {
    const layout: CardId[][] = [['cpu'], ['ram', 'bandwidth']];
    expect(findCardRowInLayout(layout, 'cpu')).toBe(0);
    expect(findCardRowInLayout(layout, 'bandwidth')).toBe(1);
  });

  it('returns -1 for missing card', () => {
    expect(findCardRowInLayout([['cpu', 'ram']], 'bandwidth')).toBe(-1);
  });

  it('returns -1 for empty layout', () => {
    expect(findCardRowInLayout([], 'cpu')).toBe(-1);
  });
});

describe('computeNewLayout', () => {
  describe('gap drops', () => {
    it('creates new row at gap position 0', () => {
      const result = computeNewLayout([['cpu', 'ram', 'bandwidth']], 'cpu', `${ROW_GAP_PREFIX}0`);
      expect(result).toEqual([['cpu'], ['ram', 'bandwidth']]);
    });

    it('creates new row at end', () => {
      const result = computeNewLayout([['cpu', 'ram', 'bandwidth']], 'cpu', `${ROW_GAP_PREFIX}1`);
      expect(result).toEqual([['ram', 'bandwidth'], ['cpu']]);
    });

    it('inserts between existing rows', () => {
      const rows: CardId[][] = [['cpu'], ['ram', 'bandwidth']];
      const result = computeNewLayout(rows, 'ram', `${ROW_GAP_PREFIX}1`);
      expect(result).toEqual([['cpu'], ['ram'], ['bandwidth']]);
    });

    it('clamps gap position beyond layout length', () => {
      const result = computeNewLayout([['cpu', 'ram', 'bandwidth']], 'cpu', `${ROW_GAP_PREFIX}99`);
      expect(result).toEqual([['ram', 'bandwidth'], ['cpu']]);
    });

    it('removes empty source row after move', () => {
      const rows: CardId[][] = [['cpu'], ['ram', 'bandwidth']];
      const result = computeNewLayout(rows, 'cpu', `${ROW_GAP_PREFIX}2`);
      expect(result).toEqual([['ram', 'bandwidth'], ['cpu']]);
    });

    it('returns null if active card not found', () => {
      const result = computeNewLayout([['ram', 'bandwidth']], 'cpu', `${ROW_GAP_PREFIX}0`);
      expect(result).toBeNull();
    });
  });

  describe('same-row reorder', () => {
    it('swaps adjacent cards', () => {
      const result = computeNewLayout([['cpu', 'ram', 'bandwidth']], 'cpu', 'ram');
      expect(result).toEqual([['ram', 'cpu', 'bandwidth']]);
    });

    it('moves card to end of row', () => {
      const result = computeNewLayout([['cpu', 'ram', 'bandwidth']], 'cpu', 'bandwidth');
      expect(result).toEqual([['ram', 'bandwidth', 'cpu']]);
    });

    it('reorders within a two-card row', () => {
      const rows: CardId[][] = [['cpu', 'ram'], ['bandwidth']];
      const result = computeNewLayout(rows, 'cpu', 'ram');
      expect(result).toEqual([['ram', 'cpu'], ['bandwidth']]);
    });
  });

  describe('cross-row join', () => {
    it('joins target row after over card', () => {
      const rows: CardId[][] = [['cpu', 'ram'], ['bandwidth']];
      const result = computeNewLayout(rows, 'cpu', 'bandwidth');
      expect(result).toEqual([['ram'], ['bandwidth', 'cpu']]);
    });

    it('removes empty source row', () => {
      const rows: CardId[][] = [['cpu'], ['ram', 'bandwidth']];
      const result = computeNewLayout(rows, 'cpu', 'ram');
      expect(result).toEqual([['ram', 'cpu', 'bandwidth']]);
    });

    it('inserts after the specific target card', () => {
      const rows: CardId[][] = [['cpu'], ['ram', 'bandwidth']];
      const result = computeNewLayout(rows, 'cpu', 'bandwidth');
      expect(result).toEqual([['ram', 'bandwidth', 'cpu']]);
    });
  });

  describe('edge cases', () => {
    it('returns null if activeId not found in any row', () => {
      expect(computeNewLayout([['ram', 'bandwidth']], 'cpu', 'ram')).toBeNull();
    });

    it('returns null if overId not found in target row', () => {
      expect(computeNewLayout([['cpu'], ['ram']], 'cpu', 'bandwidth')).toBeNull();
    });

    it('does not mutate the input rows', () => {
      const rows: CardId[][] = [['cpu', 'ram'], ['bandwidth']];
      const original = JSON.stringify(rows);
      computeNewLayout(rows, 'cpu', 'bandwidth');
      expect(JSON.stringify(rows)).toBe(original);
    });
  });
});
