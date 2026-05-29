import { useMemo } from 'react';
import type { ClaimableToken } from '@/shared/rewards';
import { useClaimStore } from '@/store/claim-state';
import { useFavorites } from '@/features/favorites/hooks/useFavorites';
import { sortFavoritesFirst } from '@/features/favorites/utils/sortFavoritesFirst';
import { FavoritesSaveBar } from '@/features/favorites/components/FavoritesSaveBar';
import { DistributionCard } from './DistributionCard';

interface AvailableDistributionsProps {
  tokens: ClaimableToken[];
}

export function AvailableDistributions({ tokens }: AvailableDistributionsProps) {
  const selectedAssetIds = useClaimStore((s) => s.selectedAssetIds);
  const toggleAsset = useClaimStore((s) => s.toggleAsset);
  const setSelected = useClaimStore((s) => s.setSelected);

  const { connected, favoriteIds, isFavorite, toggle: toggleFavorite } = useFavorites();

  const sortedTokens = useMemo(
    () => sortFavoritesFirst(tokens, favoriteIds),
    [tokens, favoriteIds],
  );

  if (tokens.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-white">Claimable tokens</h2>
        <p className="py-6 text-center text-sm text-slate-500">
          No rewards found for this address.
        </p>
      </div>
    );
  }

  const allSelected = selectedAssetIds.length === tokens.length;

  const toggleAll = () => {
    setSelected(allSelected ? [] : tokens.map((t) => t.assetId));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-white">
          Claimable tokens
          <span className="ml-1.5 text-slate-500">{tokens.length}</span>
        </h2>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-brand-cyan transition hover:text-cyan-300"
        >
          {allSelected ? 'Clear' : 'Select all'}
        </button>
      </div>

      <FavoritesSaveBar />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sortedTokens.map((token) => (
          <DistributionCard
            key={token.assetId}
            token={token}
            selected={selectedAssetIds.includes(token.assetId)}
            onToggle={() => toggleAsset(token.assetId)}
            favorite={
              connected
                ? {
                    active: isFavorite(token.assetId),
                    onToggle: () =>
                      toggleFavorite({
                        assetId: token.assetId,
                        ticker: token.ticker,
                        logo: token.logo,
                      }),
                  }
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
