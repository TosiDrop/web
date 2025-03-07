import { create } from 'zustand';

interface WalletState {
  walletAddress: string;
  setWalletAddress: (walletAddress: string) => void;
}

export const useWalletState = create<WalletState>((set) => ({
  walletAddress: '',
  setWalletAddress: (walletAddress: string) => set({ walletAddress }),
}));
