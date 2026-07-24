import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useNetworkStore } from '@/store/network-state';

export interface Pool {
  id: string;
  ticker: string;
  name: string;
  enabled: string;
  logo: string;
  description?: string | null;
}

export type GetPoolsResponse = Record<string, Pool>;

export function usePools() {
  const network = useNetworkStore((s) => s.selectedNetwork);
  return useQuery<GetPoolsResponse, Error>({
    queryKey: ['pools', network],
    queryFn: () => apiClient.get<GetPoolsResponse>('/api/getPools'),
    staleTime: 60 * 60 * 1000,
  });
}
