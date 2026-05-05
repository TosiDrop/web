import { create } from 'zustand';

interface ClaimRequestInfo {
  requestId: string;
  deposit: number;
  withdrawalAddress: string;
}

interface ClaimState {
  /** Asset ids selected for the next claim. */
  selectedAssetIds: string[];
  /** Result of /api/getCustomRewards once the user kicks off a claim. */
  requestId: string | null;
  deposit: number | null;
  withdrawalAddress: string | null;
  /** True while the create-request is in flight. */
  isCreating: boolean;
  error: string | null;

  setSelected: (ids: string[]) => void;
  toggleAsset: (id: string) => void;
  clearSelection: () => void;
  setCreating: (v: boolean) => void;
  setError: (msg: string | null) => void;
  setRequest: (info: ClaimRequestInfo) => void;
  /** Wipes both selection and the active claim request. */
  reset: () => void;
}

export const useClaimStore = create<ClaimState>((set) => ({
  selectedAssetIds: [],
  requestId: null,
  deposit: null,
  withdrawalAddress: null,
  isCreating: false,
  error: null,

  setSelected: (selectedAssetIds) => set({ selectedAssetIds }),
  toggleAsset: (id) =>
    set((s) => ({
      selectedAssetIds: s.selectedAssetIds.includes(id)
        ? s.selectedAssetIds.filter((x) => x !== id)
        : [...s.selectedAssetIds, id],
    })),
  clearSelection: () => set({ selectedAssetIds: [] }),
  setCreating: (isCreating) => set({ isCreating }),
  setError: (error) => set({ error }),
  setRequest: ({ requestId, deposit, withdrawalAddress }) =>
    set({
      requestId,
      deposit,
      withdrawalAddress,
      isCreating: false,
      error: null,
    }),
  reset: () =>
    set({
      selectedAssetIds: [],
      requestId: null,
      deposit: null,
      withdrawalAddress: null,
      isCreating: false,
      error: null,
    }),
}));
