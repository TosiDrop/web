import { useCallback, useState } from 'react';
import { useWalletStore } from '@/store/wallet-state';
import { rewardAddressToBech32 } from '@/utils/cardano-address';
import { createMeshTransactionBuilder, type MeshWalletInitiator } from '@/services/mesh-transaction-builder';

export function useDelegateToPool() {
  const wallet = useWalletStore((s) => s.wallet);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const delegate = useCallback(async (poolId: string, registered: boolean) => {
    if (!wallet) throw new Error('Wallet not connected');
    setIsPending(true);
    setError(null);
    try {
      const walletWithReward = wallet as unknown as MeshWalletInitiator & {
        getRewardAddressesBech32?: () => Promise<string[]>;
      };
      const rewardAddresses = walletWithReward.getRewardAddressesBech32
        ? await walletWithReward.getRewardAddressesBech32()
        : await wallet.getRewardAddresses();
      const rewardAddress = rewardAddressToBech32(rewardAddresses[0] ?? '');
      if (!rewardAddress) throw new Error('No reward address available');

      const builder = createMeshTransactionBuilder(walletWithReward);
      const unsignedTx = await builder.buildDelegation({ rewardAddress, poolId, registered });
      const signedTx = await wallet.signTx(unsignedTx, false);
      return await wallet.submitTx(signedTx);
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error('Delegation failed');
      setError(nextError);
      throw nextError;
    } finally {
      setIsPending(false);
    }
  }, [wallet]);

  return { delegate, isPending, error };
}
