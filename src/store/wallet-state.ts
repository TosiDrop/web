import { create } from 'zustand';
import type { WalletState } from '@/types/wallet';

interface WalletStore extends WalletState {
  setWalletState: (state: Partial<WalletState>) => void;
  resetWallet: () => void;
}

const initialState: WalletState = {
  connected: false,
  walletName: null,
  stakeAddress: null,
  changeAddress: null,
  networkId: null,
};

export const useWalletStore = create<WalletStore>((set) => ({
  ...initialState,
  setWalletState: (partial) =>
    set((state) => (partial.connected === false ? { ...initialState } : { ...state, ...partial })),
  resetWallet: () => set(initialState),
}));
