import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useClaimStore } from '@/store/claim-state';
import { useClaimSelection } from './useClaimSelection';

const TOKENS = [
  { assetId: 'regular-a', ticker: 'RA', logo: '', decimals: 0, amount: 1, premium: false, native: false },
  { assetId: 'favorite-a', ticker: 'FA', logo: '', decimals: 0, amount: 1, premium: false, native: false },
  { assetId: 'regular-b', ticker: 'RB', logo: '', decimals: 0, amount: 1, premium: false, native: false },
  { assetId: 'favorite-b', ticker: 'FB', logo: '', decimals: 0, amount: 1, premium: false, native: false },
];

beforeEach(() => {
  useClaimStore.getState().reset();
  useClaimStore.getState().setLookupAddress(null);
});

describe('useClaimSelection', () => {
  it('initializes after favorites load and counts favorite and regular selections together', async () => {
    const props = {
      tokens: TOKENS,
      favoriteIds: new Set(['favorite-a', 'favorite-b']),
      dislikedIds: new Set<string>(),
      lookupAddress: 'stake1account',
      preferencesLoading: true,
      maxAssets: 4,
    };
    const { result, rerender } = renderHook((input) => useClaimSelection(input), { initialProps: props });

    expect(result.current.selectedAssetIds).toEqual([]);
    rerender({ ...props, preferencesLoading: false });

    await waitFor(() => expect(result.current.selectedAssetIds).toEqual([
      'favorite-a', 'favorite-b', 'regular-a', 'regular-b',
    ]));
    expect(result.current.selectedAssetIds).toHaveLength(4);
  });

  it('preserves a mixed user selection when favorite ordering changes', async () => {
    const props = {
      tokens: TOKENS,
      favoriteIds: new Set(['favorite-a']),
      dislikedIds: new Set<string>(),
      lookupAddress: 'stake1account',
      preferencesLoading: false,
      maxAssets: 4,
    };
    const { result, rerender } = renderHook((input) => useClaimSelection(input), { initialProps: props });

    await waitFor(() => expect(result.current.selectedAssetIds).toHaveLength(4));
    act(() => useClaimStore.getState().setSelected(['regular-a', 'favorite-a']));
    rerender({ ...props, favoriteIds: new Set(['favorite-a', 'favorite-b']) });

    await waitFor(() => expect(result.current.selectedAssetIds).toEqual(['favorite-a', 'regular-a']));
    expect(result.current.selectedAssetIds).toHaveLength(2);
  });
});
