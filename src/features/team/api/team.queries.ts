import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import type { GetPoolsResponse } from '@/features/rewards/api/pools.queries';

export interface TeamPool {
  poolId: string;
  ticker: string;
  name: string;
  logo?: string;
  description?: string | null;
}

export function normalizePartnerPoolIds(raw: unknown): Set<string> {
  return new Set(
    Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string' && id.length > 0) : [],
  );
}

export function usePartnerPools() {
  return useQuery<TeamPool[], Error>({
    queryKey: ['partner-pools', DEPLOYMENT_NETWORK],
    staleTime: 300_000,
    queryFn: async () => {
      const [pools, partnerPoolIds] = await Promise.all([
        apiClient.get<GetPoolsResponse>('/api/getPools'),
        apiClient.get<string[]>('/api/getPartnerPools'),
      ]);
      const allowed = normalizePartnerPoolIds(partnerPoolIds);
      return Object.entries(pools ?? {})
        .filter(([key, pool]) => allowed.has(key) || allowed.has(pool?.id))
        .map(([key, pool]) => ({
          poolId: pool?.id || key,
          ticker: pool?.ticker ?? '',
          name: pool?.name ?? '',
          logo: pool?.logo || undefined,
          description: pool?.description ?? null,
        }));
    },
  });
}
