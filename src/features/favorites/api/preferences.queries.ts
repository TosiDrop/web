import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { TokenPreferences, TokenRef } from '@/features/favorites/types';

interface PreferencesResponse {
  favorites: TokenRef[];
  dislikes: TokenRef[];
  degraded?: boolean;
}

export interface SavePreferencesRequest {
  stakeAddress: string;
  favorites: TokenRef[];
  dislikes: TokenRef[];
  signature: string;
  key: string;
  message: string;
}

export function usePreferencesQuery(stakeAddress: string | null) {
  return useQuery<TokenPreferences, Error>({
    queryKey: ['preferences', stakeAddress],
    queryFn: async () => {
      if (!stakeAddress) throw new Error('stakeAddress is required');
      const data = await apiClient.get<PreferencesResponse>(
        `/api/tokenPreferences?stakeAddress=${encodeURIComponent(stakeAddress)}`,
      );
      return { favorites: data.favorites ?? [], dislikes: data.dislikes ?? [] };
    },
    enabled: !!stakeAddress,
  });
}

export function useSavePreferencesMutation() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, SavePreferencesRequest>({
    mutationFn: (data) => apiClient.post<{ success: boolean }>('/api/tokenPreferences', data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['preferences', variables.stakeAddress] });
    },
  });
}
