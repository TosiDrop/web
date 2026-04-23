import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { ClaimCreateRequest, ClaimStatus, DepositInfo } from '@/types/claim';

export function useClaimCreate() {
  return useMutation<DepositInfo, Error, ClaimCreateRequest>({
    mutationFn: (data) => apiClient.post<DepositInfo>('/api/claim/create', data),
  });
}

interface UseClaimStatusArgs {
  requestId: string | null;
  stakeAddress: string | null;
  enabled: boolean;
  refetchIntervalMs?: number;
}

export function useClaimStatus({
  requestId,
  stakeAddress,
  enabled,
  refetchIntervalMs,
}: UseClaimStatusArgs) {
  return useQuery<ClaimStatus, Error>({
    queryKey: ['claim-status', requestId, stakeAddress],
    queryFn: async () => {
      if (!requestId || !stakeAddress) throw new Error('requestId and stakeAddress required');
      const params = new URLSearchParams({
        requestId,
        stakeAddress,
      });
      return apiClient.get<ClaimStatus>(`/api/claim/status?${params.toString()}`);
    },
    enabled: enabled && !!requestId && !!stakeAddress,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return refetchIntervalMs ?? 60_000;
      if (data.kind === 'success' || data.kind === 'failure') return false;
      return refetchIntervalMs ?? 60_000;
    },
    refetchOnWindowFocus: false,
    staleTime: 0,
    gcTime: 0,
  });
}
