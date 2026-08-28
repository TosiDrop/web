import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { DEPLOYMENT_NETWORK } from '@/config/network';

export interface Pool {
  id: string;
  ticker: string;
  name: string;
  enabled: string;
  logo: string;
  description?: string | null;
  delegator_count?: string;
}

export type GetPoolsResponse = Record<string, Pool>;

export function usePools() {
  return useQuery<GetPoolsResponse, Error>({
    queryKey: ['pools', DEPLOYMENT_NETWORK],
    queryFn: () => apiClient.get<GetPoolsResponse>('/api/getPools'),
    staleTime: 60 * 60 * 1000,
  });
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

export function useWhitelist() {
  return useQuery<Set<string>, Error>({
    queryKey: ['whitelist', DEPLOYMENT_NETWORK],
    queryFn: async () =>
      flattenWhitelist(await apiClient.get<Record<string, string[]>>('/api/getWhitelist')),
    staleTime: 60 * 60 * 1000,
  });
}
