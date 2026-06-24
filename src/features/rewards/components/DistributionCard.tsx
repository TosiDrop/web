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

// Deterministic swatch color so each token's icon tile reads distinctly,
// matching the vivid coin tiles in the design.
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

  return (
    <div className="relative">
      {favorite && (
        <FavoriteStarButton
          active={favorite.active}
          onToggle={favorite.onToggle}
          className="absolute left-3 top-3 z-10"
        />
      )}
      {dislike && (
        <DislikeButton
          active={dislike.active}
          onToggle={dislike.onToggle}
          className={cn('absolute top-3 z-10', favorite ? 'left-10' : 'left-3')}
        />
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className={cn(
          'group relative flex w-full flex-col justify-between rounded-[15px] border bg-[linear-gradient(180deg,#13161F,#10131A)] p-[17px] text-left shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_14px_30px_-22px_rgba(0,0,0,0.7)] transition',
          selected
            ? 'border-accent/40'
            : 'border-white/[0.07] hover:border-white/[0.14]',
        )}
      >
        {/* Glow check — selection indicator */}
        <span
          aria-hidden
          className={cn(
            'absolute right-[15px] top-[15px] flex h-[18px] w-[18px] items-center justify-center rounded-full transition',
            selected
              ? 'bg-accent text-white shadow-[0_0_0_3px_rgba(99,102,241,0.16)]'
              : 'border-[1.5px] border-white/20',
          )}
        >
          {selected && <IconCheck size={11} stroke={3.2} />}
        </span>

        <div
          className={cn(
            'flex items-center gap-2.5',
            favorite && dislike ? 'pl-14' : (favorite || dislike) && 'pl-7',
          )}
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[9px] text-[11px] font-bold tracking-tight text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset]"
            style={hasImage ? undefined : { backgroundColor: tile }}
          >
            {hasImage ? (
              <img
                src={img.src}
                alt={token.ticker}
                className="h-8 w-8 rounded-[9px] object-cover"
                onError={img.onError}
              />
            ) : (
              token.ticker.slice(0, 2)
            )}
          </span>
          <p className="text-[14px] font-medium text-[#EDEEF2]">{token.ticker}</p>
          {token.premium && (
            <span className="rounded bg-accent/[0.12] px-1.5 py-0.5 text-[10px] font-medium text-accent-light">
              Premium
            </span>
          )}
        </div>

        <div className="mt-[18px]">
          <p className="truncate text-[23px] font-semibold tabular-nums tracking-[-0.01em] text-[#F4F5F7]">
            {formattedAmount}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-[#6B6F7B]">{token.ticker}</p>
        </div>
      </button>
    </div>
  );
}
