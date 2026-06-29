import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export interface EstimateFeesResponse {
  withdrawal_fee: string;
  tokens_fee: number;
  fee: number;
  deposit: number;
}

const STALE_MS = 5 * 60 * 1000;

export function useEstimateFees(tokenCount: number) {
  return useQuery<EstimateFeesResponse, Error>({
    queryKey: ['estimateFees', tokenCount],
    queryFn: () =>
      apiClient.get<EstimateFeesResponse>(
        `/api/estimateFees?token_count=${tokenCount}`,
      ),
    enabled: tokenCount > 0,
    staleTime: STALE_MS,
  });
}
