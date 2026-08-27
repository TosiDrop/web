import { Card } from '@/components/common/Card';
import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import { GradientButton } from '@/components/common/GradientButton';
import { usePreferences } from '@/features/favorites/hooks/usePreferences';
import { usePreferencesQuery } from '@/features/favorites/api/preferences.queries';
import { tokenImageSrc } from '@/shared/tokenImage';
import { useImageFallback } from '@/hooks/useImageFallback';
import { FavoriteStarButton } from './FavoriteStarButton';
import { DislikeButton } from './DislikeButton';
import { FavoritesSaveBar } from './FavoritesSaveBar';
import type { TokenRef } from '@/features/favorites/types';

function TokenRow({ token, control }: { token: TokenRef; control: React.ReactNode }) {
  const img = useImageFallback([tokenImageSrc(token.assetId, token.logo), token.logo]);
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-inset text-xs font-medium uppercase text-text-muted">
        {img.failed || !img.src ? (
          (token.ticker || token.assetId).slice(0, 2)
        ) : (
          <img src={img.src} alt="" className="h-8 w-8 rounded-full" onError={img.onError} />
        )}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
        {token.ticker || token.assetId}
      </span>
      {control}
    </li>
  );
}

function TokenList({ children }: { children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-border-subtle">{children}</ul>
    </Card>
  );
}

function EmptyState({ eyebrow, message }: { eyebrow: string; message: string }) {
  return (
    <Card variant="inset" className="px-6 py-16 text-center">
      <p className="label-eyebrow">{eyebrow}</p>
      <p className="mx-auto mt-3 max-w-sm text-sm text-text-muted">{message}</p>
    </Card>
  );
}

function SkeletonRows() {
  return (
    <Card role="status" aria-label="Loading saved tokens" className="overflow-hidden">
      <ul className="divide-y divide-border-subtle">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex items-center gap-3 px-5 py-3">
            <div className="skeleton-shimmer h-8 w-8 rounded-full" />
            <div className="skeleton-shimmer h-3 w-28 rounded" />
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function FavoritesTab() {
  const {
    stakeAddress,
    favorites,
    dislikes,
    connected,
    isFavorite,
    isDisliked,
    toggleFavorite,
    toggleDislike,
    isLoading,
  } = usePreferences();
  const { error: loadError, refetch } = usePreferencesQuery(stakeAddress);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text-primary">Saved tokens</h2>
        <p className="mt-1 text-sm text-text-muted">
          Saved tokens rise to the top of your claimable list.
        </p>
      </div>

      {!connected ? (
        <EmptyState eyebrow="Not connected" message="Connect a wallet to manage your saved tokens." />
      ) : loadError ? (
        <div className="space-y-3">
          <FeedbackBanner tone="error" title="Couldn't load saved tokens" message={loadError.message} />
          <GradientButton variant="secondary" size="sm" onClick={() => refetch()}>
            Try again
          </GradientButton>
        </div>
      ) : (
        <>
          <FavoritesSaveBar />
          {isLoading ? (
            <SkeletonRows />
          ) : (
            <>
              {favorites.length === 0 ? (
                <EmptyState
                  eyebrow="No saved tokens"
                  message="Star a token on the claim page to keep it here."
                />
              ) : (
                <TokenList>
                  {favorites.map((token) => (
                    <TokenRow
                      key={token.assetId}
                      token={token}
                      control={
                        <FavoriteStarButton
                          active={isFavorite(token.assetId)}
                          onToggle={() => toggleFavorite(token)}
                        />
                      }
                    />
                  ))}
                </TokenList>
              )}

              <div className="space-y-3 pt-4">
                <div>
                  <h3 className="text-sm font-medium text-text-primary">Hidden tokens</h3>
                  <p className="mt-1 text-xs text-text-muted">
                    Hidden tokens are tucked into a collapsed section on the claim page.
                  </p>
                </div>
                {dislikes.length === 0 ? (
                  <p className="text-sm text-text-muted">Nothing hidden.</p>
                ) : (
                  <TokenList>
                    {dislikes.map((token) => (
                      <TokenRow
                        key={token.assetId}
                        token={token}
                        control={
                          <DislikeButton
                            active={isDisliked(token.assetId)}
                            onToggle={() => toggleDislike(token)}
                          />
                        }
                      />
                    ))}
                  </TokenList>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
