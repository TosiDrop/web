import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import type { TokenMap } from '@/features/history/api/history.queries';
import type { GetPoolsResponse } from '@/features/rewards/api/pools.queries';
import { flattenWhitelist } from '@/features/team/api/team.queries';
import { buildPoolComparison, type PoolComparisonRow } from '@/features/analytics/utils/poolComparison';

export type OptionalSource = 'statistics' | 'whitelist' | 'tokens';

export interface PoolData {
  rows: PoolComparisonRow[];
  /** Optional sources that failed this fetch; their columns render as unknown. */
  unavailable: OptionalSource[];
}

/** Resolves to null instead of rejecting, so one optional feed cannot sink the table. */
async function optional<T>(source: OptionalSource, request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (error) {
    console.error(`pool comparison: ${source} unavailable:`, error);
    return null;
  }
}

export function usePoolData() {
  return useQuery<PoolData, Error>({
    queryKey: ['pool-comparison', DEPLOYMENT_NETWORK],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      // Pools and distributions are the table; the rest annotate it.
      const [pools, distributions, statistics, whitelist, tokens] = await Promise.all([
        apiClient.get<GetPoolsResponse>('/api/getPools'),
        apiClient.get<unknown>('/api/getDistributions'),
        optional('statistics', apiClient.get<unknown>('/api/getStatistics')),
        optional('whitelist', apiClient.get<Record<string, string[]>>('/api/getWhitelist')),
        optional('tokens', apiClient.get<TokenMap>('/api/getTokens')),
      ]);
      const unavailable: OptionalSource[] = [];
      if (statistics === null) unavailable.push('statistics');
      if (whitelist === null) unavailable.push('whitelist');
      if (tokens === null) unavailable.push('tokens');
      return {
        rows: buildPoolComparison({
          pools,
          distributions,
          statistics,
          whitelist: whitelist === null ? null : flattenWhitelist(whitelist),
          tokens,
        }),
        unavailable,
      };
    },
  });
}
