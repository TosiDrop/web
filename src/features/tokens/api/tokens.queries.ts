import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import { EMPTY_DISTRIBUTION, type Project } from '@/shared/projects';
import { tickerFor, type TokenMap } from '@/features/history/api/history.queries';

export interface PublicTokensResponse {
  projects: Project[];
  degraded: boolean;
  /** True when either the project registry or VM metadata had to be omitted. */
  metadataDegraded?: boolean;
  tokens?: TokenMap;
  scope: 'public';
}

export function usePublicTokens() {
  return useQuery<PublicTokensResponse, Error>({
    queryKey: ['public-tokens', DEPLOYMENT_NETWORK],
    queryFn: async () => {
      const [projectsResult, tokensResult] = await Promise.allSettled([
        apiClient.get<PublicTokensResponse>('/api/projects'),
        apiClient.get<TokenMap>('/api/getTokens'),
      ]);
      const projectsResponse = projectsResult.status === 'fulfilled' ? projectsResult.value : null;
      const tokenMap = tokensResult.status === 'fulfilled' && tokensResult.value && typeof tokensResult.value === 'object'
        ? tokensResult.value
        : {};
      if (!projectsResponse && Object.keys(tokenMap).length === 0) {
        throw new Error('Token catalog is temporarily unavailable');
      }

      const projects = projectsResponse?.projects ?? [];
      const known = new Set(projects.map((project) => project.tokenId));
      const metadataProjects: Project[] = Object.entries(tokenMap)
        .filter(([tokenId]) => !known.has(tokenId))
        .map(([tokenId, info]) => {
          const safeInfo = info && typeof info === 'object' ? info : {};
          const ticker = tickerFor(tokenId, safeInfo);
          return {
            id: `token:${tokenId}`,
            network: DEPLOYMENT_NETWORK,
            ownerAddress: '',
            name: safeInfo.name || ticker,
            description: 'Token metadata from the TosiDrop distribution platform.',
            website: '',
            logoUrl: safeInfo.logo || '',
            tokenId,
            poolId: '',
            distribution: EMPTY_DISTRIBUTION,
            status: 'approved',
            createdAt: '',
            updatedAt: '',
            approvedAt: null,
          };
        });
      return {
        projects: [...projects, ...metadataProjects],
        degraded: projectsResponse?.degraded === true && projects.length === 0 && Object.keys(tokenMap).length === 0,
        metadataDegraded: !projectsResponse || projectsResponse.degraded || tokensResult.status === 'rejected',
        tokens: tokenMap,
        scope: 'public' as const,
      };
    },
    staleTime: 60_000,
  });
}
