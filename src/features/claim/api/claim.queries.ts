import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type {
  ClaimValidateRequest,
  ClaimValidateResponse,
  ClaimSubmitRequest,
  ClaimSubmitResponse,
  ClaimSubmitTxRequest,
  ClaimSubmitTxResponse,
  ClaimStatus,
} from '@/types/claim';

export function useClaimValidate() {
  return useMutation<ClaimValidateResponse, Error, ClaimValidateRequest>({
    mutationFn: (data) => apiClient.post<ClaimValidateResponse>('/api/claim/validate', data),
  });
}

export function useClaimSubmit() {
  return useMutation<ClaimSubmitResponse, Error, ClaimSubmitRequest>({
    mutationFn: (data) => apiClient.post<ClaimSubmitResponse>('/api/claim/submit', data),
  });
}

export function useClaimSubmitTx() {
  return useMutation<ClaimSubmitTxResponse, Error, ClaimSubmitTxRequest>({
    mutationFn: (data) => apiClient.post<ClaimSubmitTxResponse>('/api/claim/submitTransaction', data),
  });
}

export function useClaimStatus(hash: string | null) {
  return useQuery<ClaimStatus, Error>({
    queryKey: ['claimStatus', hash],
    queryFn: () => apiClient.get<ClaimStatus>(`/api/claim/status?hash=${encodeURIComponent(hash!)}`),
    enabled: !!hash,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'completed' || status === 'failed') return false;
      return 3000;
    },
  });
}
