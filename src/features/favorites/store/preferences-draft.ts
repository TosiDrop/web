import { create } from 'zustand';
import type { TokenPreferences } from '@/features/favorites/types';

interface PreferencesDraftState {
  // null = in sync with the server. `owner` scopes the draft to a stake
  // address so switching wallets discards a stale draft.
  draft: TokenPreferences | null;
  owner: string | null;
  setDraft: (draft: TokenPreferences | null, owner: string | null) => void;
}

export const usePreferencesDraft = create<PreferencesDraftState>((set) => ({
  draft: null,
  owner: null,
  setDraft: (draft, owner) => set({ draft, owner }),
}));
