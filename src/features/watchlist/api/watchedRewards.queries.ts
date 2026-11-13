import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import type { ClaimableToken } from '@/shared/rewards';
import { watchedAddressError } from '../validation';

/** Public reads use their own network + wallet cache and never touch claim selection. */
export function useWatchedRewards(stakeAddress: string | null, enabled = true) {
  return useQuery<ClaimableToken[], Error>({
    queryKey: ['watched-wallet-rewards', DEPLOYMENT_NETWORK, stakeAddress],
    enabled: enabled && !!stakeAddress && !watchedAddressError(stakeAddress),
    queryFn: async () => {
      if (!stakeAddress || watchedAddressError(stakeAddress)) throw new Error('A valid stake address is required.');
      const data = await apiClient.get<{ rewards: ClaimableToken[] }>(`/api/getRewards?walletId=${encodeURIComponent(stakeAddress)}`);
      if (!Array.isArray(data.rewards) || data.rewards.some((reward) => !reward || typeof reward.assetId !== 'string' || typeof reward.ticker !== 'string' || typeof reward.amount !== 'number' || !Number.isFinite(reward.amount))) {
        throw new Error('Rewards could not be read. Please retry.');
      }
      return data.rewards.filter((reward) => reward.amount > 0);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
