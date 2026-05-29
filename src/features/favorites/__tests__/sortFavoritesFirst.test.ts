import { describe, it, expect } from 'vitest';
import { sortFavoritesFirst } from '../utils/sortFavoritesFirst';

const t = (assetId: string) => ({ assetId });

describe('sortFavoritesFirst', () => {
  it('moves favorites to the front, preserving relative order of each group', () => {
    const tokens = [t('a'), t('b'), t('c'), t('d')];
    const result = sortFavoritesFirst(tokens, new Set(['c', 'a']));
    expect(result.map((x) => x.assetId)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('accepts an array of ids', () => {
    const tokens = [t('a'), t('b')];
    const result = sortFavoritesFirst(tokens, ['b']);
    expect(result.map((x) => x.assetId)).toEqual(['b', 'a']);
  });

  it('returns a new array and does not mutate the input', () => {
    const tokens = [t('a'), t('b')];
    const result = sortFavoritesFirst(tokens, new Set<string>());
    expect(result).not.toBe(tokens);
    expect(result.map((x) => x.assetId)).toEqual(['a', 'b']);
  });
});
