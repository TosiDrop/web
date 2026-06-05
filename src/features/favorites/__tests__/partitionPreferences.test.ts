import { describe, it, expect } from 'vitest';
import { partitionPreferences } from '../utils/partitionPreferences';

const t = (assetId: string) => ({ assetId });

describe('partitionPreferences', () => {
  it('puts favorites first, keeps the rest, and extracts disliked into hidden', () => {
    const tokens = [t('plain'), t('fav'), t('bad'), t('fav2')];
    const { visible, hidden } = partitionPreferences(
      tokens,
      new Set(['fav', 'fav2']),
      new Set(['bad']),
    );
    expect(visible.map((x) => x.assetId)).toEqual(['fav', 'fav2', 'plain']);
    expect(hidden.map((x) => x.assetId)).toEqual(['bad']);
  });

  it('dislike wins if an id is somehow in both sets', () => {
    const { visible, hidden } = partitionPreferences([t('x')], new Set(['x']), new Set(['x']));
    expect(visible).toEqual([]);
    expect(hidden.map((h) => h.assetId)).toEqual(['x']);
  });

  it('handles empty sets', () => {
    const { visible, hidden } = partitionPreferences([t('a')], new Set(), new Set());
    expect(visible.map((x) => x.assetId)).toEqual(['a']);
    expect(hidden).toEqual([]);
  });
});
