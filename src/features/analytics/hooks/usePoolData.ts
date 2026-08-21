import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import type { TokenMap } from '@/features/history/api/history.queries';
import type { GetPoolsResponse } from '@/features/rewards/api/pools.queries';
import { flattenWhitelist } from '@/features/team/api/team.queries';
import { buildPoolComparison, type PoolComparisonRow } from '@/features/analytics/utils/poolComparison';

export function usePoolData() {
  return useQuery<PoolComparisonRow[], Error>({
    queryKey: ['pool-comparison', DEPLOYMENT_NETWORK],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [pools, distributions, statistics, whitelist, tokens] = await Promise.all([
        apiClient.get<GetPoolsResponse>('/api/getPools'),
        apiClient.get<unknown>('/api/getDistributions'),
        apiClient.get<unknown>('/api/getStatistics'),
        apiClient.get<Record<string, string[]>>('/api/getWhitelist'),
        apiClient.get<TokenMap>('/api/getTokens'),
      ]);
      return buildPoolComparison({
        pools,
        distributions,
        statistics,
        whitelist: flattenWhitelist(whitelist),
        tokens,
      });
    },
  });
}
