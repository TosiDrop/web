import { useEffect, useRef } from 'react';
import { useWallet, useNetwork } from '@meshsdk/react';
import { useWalletStore } from '@/store/wallet-state';
import { rewardAddressToBech32 } from '@/utils/cardano-address';

export function useWalletSync() {
  const { wallet, connected, name } = useWallet();
  const network = useNetwork();
  const { setWalletState, resetWallet } = useWalletStore();
  const prevConnected = useRef(false);

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

        if (cancelled) return;

        setWalletState({
          connected: true,
          walletName: name,
          stakeAddress,
          changeAddress,
          networkId: network ?? null,
        });
      } catch (error) {
        console.error('Failed to sync wallet state:', error);
      }
    };

    sync();

    return () => { cancelled = true; };
  }, [connected, wallet, name, network, setWalletState, resetWallet]);
}
