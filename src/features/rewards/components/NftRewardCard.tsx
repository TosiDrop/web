import { useState } from 'react';
import { IconCheck, IconPhotoOff } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import type { ClaimableToken } from '@/shared/rewards';
import { nftImageUrl } from '@/shared/rewards';
import { Card } from '@/components/common/Card';
import { CopyButton } from '@/components/common/CopyButton';
import { FavoriteStarButton } from '@/features/favorites/components/FavoriteStarButton';
import { DislikeButton } from '@/features/favorites/components/DislikeButton';
import { cn } from '@/lib/utils';

interface NftRewardCardProps {
  token: ClaimableToken;
  selected: boolean;
  selectionDisabled?: boolean;
  onToggle: () => void;
  favorite?: { active: boolean; onToggle: () => void };
  dislike?: { active: boolean; onToggle: () => void };
}

/** Artwork and metadata can fail independently of claim selection and exact asset identity. */
export function NftRewardCard({ token, selected, selectionDisabled = false, onToggle, favorite, dislike }: NftRewardCardProps) {
  const name = token.nft?.name || token.ticker || 'NFT reward';
  const source = nftImageUrl(token.nft?.image);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const hasImage = source !== null && source !== failedSource;
  const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
  return (
    <Card as="article" className={cn('min-w-0 overflow-hidden', selected && 'border-accent/50')}>
      <button
        type="button"
        onClick={onToggle}
        disabled={selectionDisabled}
        aria-label={`${selected ? 'Deselect' : 'Select'} ${name}`}
        aria-pressed={selected}
        title={selectionDisabled ? 'Claim limit reached; clear a selection or choose the next batch' : undefined}
        className={cn('group block w-full rounded-xl text-left disabled:cursor-not-allowed disabled:opacity-60', focus)}
      >
        <span className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-surface-inset">
          {hasImage ? (
            <>
              <img
                key={`${source}:${attempt}`}
                src={source}
                alt={name}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onLoad={() => setLoadedSource(source)}
                onError={() => setFailedSource(source)}
                className="absolute inset-0 h-full w-full object-contain"
              />
              {loadedSource !== source && <span className="relative rounded-lg bg-surface-inset/90 px-3 py-2 text-xs text-text-secondary" role="status">Loading artwork for {name}</span>}
            </>
          ) : (
            <span className="flex flex-col items-center gap-2 px-4 text-sm text-text-muted">
              <IconPhotoOff size={32} stroke={1.4} aria-hidden />
              Artwork unavailable
            </span>
          )}
          <span aria-hidden className={cn('absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border-2', selected ? 'border-accent bg-accent text-accent-contrast' : 'border-cream/70 bg-surface-base/90 text-cream')}>
            {selected && <IconCheck size={16} stroke={3} />}
          </span>
        </span>
        <span className="block space-y-1.5 p-4 pb-2">
          <span className="block break-words text-base font-semibold text-text-primary [overflow-wrap:anywhere]">{name}</span>
          {token.nft?.collection && <span className="block break-words text-sm text-text-secondary [overflow-wrap:anywhere]">{token.nft.collection}</span>}
          <span className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-text-muted">
            <span>{token.amount.toLocaleString(undefined, { maximumFractionDigits: token.decimals })} {token.amount === 1 ? 'NFT' : 'NFT units'}</span>
            <span className={cn('font-medium', selected && 'text-accent-light')}>{selected ? 'Selected' : 'Select reward'}</span>
          </span>
        </span>
      </button>
      <div className="px-4 pb-3">
        <div className="flex min-w-0 items-center gap-2 border-t border-border-subtle pt-2">
          <code className="min-w-0 flex-1 select-all break-all text-2xs leading-relaxed text-text-muted">{token.assetId}</code>
          <CopyButton value={token.assetId} ariaLabel={`Copy asset ID for ${name}`} className={cn('h-11 w-11 shrink-0', focus)} />
        </div>
        {!hasImage && source && (
          <button type="button" aria-label={`Retry artwork for ${name}`} onClick={() => { setFailedSource(null); setLoadedSource(null); setAttempt((value) => value + 1); }} className={cn('min-h-11 rounded-lg text-xs text-accent-light hover:underline', focus)}>Retry artwork</button>
        )}
        <div className="flex flex-wrap items-center justify-between gap-1 pt-1">
          <Link to={`/tokens/${encodeURIComponent(token.assetId)}`} aria-label={`NFT details for ${name}`} className={cn('inline-flex min-h-11 items-center rounded-lg pr-2 text-xs text-accent-light hover:underline', focus)}>NFT details</Link>
          <div className="flex items-center">
            {favorite && <FavoriteStarButton active={favorite.active} onToggle={favorite.onToggle} ticker={name} className={cn('h-11 w-11', focus)} />}
            {dislike && <DislikeButton active={dislike.active} onToggle={dislike.onToggle} ticker={name} className={cn('h-11 w-11', focus)} />}
          </div>
        </div>
      </div>
    </Card>
  );
}
