import { partitionPreferences } from '@/features/favorites/utils/partitionPreferences';
import type { ClaimableToken } from '@/shared/rewards';
export interface ClaimCandidates {
  visible: ClaimableToken[];
  hidden: ClaimableToken[];
  selectableAssetIds: string[];
}

export function deriveClaimCandidates({
  tokens,
  favoriteIds,
  dislikedIds,
  maxAssets,
}: {
  tokens: ClaimableToken[];
  favoriteIds: Set<string>;
  dislikedIds: Set<string>;
  maxAssets: number;
}): ClaimCandidates {
  const { visible, hidden } = partitionPreferences(tokens, favoriteIds, dislikedIds);
  const selectableAssetIds = visible.slice(0, Math.max(0, maxAssets)).map((token) => token.assetId);

  return { visible, hidden, selectableAssetIds };
}
