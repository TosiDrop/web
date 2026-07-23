import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useNetworkStore } from '@/store/network-state';
import type { GetPoolsResponse } from '@/features/rewards/api/pools.queries';

export interface TeamPool {
  poolId: string;
  ticker: string;
  name: string;
  logo?: string;
  description?: string | null;
}

export function flattenWhitelist(
  raw: Record<string, string[]> | null | undefined,
): Set<string> {
  const out = new Set<string>();
  if (!raw || typeof raw !== 'object') return out;
  for (const ids of Object.values(raw)) {
    if (!Array.isArray(ids)) continue;
    for (const id of ids) {
      if (typeof id === 'string' && id) out.add(id);
    }
  }
  return out;
}

export function useWhitelistedPools() {
  const network = useNetworkStore((s) => s.selectedNetwork);
  return useQuery<TeamPool[], Error>({
    queryKey: ['whitelisted-pools', network],
    staleTime: 300_000,
    queryFn: async () => {
      const [pools, whitelist] = await Promise.all([
        apiClient.get<GetPoolsResponse>('/api/getPools'),
        apiClient.get<Record<string, string[]>>('/api/getWhitelist'),
      ]);
      const allowed = flattenWhitelist(whitelist);
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
