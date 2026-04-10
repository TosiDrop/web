import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { ApiError } from '@/types/api';
import type { ProfileData, SaveProfileRequest, SaveProfileResponse } from '@/types/profile';

export function useProfile(walletId: string | null) {
  return useQuery<ProfileData | null, Error>({
    queryKey: ['profile', walletId],
    queryFn: async () => {
      if (!walletId) throw new Error('walletId is required');
      try {
        return await apiClient.get<ProfileData>(
          `/api/profileData?walletId=${encodeURIComponent(walletId)}`
        );
      } catch (e: unknown) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    enabled: !!walletId,
  });
}

export function useSaveProfile() {
  const queryClient = useQueryClient();
  return useMutation<SaveProfileResponse, Error, SaveProfileRequest>({
    mutationFn: (data) => apiClient.post<SaveProfileResponse>('/api/profileData', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profile', variables.walletId] });
    },
  });
}
