import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { ClaimableToken } from '@/shared/rewards';

interface RewardsResponse {
  rewards: ClaimableToken[];
}

export function useRewards(stakeAddress: string | null) {
  return useQuery<ClaimableToken[], Error>({
    queryKey: ['rewards', stakeAddress],
    queryFn: async () => {
      const data = await apiClient.get<RewardsResponse>(
        `/api/getRewards?walletId=${encodeURIComponent(stakeAddress!)}`
      );
      return data.rewards;
    },
    enabled: !!stakeAddress,
  });
}
