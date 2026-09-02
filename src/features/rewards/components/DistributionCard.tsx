import { IconCheck } from '@tabler/icons-react';
import type { ClaimableToken } from '@/shared/rewards';
import { cn } from '@/lib/utils';
import { Card } from '@/components/common/Card';
import { tokenImageSrc } from '@/shared/tokenImage';
import { useImageFallback } from '@/hooks/useImageFallback';
import { FavoriteStarButton } from '@/features/favorites/components/FavoriteStarButton';
import { DislikeButton } from '@/features/favorites/components/DislikeButton';

interface DistributionCardProps {
  token: ClaimableToken;
  selected: boolean;
  onToggle: () => void;
  favorite?: { active: boolean; onToggle: () => void };
  dislike?: { active: boolean; onToggle: () => void };
}

// Deterministic chart color so each token's fallback tile reads distinctly.
function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `var(--color-chart-${(h % 6) + 1})`;
}

export function DistributionCard({ token, selected, onToggle, favorite, dislike }: DistributionCardProps) {
  const img = useImageFallback([tokenImageSrc(token.assetId, token.logo), token.logo]);
  const formattedAmount = token.amount.toLocaleString(undefined, {
    maximumFractionDigits: token.decimals,
  });
  const hasImage = !img.failed && !!img.src;
  const actionsActive = !!(favorite?.active || dislike?.active);

  return (
    <Card
      className={cn(
        'group relative transition',
        selected ? 'border-accent/40' : 'hover:border-border-default',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className="flex w-full flex-col rounded-2xl p-4 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg text-xs font-bold tracking-tight text-accent-contrast ring-1 ring-white/10"
              style={hasImage ? undefined : { backgroundColor: colorFor(token.ticker) }}
            >
              {hasImage ? (
                <img
                  src={img.src}
                  alt=""
                  className="h-10 w-10 rounded-lg object-cover"
                  onError={img.onError}
                />
              ) : (
                token.ticker.slice(0, 2).toUpperCase()
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-text-primary">
                {token.ticker}
              </span>
              {token.premium ? (
                <span className="mt-1 inline-block rounded-md bg-accent/[0.12] px-1.5 py-0.5 text-2xs font-medium text-accent-light">
                  Premium
                </span>
              ) : (
                <span className="mt-0.5 block text-2xs text-text-muted">Reward</span>
              )}
            </span>
          </div>

          <span
            aria-hidden
            className={cn(
              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition',
              selected
                ? 'bg-accent text-accent-contrast'
                : 'border-2 border-border-strong group-hover:border-accent/50',
            )}
          >
            {selected && <IconCheck size={12} stroke={3.2} />}
          </span>
        </div>

        <span className="mt-5 block">
          <span className="block truncate text-2xl font-semibold leading-none tabular-nums tracking-tight text-text-primary">
            {formattedAmount}
          </span>
          <span className="mt-2 block font-mono text-2xs uppercase tracking-wider text-text-muted">
            {token.ticker}
          </span>
        </span>
      </button>

      {(favorite || dislike) && (
        <div
          className={cn(
            'absolute bottom-2 right-2 z-10 flex items-center transition',
            actionsActive
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100',
          )}
        >
          {favorite && (
            <FavoriteStarButton
              active={favorite.active}
              onToggle={favorite.onToggle}
              ticker={token.ticker}
            />
          )}
          {dislike && (
            <DislikeButton active={dislike.active} onToggle={dislike.onToggle} ticker={token.ticker} />
          )}
        </div>
      )}
    </Card>
  );
}
