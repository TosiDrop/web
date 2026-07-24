import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useNetworkStore } from '@/store/network-state';

export interface EstimateFeesResponse {
  withdrawal_fee: string;
  tokens_fee: number;
  fee: number;
  deposit: number;
}

const STALE_MS = 5 * 60 * 1000;

export function useEstimateFees(tokenCount: number) {
  const network = useNetworkStore((s) => s.selectedNetwork);
  return useQuery<EstimateFeesResponse, Error>({
    queryKey: ['estimateFees', tokenCount, network],
    queryFn: () =>
      apiClient.get<EstimateFeesResponse>(
        `/api/estimateFees?token_count=${tokenCount}`,
      ),
    enabled: tokenCount > 0,
    staleTime: STALE_MS,
  });
}
