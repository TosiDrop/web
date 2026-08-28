import { useMemo, useState } from 'react';
import { useWallet } from '@meshsdk/react';
import { useWalletStore } from '@/store/wallet-state';
import {
  usePreferencesQuery,
  useSavePreferencesMutation,
} from '@/features/favorites/api/preferences.queries';
import { usePreferencesDraft } from '@/features/favorites/store/preferences-draft';
import { signPreferencesUpdateMessage } from '@/features/favorites/utils/signPreferencesUpdate';
import { EMPTY_PREFERENCES, type TokenPreferences, type TokenRef } from '@/features/favorites/types';

function sameIds(a: TokenRef[], b: TokenRef[]): boolean {
  if (a.length !== b.length) return false;
  const bIds = new Set(b.map((f) => f.assetId));
  return a.every((f) => bIds.has(f.assetId));
}

function samePreferences(a: TokenPreferences, b: TokenPreferences): boolean {
  return sameIds(a.favorites, b.favorites) && sameIds(a.dislikes, b.dislikes);
}

const without = (list: TokenRef[], assetId: string) =>
  list.filter((f) => f.assetId !== assetId);

export function usePreferences() {
  const { wallet, connected } = useWallet();
  const stakeAddress = useWalletStore((s) => s.stakeAddress);

  const query = usePreferencesQuery(stakeAddress);
  const saved = useMemo(() => query.data ?? EMPTY_PREFERENCES, [query.data]);

  const rawDraft = usePreferencesDraft((s) => s.draft);
  const draftOwner = usePreferencesDraft((s) => s.owner);
  const setDraftState = usePreferencesDraft((s) => s.setDraft);
  const draft = draftOwner === stakeAddress ? rawDraft : null;
  const setDraft = (next: TokenPreferences | null) => setDraftState(next, stakeAddress);

  const save = useSavePreferencesMutation();
  const [signError, setSignError] = useState<string | null>(null);

  const effective = draft ?? saved;
  const favoriteIds = useMemo(
    () => new Set(effective.favorites.map((f) => f.assetId)),
    [effective],
  );
  const dislikedIds = useMemo(
    () => new Set(effective.dislikes.map((f) => f.assetId)),
    [effective],
  );
  const isDirty = draft !== null && !samePreferences(draft, saved);

  const isFavorite = (assetId: string) => favoriteIds.has(assetId);
  const isDisliked = (assetId: string) => dislikedIds.has(assetId);

  const toggleFavorite = (token: TokenRef) => {
    const base = draft ?? saved;
    const exists = base.favorites.some((f) => f.assetId === token.assetId);
    setDraft({
      favorites: exists
        ? without(base.favorites, token.assetId)
        : [...base.favorites, token],
      dislikes: without(base.dislikes, token.assetId),
    });
  };

  const toggleDislike = (token: TokenRef) => {
    const base = draft ?? saved;
    const exists = base.dislikes.some((f) => f.assetId === token.assetId);
    setDraft({
      favorites: without(base.favorites, token.assetId),
      dislikes: exists
        ? without(base.dislikes, token.assetId)
        : [...base.dislikes, token],
    });
  };

  const reset = () => setDraft(null);

  const persist = async () => {
    if (!wallet || !stakeAddress || !connected) return;
    setSignError(null);
    const current = draft ?? saved;
    try {
      const { signature, key, message } = await signPreferencesUpdateMessage({
        wallet,
        stakeAddress,
        favoriteIds: current.favorites.map((f) => f.assetId),
        dislikedIds: current.dislikes.map((f) => f.assetId),
      });
      await save.mutateAsync({
        stakeAddress,
        favorites: current.favorites,
        dislikes: current.dislikes,
        signature,
        key,
        message,
      });
      setDraft(null);
    } catch (e) {
      setSignError(e instanceof Error ? e.message : 'Failed to sign or save preferences');
    }
  };

  return {
    connected,
    stakeAddress,
    favorites: effective.favorites,
    dislikes: effective.dislikes,
    favoriteIds,
    dislikedIds,
    isFavorite,
    isDisliked,
    toggleFavorite,
    toggleDislike,
    reset,
    isDirty,
    persist,
    saving: save.isPending,
    error: signError ?? (save.error instanceof Error ? save.error.message : null),
    isLoading: query.isLoading,
  };
}
