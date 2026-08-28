import { create } from 'zustand';
import type { useWallet } from '@meshsdk/react';
import type { AssetExtended } from '@meshsdk/common';
import type { WalletState } from '@/types/wallet';

type MeshWallet = NonNullable<ReturnType<typeof useWallet>['wallet']>;

/**
 * The connected Mesh browser wallet, or null. @meshsdk/react's type omits
 * getLovelace/getAssets although the runtime has them; the runtime casts once
 * at the sync boundary so consumers get the full surface.
 */
export type WalletInstance =
  | (MeshWallet & { getLovelace(): Promise<string>; getAssets(): Promise<AssetExtended[]> })
  | null;

/** localStorage key Mesh writes when a session is persisted. */
export const MESH_PERSIST_KEY = 'mesh-wallet-persist';

interface WalletStore extends WalletState {
  wallet: WalletInstance;
  /** True once the (lazy-loaded) wallet runtime should be mounted. */
  runtimeWanted: boolean;
  /** Registered by the runtime; no-op until it mounts. */
  disconnect: () => void;

  setWalletState: (state: Partial<WalletState> & { wallet?: WalletInstance }) => void;
  resetWallet: () => void;
  wantRuntime: () => void;
  registerDisconnect: (fn: () => void) => void;
}

const initialState: WalletState & { wallet: WalletInstance } = {
  connected: false,
  walletName: null,
  stakeAddress: null,
  changeAddress: null,
  networkId: null,
  wallet: null,
};

export const useWalletStore = create<WalletStore>((set) => ({
  ...initialState,
  runtimeWanted:
    typeof localStorage !== 'undefined' && localStorage.getItem(MESH_PERSIST_KEY) !== null,
  disconnect: () => {},
  setWalletState: (partial) =>
    set((state) => (partial.connected === false ? { ...initialState } : { ...state, ...partial })),
  resetWallet: () => set(initialState),
  wantRuntime: () => set({ runtimeWanted: true }),
  registerDisconnect: (disconnect) => set({ disconnect }),
}));
