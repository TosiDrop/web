import { useMemo, useState } from 'react';
import type { ClaimableToken } from '@/shared/rewards';
import { useClaimStore } from '@/store/claim-state';
import { usePreferences } from '@/features/favorites/hooks/usePreferences';
import { partitionPreferences } from '@/features/favorites/utils/partitionPreferences';
import { FavoritesSaveBar } from '@/features/favorites/components/FavoritesSaveBar';
import { DistributionCard } from './DistributionCard';

interface AvailableDistributionsProps {
  tokens: ClaimableToken[];
}

export function AvailableDistributions({ tokens }: AvailableDistributionsProps) {
  const selectedAssetIds = useClaimStore((s) => s.selectedAssetIds);
  const toggleAsset = useClaimStore((s) => s.toggleAsset);
  const setSelected = useClaimStore((s) => s.setSelected);

  const {
    connected,
    favoriteIds,
    dislikedIds,
    isFavorite,
    isDisliked,
    toggleFavorite,
    toggleDislike,
  } = usePreferences();

  const [showHidden, setShowHidden] = useState(false);

  const { visible, hidden } = useMemo(
    () => partitionPreferences(tokens, favoriteIds, dislikedIds),
    [tokens, favoriteIds, dislikedIds],
  );

  if (tokens.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-[16px] font-semibold text-[#EDEEF2]">Claimable tokens</h2>
        <p className="py-6 text-center text-sm text-[#6B6F7B]">
          No rewards found for this address.
        </p>
      </div>
    );
  }

  const allSelected =
    visible.length > 0 && visible.every((t) => selectedAssetIds.includes(t.assetId));

  const toggleAll = () => {
    setSelected(allSelected ? [] : visible.map((t) => t.assetId));
  };

  // Disliking a selected token also deselects it so hidden tokens can't ride
  // along into a claim unnoticed.
  const handleDislike = (token: ClaimableToken) => {
    if (!isDisliked(token.assetId) && selectedAssetIds.includes(token.assetId)) {
      toggleAsset(token.assetId);
    }
    toggleDislike({ assetId: token.assetId, ticker: token.ticker, logo: token.logo });
  };

  const renderCard = (token: ClaimableToken) => (
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
      dislike={
        connected
          ? { active: isDisliked(token.assetId), onToggle: () => handleDislike(token) }
          : undefined
      }
    />
  );

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2.5">
        <h2 className="text-[16px] font-semibold text-[#EDEEF2]">Claimable tokens</h2>
        <span className="rounded-md bg-white/[0.05] px-2 py-[3px] font-mono text-[11px] text-[#8A8E9A]">
          {visible.length}
        </span>
        <button
          type="button"
          onClick={toggleAll}
          className="ml-auto text-[12.5px] text-accent-light transition hover:brightness-110"
        >
          {allSelected ? 'Clear' : 'Select all'}
        </button>
      </div>

      <FavoritesSaveBar />

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map(renderCard)}
      </div>

      {hidden.length > 0 && (
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={() => setShowHidden((v) => !v)}
            aria-expanded={showHidden}
            className="font-mono text-[10px] uppercase tracking-wider text-slate-500 transition hover:text-slate-300"
          >
            {showHidden ? '▾' : '▸'} Hidden tokens ({hidden.length})
          </button>
          {showHidden && (
            <div className="grid grid-cols-1 gap-3 opacity-70 sm:grid-cols-2 xl:grid-cols-3">
              {hidden.map(renderCard)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
