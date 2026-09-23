import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import { canonicalPoolId, isProjectIdentifier, type GetPoolsResponse } from '@/features/rewards/api/pools.queries';

export interface TeamPool {
  poolId: string;
  ticker: string;
  name: string;
  logo?: string;
  description?: string | null;
  partner: boolean;
}

export function poolExplorerUrl(poolId: string): string {
  return `https://cexplorer.io/pool/${encodeURIComponent(poolId)}`;
}

export function normalizePartnerPoolIds(raw: unknown): Set<string> {
  return new Set(
    Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string' && id.length > 0) : [],
  );
}

export function usePartnerPools() {
  return useQuery<TeamPool[], Error>({
    queryKey: ['partner-pools', DEPLOYMENT_NETWORK],
    staleTime: 300_000,
    queryFn: async () => {
      const [pools, partnerPoolIds] = await Promise.all([
        apiClient.get<GetPoolsResponse>('/api/getPools'),
        apiClient.get<string[]>('/api/getPartnerPools'),
      ]);
      const allowed = normalizePartnerPoolIds(partnerPoolIds);
      const configured = [...allowed].map(canonicalPoolId);
      return Object.entries(pools ?? {})
        .filter(([key, pool]) => {
          if (isProjectIdentifier(key) || isProjectIdentifier(pool?.id ?? '')) return false;
          return configured.includes(canonicalPoolId(key)) || configured.includes(canonicalPoolId(pool?.id ?? ''));
        })
        .map(([key, pool]) => ({
          poolId: pool?.id || key,
          ticker: pool?.ticker ?? '',
          name: pool?.name ?? '',
          logo: pool?.logo || undefined,
          description: pool?.description ?? null,
          partner: true,
        }));
    },
  });
}

export function useParticipatingPools() {
  return useQuery<TeamPool[], Error>({
    queryKey: ['participating-pools', DEPLOYMENT_NETWORK],
    staleTime: 300_000,
    queryFn: async () => {
      const [pools, partnerPoolIds] = await Promise.all([
        apiClient.get<GetPoolsResponse>('/api/getPools'),
        apiClient.get<string[]>('/api/getPartnerPools').catch(() => []),
      ]);
      const partners = new Set(partnerPoolIds.map(canonicalPoolId));
      return Object.entries(pools ?? {})
        .filter(([key, pool]) => !isProjectIdentifier(key) && !isProjectIdentifier(pool?.id ?? ''))
        .map(([key, pool]) => {
          const poolId = pool?.id || key;
          return {
            poolId,
            ticker: pool?.ticker ?? '',
            name: pool?.name ?? '',
            logo: pool?.logo || undefined,
            description: pool?.description ?? null,
            partner: partners.has(canonicalPoolId(key)) || partners.has(canonicalPoolId(poolId)),
          };
        });
    },
  });
}
