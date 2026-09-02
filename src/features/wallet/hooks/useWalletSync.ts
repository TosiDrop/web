import { useEffect, useRef } from 'react';
import { useWallet, useNetwork } from '@meshsdk/react';
import { useWalletStore, type WalletInstance } from '@/store/wallet-state';
import { rewardAddressToBech32 } from '@/utils/cardano-address';

/** Mirrors the Mesh wallet into the app store. Must run inside MeshProvider. */
export function useWalletSync() {
  const { wallet, connected, name, disconnect, setPersist } = useWallet();
  const network = useNetwork();
  const { setWalletState, resetWallet, registerDisconnect } = useWalletStore();
  const prevConnected = useRef(false);

  useEffect(() => {
    registerDisconnect(disconnect);
  }, [disconnect, registerDisconnect]);

  // Remember the session so a reload reconnects without the modal.
  useEffect(() => {
    setPersist(true);
  }, [setPersist]);

  useEffect(() => {
    if (!connected || !wallet) {
      if (prevConnected.current) {
        resetWallet();
        prevConnected.current = false;
      }
      return;
    }

    prevConnected.current = true;
    let cancelled = false;

    const sync = async () => {
      try {
        const rewardAddresses = await wallet.getRewardAddresses();
        const stakeAddress = rewardAddresses[0]
          ? rewardAddressToBech32(rewardAddresses[0])
          : null;
        const changeAddress = await wallet.getChangeAddress();

        if (!cancelled) {
          setWalletState({
            connected: true,
            walletName: name,
            stakeAddress,
            changeAddress,
            networkId: network ?? null,
            wallet: wallet as WalletInstance,
          });
        }
      } catch (error) {
        console.error('Failed to sync wallet state:', error);
      }
    };

    sync();

    return () => {
      cancelled = true;
    };
  }, [connected, wallet, name, network, setWalletState, resetWallet]);
}
