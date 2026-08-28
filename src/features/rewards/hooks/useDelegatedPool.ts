import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { DEPLOYMENT_NETWORK } from '@/config/network';

export interface Delegation {
  poolId: string | null;
  registered: boolean;
}

/**
 * The wallet's current delegation from ledger state (/api/delegation → Koios).
 * `poolId` is null only for a confirmed non-delegating account; a failed
 * lookup surfaces as `error` so callers can say so instead of "no pool".
 * `refetch` lets an explicit re-check of the same address retry a failed
 * lookup or pick up a redelegation before the stale time elapses.
 */
export function useDelegatedPool(stakeAddress: string | null) {
  const query = useQuery<Delegation, Error>({
    queryKey: ['delegation', DEPLOYMENT_NETWORK, stakeAddress],
    enabled: !!stakeAddress,
    staleTime: 5 * 60 * 1000,
    queryFn: () =>
      apiClient.get<Delegation>(
        `/api/delegation?staking_address=${encodeURIComponent(stakeAddress!)}`,
      ),
  });
  return {
    poolId: query.data?.poolId ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
