import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type {
  ClaimValidateRequest,
  ClaimValidateResponse,
  ClaimSubmitRequest,
  ClaimSubmitResponse,
  ClaimSubmitTxRequest,
  ClaimSubmitTxResponse,
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
