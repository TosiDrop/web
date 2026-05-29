import { useState } from 'react';
import { useFavorites } from '@/features/favorites/hooks/useFavorites';
import { FavoriteStarButton } from './FavoriteStarButton';
import { FavoritesSaveBar } from './FavoritesSaveBar';
import type { FavoriteToken } from '@/features/favorites/types';

function FavoriteRow({
  token,
  active,
  onToggle,
}: {
  token: FavoriteToken;
  active: boolean;
  onToggle: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-raised px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-inset text-xs font-medium text-slate-400">
        {imgFailed || !token.logo ? (
          (token.ticker || token.assetId).slice(0, 2)
        ) : (
          <img
            src={token.logo}
            alt={token.ticker}
            className="h-8 w-8 rounded-full"
            onError={() => setImgFailed(true)}
          />
        )}
      </div>
      <span className="truncate text-sm font-medium text-white">
        {token.ticker || token.assetId}
      </span>
      <span className="ml-auto">
        <FavoriteStarButton active={active} onToggle={onToggle} />
      </span>
    </li>
  );
}

export function FavoritesTab() {
  const { favorites, connected, isFavorite, toggle, isLoading } = useFavorites();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-light tracking-tight text-white">
          Favorite <span className="font-semibold">tokens</span>
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Starred tokens rise to the top of your claimable list.
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
            <p className="text-sm text-slate-500 animate-pulse">Loading favorites…</p>
          ) : favorites.length === 0 ? (
            <div className="card-premium px-6 py-16 text-center">
              <p className="label-eyebrow">No favorites yet</p>
              <p className="mx-auto mt-3 max-w-sm text-sm text-slate-400">
                Tap the star on a token in your claimable list to add it here.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {favorites.map((token) => (
                <FavoriteRow
                  key={token.assetId}
                  token={token}
                  active={isFavorite(token.assetId)}
                  onToggle={() => toggle(token)}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
