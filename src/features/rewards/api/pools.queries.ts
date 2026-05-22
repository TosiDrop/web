import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

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
  return useQuery<GetPoolsResponse, Error>({
    queryKey: ['pools'],
    queryFn: () => apiClient.get<GetPoolsResponse>('/api/getPools'),
    staleTime: 60 * 60 * 1000,
  });
}
