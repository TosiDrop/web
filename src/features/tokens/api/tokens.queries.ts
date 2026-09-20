import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import { EMPTY_DISTRIBUTION, type Project } from '@/shared/projects';
import { tickerFor, type TokenInfo, type TokenMap } from '@/features/history/api/history.queries';

export interface PublicTokensResponse {
  projects: Project[];
  degraded: boolean;
  /** True when either the project registry or VM metadata had to be omitted. */
  metadataDegraded?: boolean;
  tokens?: TokenMap;
  scope: 'public';
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeTokenInfo(value: unknown): TokenInfo | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const ticker = nonEmptyString(raw.ticker);
  const name = nonEmptyString(raw.name);
  const logo = nonEmptyString(raw.logo);
  const decimals = typeof raw.decimals === 'number' && Number.isFinite(raw.decimals)
    ? raw.decimals
    : typeof raw.decimals === 'string' && /^\d+$/.test(raw.decimals.trim())
      ? raw.decimals.trim()
      : undefined;
  if (!ticker && !name && !logo && decimals === undefined) return null;
  return { ticker: ticker ?? undefined, name: name ?? undefined, logo: logo ?? undefined, decimals };
}

function normalizeProject(value: unknown, tokens: TokenMap): Project | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const tokenId = nonEmptyString(raw.tokenId);
  if (!tokenId) return null;
  const info = tokens[tokenId];
  const ticker = tickerFor(tokenId, info);
  const name = nonEmptyString(raw.name) ?? nonEmptyString(info?.name) ?? ticker;
  const distribution = raw.distribution && typeof raw.distribution === 'object' && !Array.isArray(raw.distribution)
    ? raw.distribution as Record<string, unknown>
    : {};
  const status = raw.status === 'pending' || raw.status === 'approved' || raw.status === 'rejected'
    ? raw.status
    : 'approved';
  return {
    id: nonEmptyString(raw.id) ?? `token:${tokenId}`,
    network: nonEmptyString(raw.network) ?? DEPLOYMENT_NETWORK,
    ownerAddress: nonEmptyString(raw.ownerAddress) ?? '',
    name,
    description: nonEmptyString(raw.description) ?? 'A TosiDrop token distribution program.',
    website: nonEmptyString(raw.website) ?? '',
    logoUrl: nonEmptyString(raw.logoUrl) ?? info?.logo ?? '',
    tokenId,
    poolId: nonEmptyString(raw.poolId) ?? '',
    distribution: {
      amountPerEpoch: nonEmptyString(distribution.amountPerEpoch) ?? '',
      minStakeAda: nonEmptyString(distribution.minStakeAda) ?? '',
      expiryEpochs: typeof distribution.expiryEpochs === 'number' && Number.isInteger(distribution.expiryEpochs)
        ? distribution.expiryEpochs
        : 0,
    },
    status,
    createdAt: nonEmptyString(raw.createdAt) ?? '',
    updatedAt: nonEmptyString(raw.updatedAt) ?? '',
    approvedAt: nonEmptyString(raw.approvedAt),
  };
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
      const projectsPayloadMalformed = Boolean(projectsResponse && !Array.isArray(projectsResponse.projects));
      const tokenPayloadMalformed = Boolean(tokensResult.status === 'fulfilled' && (!tokensResult.value || typeof tokensResult.value !== 'object' || Array.isArray(tokensResult.value)));
      const rawTokenMap = tokensResult.status === 'fulfilled' && tokensResult.value && typeof tokensResult.value === 'object' && !Array.isArray(tokensResult.value)
        ? tokensResult.value
        : {};
      const tokenMap = Object.fromEntries(
        Object.entries(rawTokenMap)
          .map(([tokenId, info]) => [tokenId, normalizeTokenInfo(info)] as const)
          .filter((entry): entry is [string, TokenInfo] => Boolean(entry[1])),
      ) as TokenMap;
      const rawProjects = Array.isArray(projectsResponse?.projects) ? projectsResponse.projects : [];
      const projects = rawProjects
        .map((project) => normalizeProject(project, tokenMap))
        .filter((project): project is Project => project !== null);
      if (projects.length === 0 && Object.keys(tokenMap).length === 0) {
        throw new Error('Token catalog is temporarily unavailable');
      }
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
        metadataDegraded: !projectsResponse || projectsResponse.degraded || tokensResult.status === 'rejected' || projectsPayloadMalformed || tokenPayloadMalformed || projects.length !== rawProjects.length || Object.keys(tokenMap).length !== Object.keys(rawTokenMap).length,
        tokens: tokensResult.status === 'fulfilled' ? tokenMap : undefined,
        scope: 'public' as const,
      };
    },
    staleTime: 60_000,
  });
}
