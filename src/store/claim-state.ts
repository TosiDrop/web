import { create } from 'zustand';

export interface ClaimRequestInfo {
  requestId: string;
  deposit: number;
  withdrawalAddress: string;
}

interface ClaimState {
  selectedAssetIds: string[];
  request: ClaimRequestInfo | null;
  lookupAddress: string | null;
  initializedFor: string | null;

  setSelected: (ids: string[]) => void;
  toggleAsset: (id: string) => void;
  setRequest: (info: ClaimRequestInfo) => void;
  setLookupAddress: (address: string | null) => void;
  initSelectionFor: (address: string, assetIds: string[]) => void;
  reset: () => void;
}

export const useClaimStore = create<ClaimState>((set) => ({
  selectedAssetIds: [],
  request: null,
  lookupAddress: null,
  initializedFor: null,

  setSelected: (selectedAssetIds) => set({ selectedAssetIds }),
  toggleAsset: (id) =>
    set((s) => ({
      selectedAssetIds: s.selectedAssetIds.includes(id)
        ? s.selectedAssetIds.filter((x) => x !== id)
        : [...s.selectedAssetIds, id],
    })),
  setRequest: (request) => set({ request }),
  setLookupAddress: (lookupAddress) => set({ lookupAddress }),
  initSelectionFor: (address, assetIds) =>
    set((s) =>
      s.initializedFor === address
        ? s
        : { initializedFor: address, selectedAssetIds: assetIds },
    ),
  reset: () => set({ selectedAssetIds: [], request: null, initializedFor: null }),
}));
