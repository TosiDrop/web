import { create } from 'zustand';
import { EnabledWallet } from '@newm.io/cardano-dapp-wallet-connector';

export interface WalletState {
  wallet: EnabledWallet | null;
  walletAddress: string;
  isConnecting: boolean;
  error: string | null;
  balance: number | null;
  networkId: number | null;

  // Actions
  setWallet: (wallet: EnabledWallet | null) => void;
  setWalletAddress: (walletAddress: string) => void;
  setIsConnecting: (isConnecting: boolean) => void;
  setError: (error: string | null) => void;
  setBalance: (balance: number | null) => void;
  setNetworkId: (networkId: number | null) => void;
  resetWallet: () => void;
}

export const useWalletState = create<WalletState>((set) => ({
  wallet: null,
  walletAddress: '',
  isConnecting: false,
  error: null,
  balance: null,
  networkId: null,

  setWallet: (wallet: EnabledWallet | null) => set({ wallet }),
  setWalletAddress: (walletAddress: string) => set({ walletAddress }),
  setIsConnecting: (isConnecting: boolean) => set({ isConnecting }),
  setError: (error: string | null) => set({ error }),
  setBalance: (balance: number | null) => set({ balance }),
  setNetworkId: (networkId: number | null) => set({ networkId }),

  resetWallet: () => set({
    wallet: null,
    walletAddress: '',
    isConnecting: false,
    error: null,
    balance: null,
    networkId: null,
  }),
}));
