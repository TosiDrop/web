import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { FavoriteToken } from '@/features/favorites/types';

interface FavoritesResponse {
  favorites: FavoriteToken[];
  degraded?: boolean;
}

export interface SaveFavoritesRequest {
  stakeAddress: string;
  favorites: FavoriteToken[];
  signature: string;
  key: string;
  message: string;
}

export function useFavoritesQuery(stakeAddress: string | null) {
  return useQuery<FavoriteToken[], Error>({
    queryKey: ['favorites', stakeAddress],
    queryFn: async () => {
      if (!stakeAddress) throw new Error('stakeAddress is required');
      const data = await apiClient.get<FavoritesResponse>(
        `/api/userFavorites?stakeAddress=${encodeURIComponent(stakeAddress)}`,
      );
      return data.favorites ?? [];
    },
    enabled: !!stakeAddress,
  });
}

export function useSaveFavoritesMutation() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, SaveFavoritesRequest>({
    mutationFn: (data) => apiClient.post<{ success: boolean }>('/api/userFavorites', data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['favorites', variables.stakeAddress] });
    },
  });
}
