import { useQuery } from '@tanstack/react-query';
import { bech32 } from 'bech32';
import { apiClient } from '@/api/client';
import { DEPLOYMENT_NETWORK } from '@/config/network';

export interface Pool {
  id: string;
  ticker: string;
  name: string;
  enabled: string;
  logo: string;
  description?: string | null;
  delegator_count?: string;
}

export type GetPoolsResponse = Record<string, Pool>;

/** VM attribution IDs are not all stake pools; project distributions use these prefixes. */
export function isProjectIdentifier(id: string): boolean {
  const normalized = id.trim().toLowerCase();
  return normalized.startsWith('project_') || normalized.startsWith('p_');
}

export function projectIdentifierLabel(id: string): string {
  return id.replace(/^(?:project_|p_)/i, '') || 'project';
}

/** The VM returns hex pool keys while configuration uses bech32 pool IDs. */
export function canonicalPoolId(id: string): string {
  try {
    const decoded = bech32.decode(id, 100);
    if (decoded.prefix === 'pool') {
      return Array.from(bech32.fromWords(decoded.words), (byte) => byte.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // Hex VM identifiers are already canonical.
  }
  return id.toLowerCase();
}

export function usePools() {
  return useQuery<GetPoolsResponse, Error>({
    queryKey: ['pools', DEPLOYMENT_NETWORK],
    queryFn: () => apiClient.get<GetPoolsResponse>('/api/getPools'),
    staleTime: 60 * 60 * 1000,
  });
}

export function usePartnerPoolIds() {
  return useQuery<string[], Error>({
    queryKey: ['partner-pool-ids', DEPLOYMENT_NETWORK],
    queryFn: () => apiClient.get<string[]>('/api/getPartnerPools'),
    staleTime: 5 * 60 * 1000,
  });
}
