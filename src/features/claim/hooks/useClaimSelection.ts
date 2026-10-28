import { useEffect, useMemo } from 'react';
import type { ClaimableToken } from '@/shared/rewards';
import { useClaimStore } from '@/store/claim-state';
import { limitSelection, visibleSelection } from '../utils/claimSelection';
import { deriveClaimCandidates } from '../utils/deriveClaimSelection';

const EMPTY_TOKENS: ClaimableToken[] = [];

/** Initializes eligible rewards once, then validates the user's selection against every visible token. */
export function useClaimSelection({
  tokens,
  favoriteIds,
  dislikedIds,
  lookupAddress,
  preferencesLoading,
  maxAssets,
}: {
  tokens: ClaimableToken[] | undefined;
  favoriteIds: Set<string>;
  dislikedIds: Set<string>;
  lookupAddress: string | null;
  preferencesLoading: boolean;
  maxAssets: number;
}) {
  const storedSelection = useClaimStore((state) => state.selectedAssetIds);
  const initSelectionFor = useClaimStore((state) => state.initSelectionFor);
  const candidates = useMemo(
    () => deriveClaimCandidates({
      tokens: tokens ?? EMPTY_TOKENS,
      favoriteIds,
      dislikedIds,
      maxAssets,
    }),
    [tokens, favoriteIds, dislikedIds, maxAssets],
  );
  const selectedAssetIds = useMemo(
    () => limitSelection(
      visibleSelection(storedSelection, candidates.visible.map((token) => token.assetId)),
      maxAssets,
    ),
    [storedSelection, candidates.visible, maxAssets],
  );

  useEffect(() => {
    if (!tokens || !lookupAddress || preferencesLoading) return;
    initSelectionFor(lookupAddress, candidates.selectableAssetIds, candidates.visible.map((token) => token.assetId));
  }, [tokens, lookupAddress, preferencesLoading, candidates, initSelectionFor]);

  return { ...candidates, selectedAssetIds };
}
