import { create } from 'zustand';

export interface ClaimRequestInfo {
  requestId: string;
  deposit: number;
  withdrawalAddress: string;
}

interface ClaimState {
  selectedAssetIds: string[];
  request: ClaimRequestInfo | null;

  setSelected: (ids: string[]) => void;
  toggleAsset: (id: string) => void;
  setRequest: (info: ClaimRequestInfo) => void;
  reset: () => void;
}

export const useClaimStore = create<ClaimState>((set) => ({
  selectedAssetIds: [],
  request: null,

  setSelected: (selectedAssetIds) => set({ selectedAssetIds }),
  toggleAsset: (id) =>
    set((s) => ({
      selectedAssetIds: s.selectedAssetIds.includes(id)
        ? s.selectedAssetIds.filter((x) => x !== id)
        : [...s.selectedAssetIds, id],
    })),
  setRequest: (request) => set({ request }),
  reset: () => set({ selectedAssetIds: [], request: null }),
}));
