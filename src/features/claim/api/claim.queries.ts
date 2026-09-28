import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import type { ClaimCreateRequest, ClaimStatus, DepositInfo } from '@/types/claim';

/** Creates a claim request and exposes its deposit details through a mutation. */
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

/** Polls one claim for its original wallet and carries a known transaction hash across sparse responses. */
export function useClaimStatus({
  requestId,
  stakeAddress,
  enabled,
  refetchIntervalMs,
}: UseClaimStatusArgs) {
  return useQuery<ClaimStatus, Error>({
    queryKey: ['claim-status', requestId, stakeAddress, DEPLOYMENT_NETWORK],
    queryFn: async ({ queryKey, client }) => {
      if (!requestId || !stakeAddress) throw new Error('requestId and stakeAddress required');
      const params = new URLSearchParams({
        requestId,
        stakeAddress,
      });
      const status = await apiClient.get<ClaimStatus>(`/api/claim/status?${params.toString()}`);
      const previousStatus = client.getQueryData<ClaimStatus>(queryKey);
      const txHash = previousStatus?.kind === 'processing' ? previousStatus.txHash : undefined;

      if (status.kind === 'processing' && !status.txHash && txHash) {
        return { ...status, txHash };
      }
      if (status.kind !== 'success' || status.txHash) return status;

      return { ...status, txHash: txHash || '' };
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
