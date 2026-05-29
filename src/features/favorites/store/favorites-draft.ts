import { create } from 'zustand';
import type { FavoriteToken } from '@/features/favorites/types';

interface FavoritesDraftState {
  // null = in sync with the server. `owner` scopes the draft to a stake
  // address so switching wallets discards a stale draft.
  draft: FavoriteToken[] | null;
  owner: string | null;
  setDraft: (draft: FavoriteToken[] | null, owner: string | null) => void;
}

export const useFavoritesDraft = create<FavoritesDraftState>((set) => ({
  draft: null,
  owner: null,
  setDraft: (draft, owner) => set({ draft, owner }),
}));
