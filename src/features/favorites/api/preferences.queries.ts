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
      if (data.degraded) throw new Error('Saved tokens are unavailable while the preferences database is offline.');
      return { favorites: data.favorites ?? [], dislikes: data.dislikes ?? [] };
    },
    enabled: !!stakeAddress,
  });
}

export function useSavePreferencesMutation() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; degraded?: boolean }, Error, SavePreferencesRequest>({
    mutationFn: async (data) => {
      const result = await apiClient.post<{ success: boolean; degraded?: boolean }>('/api/tokenPreferences', data);
      if (result.degraded || !result.success) {
        throw new Error('Saved tokens are unavailable while the preferences database is offline.');
      }
      return result;
    },
    onSuccess: (_result, variables) => {
      queryClient.setQueryData<TokenPreferences>(['preferences', variables.stakeAddress], {
        favorites: variables.favorites,
        dislikes: variables.dislikes,
      });
      void queryClient.invalidateQueries({ queryKey: ['preferences', variables.stakeAddress] });
    },
  });
}
