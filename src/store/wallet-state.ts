import { create } from 'zustand';
import type { CardanoWalletApi } from '@/types/wallet';

export interface WalletState {
  walletApi: CardanoWalletApi | null;
  walletName: string | null;
  stakeAddress: string | null;
  signingAddress: string | null;
  isConnecting: boolean;
  error: string | null;
  networkId: number | null;

  setConnection: (payload: {
    walletApi: CardanoWalletApi;
    walletName: string;
    stakeAddress: string | null;
    signingAddress: string | null;
    networkId: number | null;
  }) => void;
  setIsConnecting: (isConnecting: boolean) => void;
  setError: (error: string | null) => void;
  resetWallet: () => void;
}

export const useWalletState = create<WalletState>((set) => ({
  walletApi: null,
  walletName: null,
  stakeAddress: null,
  signingAddress: null,
  isConnecting: false,
  error: null,
  networkId: null,

  setConnection: ({
    walletApi,
    walletName,
    stakeAddress,
    signingAddress,
    networkId,
  }) =>
    set({
      walletApi,
      walletName,
      stakeAddress,
      signingAddress,
      networkId,
      error: null,
      isConnecting: false,
    }),
  setIsConnecting: (isConnecting: boolean) => set({ isConnecting }),
  setError: (error: string | null) => set({ error }),
  resetWallet: () =>
    set({
      walletApi: null,
      walletName: null,
      stakeAddress: null,
      signingAddress: null,
      isConnecting: false,
      error: null,
      networkId: null,
    }),
}));
