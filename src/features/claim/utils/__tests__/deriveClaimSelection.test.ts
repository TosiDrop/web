import { describe, expect, it } from 'vitest';
import { deriveClaimCandidates } from '../deriveClaimSelection';
import { limitSelection, visibleSelection } from '../claimSelection';

const token = (assetId: string) => ({
  assetId,
  ticker: assetId.toUpperCase(),
  logo: '',
  decimals: 0,
  amount: 1,
  premium: false,
  native: false,
});

describe('deriveClaimSelection', () => {
  it('counts selected favorites together with selected regular tokens', () => {
    const candidates = deriveClaimCandidates({
      tokens: [token('regular-a'), token('favorite-a'), token('regular-b'), token('favorite-b')],
      favoriteIds: new Set(['favorite-a', 'favorite-b']),
      dislikedIds: new Set(),
      maxAssets: 4,
    });
    const selectedAssetIds = limitSelection(
      visibleSelection(['regular-a', 'favorite-a', 'regular-b', 'favorite-b'], candidates.selectableAssetIds),
      4,
    );

    expect(candidates.visible.map((item) => item.assetId)).toEqual([
      'favorite-a', 'favorite-b', 'regular-a', 'regular-b',
    ]);
    expect(selectedAssetIds).toHaveLength(4);
    expect(selectedAssetIds).toEqual([
      'favorite-a', 'favorite-b', 'regular-a', 'regular-b',
    ]);
  });

  it('prioritizes selected favorites within the request cap and excludes disliked tokens', () => {
    const candidates = deriveClaimCandidates({
      tokens: [token('regular-a'), token('favorite-a'), token('regular-b'), token('hidden')],
      favoriteIds: new Set(['favorite-a']),
      dislikedIds: new Set(['hidden']),
      maxAssets: 2,
    });
    const selectedAssetIds = limitSelection(
      visibleSelection(['regular-a', 'regular-b', 'favorite-a', 'hidden'], candidates.selectableAssetIds),
      2,
    );

    expect(selectedAssetIds).toEqual(['favorite-a', 'regular-a']);
    expect(candidates.hidden.map((item) => item.assetId)).toEqual(['hidden']);
  });
});
