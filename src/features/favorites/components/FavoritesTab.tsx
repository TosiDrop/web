import { usePreferences } from '@/features/favorites/hooks/usePreferences';
import { tokenImageSrc } from '@/shared/tokenImage';
import { useImageFallback } from '@/hooks/useImageFallback';
import { FavoriteStarButton } from './FavoriteStarButton';
import { DislikeButton } from './DislikeButton';
import { FavoritesSaveBar } from './FavoritesSaveBar';
import type { TokenRef } from '@/features/favorites/types';

function TokenRow({
  token,
  control,
}: {
  token: TokenRef;
  control: React.ReactNode;
}) {
  const img = useImageFallback([tokenImageSrc(token.assetId, token.logo), token.logo]);
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-raised px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-inset text-xs font-medium text-slate-400">
        {img.failed || !img.src ? (
          (token.ticker || token.assetId).slice(0, 2)
        ) : (
          <img
            src={img.src}
            alt={token.ticker}
            className="h-8 w-8 rounded-full"
            onError={img.onError}
          />
        )}
      </div>
      <span className="truncate text-sm font-medium text-white">
        {token.ticker || token.assetId}
      </span>
      <span className="ml-auto">{control}</span>
    </li>
  );
}

export function FavoritesTab() {
  const {
    favorites,
    dislikes,
    connected,
    isFavorite,
    isDisliked,
    toggleFavorite,
    toggleDislike,
    isLoading,
  } = usePreferences();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-light tracking-tight text-white">
          Favorite <span className="font-semibold">tokens</span>
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Saved tokens rise to the top of your claimable list.
        </p>
      </div>

      {!connected ? (
        <div className="card-premium px-6 py-16 text-center">
          <p className="label-eyebrow">Not connected</p>
          <p className="mx-auto mt-3 max-w-sm text-sm text-slate-400">
            Connect a wallet to manage your favorite tokens.
          </p>
        </div>
      ) : (
        <>
          <FavoritesSaveBar />
          {isLoading ? (
            <p className="text-sm text-slate-500 animate-pulse">Loading preferences…</p>
          ) : (
            <>
              {favorites.length === 0 ? (
                <div className="card-premium px-6 py-16 text-center">
                  <p className="label-eyebrow">No favorites yet</p>
                  <p className="mx-auto mt-3 max-w-sm text-sm text-slate-400">
                    Tap the bookmark on a token in your claimable list to add it here.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
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
                </ul>
              )}

              <div className="pt-4">
                <h3 className="text-sm font-medium text-white">Hidden tokens</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Disliked tokens are tucked into a collapsed section on the claim page.
                </p>
                {dislikes.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">Nothing hidden.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
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
                  </ul>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
