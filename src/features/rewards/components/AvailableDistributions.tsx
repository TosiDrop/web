import { useMemo, useState } from 'react';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import type { ClaimableToken } from '@/shared/rewards';
import { GradientButton } from '@/components/common/GradientButton';
import { useClaimStore } from '@/store/claim-state';
import { usePreferences } from '@/features/favorites/hooks/usePreferences';
import { partitionPreferences } from '@/features/favorites/utils/partitionPreferences';
import { limitSelection, visibleSelection } from '@/features/claim/utils/claimSelection';
import { FavoritesSaveBar } from '@/features/favorites/components/FavoritesSaveBar';
import { DistributionCard } from './DistributionCard';
import type { PublicMarketPrice } from '@/features/market/api/market.queries';

interface AvailableDistributionsProps {
  tokens: ClaimableToken[];
  maxAssets: number;
  marketPrices?: Record<string, PublicMarketPrice>;
}

export function AvailableDistributions({ tokens, maxAssets, marketPrices = {} }: AvailableDistributionsProps) {
  const selectedAssetIds = useClaimStore((s) => s.selectedAssetIds);
  const toggleAsset = useClaimStore((s) => s.toggleAsset);

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
  const visibleAssetIds = useMemo(() => visible.map((token) => token.assetId), [visible]);
  const selectedVisible = useMemo(
    () => limitSelection(visibleSelection(selectedAssetIds, visibleAssetIds), maxAssets),
    [selectedAssetIds, visibleAssetIds, maxAssets],
  );

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
      selected={selectedVisible.includes(token.assetId)}
      selectionDisabled={!selectedVisible.includes(token.assetId) && selectedVisible.length >= maxAssets}
      onToggle={() => {
        if (selectedVisible.includes(token.assetId) || selectedVisible.length < maxAssets) toggleAsset(token.assetId);
      }}
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
      marketPrice={marketPrices[token.assetId]}
    />
  );

  const HiddenChevron = showHidden ? IconChevronDown : IconChevronRight;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <h2 className="text-base font-semibold text-text-primary">Claimable tokens</h2>
        <span className="rounded-md bg-white/[0.05] px-2 py-0.5 font-mono text-2xs text-text-muted">
          {visible.length}
        </span>
      </div>

      <FavoritesSaveBar />

      {visible.length > maxAssets && (
        <p className="text-xs text-text-muted">
          The claim service accepts {maxAssets} token types per request. Clear one selection to pick a different token, or use Select next batch above.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map(renderCard)}
      </div>

      {hidden.length > 0 && (
        <div className="space-y-3 pt-2">
          <GradientButton
            variant="ghost"
            size="sm"
            onClick={() => setShowHidden((v) => !v)}
            aria-expanded={showHidden}
          >
            <HiddenChevron size={16} stroke={1.8} />
            Hidden tokens ({hidden.length})
          </GradientButton>
          {showHidden && (
            <div className="grid grid-cols-1 gap-4 opacity-70 sm:grid-cols-2 xl:grid-cols-3">
              {hidden.map(renderCard)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
