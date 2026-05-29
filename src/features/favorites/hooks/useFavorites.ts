import { useMemo, useState } from 'react';
import { useWallet } from '@meshsdk/react';
import { useWalletStore } from '@/store/wallet-state';
import {
  useFavoritesQuery,
  useSaveFavoritesMutation,
} from '@/features/favorites/api/favorites.queries';
import { useFavoritesDraft } from '@/features/favorites/store/favorites-draft';
import { signFavoritesUpdateMessage } from '@/features/favorites/utils/signFavoritesUpdate';
import type { FavoriteToken } from '@/features/favorites/types';

function sameSet(a: FavoriteToken[], b: FavoriteToken[]): boolean {
  if (a.length !== b.length) return false;
  const bIds = new Set(b.map((f) => f.assetId));
  return a.every((f) => bIds.has(f.assetId));
}

export function useFavorites() {
  const { wallet, connected } = useWallet();
  const stakeAddress = useWalletStore((s) => s.stakeAddress);

  const query = useFavoritesQuery(stakeAddress);
  const saved = useMemo(() => query.data ?? [], [query.data]);

  const rawDraft = useFavoritesDraft((s) => s.draft);
  const draftOwner = useFavoritesDraft((s) => s.owner);
  const setDraftState = useFavoritesDraft((s) => s.setDraft);
  const draft = draftOwner === stakeAddress ? rawDraft : null;
  const setDraft = (next: FavoriteToken[] | null) => setDraftState(next, stakeAddress);

  const save = useSaveFavoritesMutation();
  const [signError, setSignError] = useState<string | null>(null);

  const effective = draft ?? saved;
  const favoriteIds = useMemo(() => new Set(effective.map((f) => f.assetId)), [effective]);
  const isDirty = draft !== null && !sameSet(draft, saved);

  const isFavorite = (assetId: string) => favoriteIds.has(assetId);

  const toggle = (token: FavoriteToken) => {
    const base = draft ?? saved;
    const exists = base.some((f) => f.assetId === token.assetId);
    setDraft(exists ? base.filter((f) => f.assetId !== token.assetId) : [...base, token]);
  };

  const reset = () => setDraft(null);

  const persist = async () => {
    if (!wallet || !stakeAddress || !connected) return;
    setSignError(null);
    const list = draft ?? saved;
    try {
      const { signature, key, message } = await signFavoritesUpdateMessage({
        wallet,
        stakeAddress,
        assetIds: list.map((f) => f.assetId),
      });
      await save.mutateAsync({ stakeAddress, favorites: list, signature, key, message });
      setDraft(null);
    } catch (e) {
      setSignError(e instanceof Error ? e.message : 'Failed to sign or save favorites');
    }
  };

  return {
    connected,
    stakeAddress,
    favorites: effective,
    favoriteIds,
    isFavorite,
    toggle,
    reset,
    isDirty,
    persist,
    saving: save.isPending,
    error: signError ?? (save.error instanceof Error ? save.error.message : null),
    isLoading: query.isLoading,
  };
}
