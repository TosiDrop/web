import { IconCheck } from '@tabler/icons-react';
import type { ClaimableToken } from '@/shared/rewards';
import { cn } from '@/lib/utils';
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

// Deterministic swatch color so each token's fallback tile reads distinctly.
const PALETTE = [
  '#3B82F6', '#22C55E', '#A855F7', '#EC4899', '#EF4444',
  '#F59E0B', '#14B8A6', '#C084FC', '#64748B',
];

function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function DistributionCard({ token, selected, onToggle, favorite, dislike }: DistributionCardProps) {
  const img = useImageFallback([tokenImageSrc(token.assetId, token.logo), token.logo]);
  const formattedAmount = token.amount.toLocaleString(undefined, {
    maximumFractionDigits: token.decimals,
  });
  const tile = colorFor(token.ticker);
  const hasImage = !img.failed && !!img.src;
  const actionsActive = !!(favorite?.active || dislike?.active);

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className={cn(
          'flex w-full flex-col rounded-2xl border bg-[linear-gradient(180deg,#161B2E,#121726)] p-4 text-left transition duration-200 hover:-translate-y-0.5',
          selected
            ? 'border-accent/40 shadow-[0_16px_34px_-24px_rgba(0,0,0,0.75)]'
            : 'border-[rgba(56,78,128,0.28)] shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_14px_30px_-24px_rgba(0,0,0,0.7)] hover:border-[rgba(56,78,128,0.55)]',
        )}
      >
        {/* Header: icon + ticker, selection control */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-[12px] font-bold tracking-tight text-white ring-1 ring-white/10"
              style={hasImage ? undefined : { backgroundColor: tile }}
            >
              {hasImage ? (
                <img
                  src={img.src}
                  alt={token.ticker}
                  className="h-10 w-10 rounded-xl object-cover"
                  onError={img.onError}
                />
              ) : (
                token.ticker.slice(0, 2).toUpperCase()
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-[#F2F3F6]">{token.ticker}</p>
              {token.premium ? (
                <span className="mt-1 inline-block rounded bg-accent/[0.12] px-1.5 py-0.5 text-[10px] font-medium text-accent-light">
                  Premium
                </span>
              ) : (
                <p className="mt-0.5 text-[11px] text-[#6B7290]">Reward</p>
              )}
            </div>
          </div>

          <span
            aria-hidden
            className={cn(
              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition',
              selected
                ? 'bg-accent text-accent-contrast'
                : 'border-[1.5px] border-[rgba(56,78,128,0.7)] group-hover:border-accent/50',
            )}
          >
            {selected && <IconCheck size={12} stroke={3.2} />}
          </span>
        </div>

        {/* Amount */}
        <div className="mt-5">
          <p className="truncate text-[24px] font-semibold leading-none tabular-nums tracking-[-0.01em] text-[#F4F5F7]">
            {formattedAmount}
          </p>
          <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.06em] text-[#6B7290]">
            {token.ticker}
          </p>
        </div>
      </button>

      {/* Favorite / dislike — revealed on hover, persistent when active */}
      {(favorite || dislike) && (
        <div
          className={cn(
            'absolute bottom-3.5 right-3.5 z-10 flex items-center gap-0.5 transition',
            actionsActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        >
          {favorite && (
            <FavoriteStarButton active={favorite.active} onToggle={favorite.onToggle} />
          )}
          {dislike && (
            <DislikeButton active={dislike.active} onToggle={dislike.onToggle} />
          )}
        </div>
      )}
    </div>
  );
}
