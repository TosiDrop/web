import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import type { Project } from '@/shared/projects';

export interface PublicTokensResponse {
  projects: Project[];
  degraded: boolean;
  scope: 'public';
}

export function usePublicTokens() {
  return useQuery<PublicTokensResponse, Error>({
    queryKey: ['public-tokens', DEPLOYMENT_NETWORK],
    queryFn: () => apiClient.get<PublicTokensResponse>('/api/projects'),
    staleTime: 60_000,
  });
}
