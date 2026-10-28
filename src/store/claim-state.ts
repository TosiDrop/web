import { create } from 'zustand';

type DepositTransaction = { status: 'signing' } | { status: 'submitted'; txHash: string };

export interface ClaimRequestInfo {
  stakeAddress: string;
  requestId: string;
  deposit: number;
  overheadFee: number;
  withdrawalAddress: string;
  depositTransaction?: DepositTransaction;
}

interface ClaimState {
  selectedAssetIds: string[];
  request: ClaimRequestInfo | null;
  lookupAddress: string | null;
  initializedFor: string | null;

  setSelected: (ids: string[]) => void;
  toggleAsset: (id: string) => void;
  setRequest: (info: ClaimRequestInfo) => void;
  setDepositTransaction: (request: Pick<ClaimRequestInfo, 'requestId' | 'stakeAddress'>, transaction: DepositTransaction | undefined) => void;
  setLookupAddress: (address: string | null) => void;
  initSelectionFor: (address: string, initialIds: string[], validIds?: string[]) => void;
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
  setDepositTransaction: (request, depositTransaction) => set((s) => {
    if (s.request?.requestId !== request.requestId || s.request.stakeAddress !== request.stakeAddress) return s;
    return { request: { ...s.request, depositTransaction } };
  }),
  setLookupAddress: (lookupAddress) => set({ lookupAddress }),
  initSelectionFor: (address, initialIds, validIds = initialIds) =>
    set((s) => {
      if (s.initializedFor !== address)
        return { initializedFor: address, selectedAssetIds: initialIds };
      const pruned = s.selectedAssetIds.filter((id) => validIds.includes(id));
      return pruned.length === s.selectedAssetIds.length ? s : { selectedAssetIds: pruned };
    }),
  reset: () => set({ selectedAssetIds: [], request: null, initializedFor: null }),
}));
