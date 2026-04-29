import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Network = 'mainnet' | 'preview';

export function networkFromId(networkId: number | null): Network | null {
  if (networkId === 1) return 'mainnet';
  if (networkId === 0) return 'preview';
  return null;
}

export function networkLabel(network: Network): string {
  return network === 'mainnet' ? 'Mainnet' : 'Preview';
}

interface NetworkStore {
  selectedNetwork: Network;
  setNetwork: (network: Network) => void;
}

export const useNetworkStore = create<NetworkStore>()(
  persist(
    (set) => ({
      selectedNetwork: 'mainnet',
      setNetwork: (selectedNetwork) => set({ selectedNetwork }),
    }),
    {
      name: 'tosidrop-network',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
