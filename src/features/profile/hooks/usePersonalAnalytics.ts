import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { TokenMap } from '@/features/history/api/history.queries';
import {
  normalizePersonalAnalytics,
  type PersonalAnalyticsData,
  type RawPersonalAnalyticsResponse,
} from '@/features/profile/utils/personalAnalytics';

export function usePersonalAnalytics(stakeAddress: string | null) {
  return useQuery<PersonalAnalyticsData, Error>({
    queryKey: ['personal-analytics', stakeAddress],
    enabled: !!stakeAddress,
    staleTime: 60_000,
    queryFn: async () => {
      if (!stakeAddress) throw new Error('stakeAddress is required');
      const [analytics, tokens] = await Promise.all([
        apiClient.get<RawPersonalAnalyticsResponse>(
          `/api/personalAnalytics?staking_address=${encodeURIComponent(stakeAddress)}`,
        ),
        // Tickers and decimals only decorate the numbers; a metadata outage
        // must not blank the charts.
        apiClient.get<TokenMap>('/api/getTokens').catch((error: unknown) => {
          console.error('personal analytics token metadata unavailable:', error);
          return {} as TokenMap;
        }),
      ]);
      return normalizePersonalAnalytics(analytics, tokens);
    },
  });
}
