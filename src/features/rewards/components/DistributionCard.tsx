import { useState } from 'react';
import type { ClaimableToken } from '@/shared/rewards';
import { cn } from '@/lib/utils';

interface DistributionCardProps {
  token: ClaimableToken;
  onClaim: () => void;
  disabled?: boolean;
}

export function DistributionCard({ token, onClaim, disabled }: DistributionCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const formattedAmount = token.amount.toLocaleString(undefined, {
    maximumFractionDigits: token.decimals,
  });

  return (
    <div
      className={cn(
        'group flex flex-col justify-between rounded-xl border bg-surface-raised p-4 transition hover:bg-surface-overlay',
        token.premium ? 'border-purple-500/25' : 'border-border-subtle'
      )}
    >
      <div className="flex items-center gap-2.5">
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

      <div className="mt-4 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-lg font-semibold tabular-nums text-white truncate">
            {formattedAmount}
          </p>
          <p className="text-[11px] text-slate-500">{token.ticker}</p>
        </div>
        <button
          onClick={onClaim}
          disabled={disabled}
          className="shrink-0 rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-brand-cyan/30 hover:text-brand-cyan disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-border-subtle disabled:hover:text-slate-400"
        >
          Claim
        </button>
      </div>
    </div>
  );
}
