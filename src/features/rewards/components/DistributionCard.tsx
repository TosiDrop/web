import { useState } from 'react';
import { IconCheck } from '@tabler/icons-react';
import type { ClaimableToken } from '@/shared/rewards';
import { cn } from '@/lib/utils';
import { FavoriteStarButton } from '@/features/favorites/components/FavoriteStarButton';
import { DislikeButton } from '@/features/favorites/components/DislikeButton';

interface DistributionCardProps {
  token: ClaimableToken;
  selected: boolean;
  onToggle: () => void;
  favorite?: { active: boolean; onToggle: () => void };
  dislike?: { active: boolean; onToggle: () => void };
}

export function DistributionCard({ token, selected, onToggle, favorite, dislike }: DistributionCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const formattedAmount = token.amount.toLocaleString(undefined, {
    maximumFractionDigits: token.decimals,
  });

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
          'group relative flex w-full flex-col justify-between rounded-xl border p-4 text-left transition',
          selected
            ? 'border-brand-cyan/40 bg-surface-overlay'
            : token.premium
            ? 'border-purple-500/25 bg-surface-raised hover:bg-surface-overlay'
            : 'border-border-subtle bg-surface-raised hover:bg-surface-overlay',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded border transition',
            selected
              ? 'border-brand-cyan bg-brand-cyan text-surface-base'
              : 'border-border-default bg-surface-inset',
          )}
        >
          {selected && <IconCheck size={11} stroke={3} />}
        </span>

        <div
          className={cn(
            'flex items-center gap-2.5',
            favorite && dislike ? 'pl-14' : (favorite || dislike) && 'pl-7',
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-inset text-xs font-medium text-slate-400">
            {imgFailed || !token.logo ? (
              token.ticker.slice(0, 2)
            ) : (
              <img
                src={token.logo}
                alt={token.ticker}
                className="h-8 w-8 rounded-full"
                onError={() => setImgFailed(true)}
              />
            )}
          </div>
          <p className="text-sm font-medium text-white">{token.ticker}</p>
          {token.premium && (
            <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-400">
              Premium
            </span>
          )}
        </div>

        <div className="mt-4">
          <p className="text-lg font-semibold tabular-nums text-white truncate">
            {formattedAmount}
          </p>
          <p className="text-[11px] text-slate-500">{token.ticker}</p>
        </div>
      </button>
    </div>
  );
}
