import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { DEPLOYMENT_NETWORK } from '@/config/network';

export interface PlatformAudienceData {
  degraded: boolean;
  summary: {
    claimingWallets: number;
    claims: number;
    returningWallets: number;
  } | null;
  months: Array<{ month: string; claimingWallets: number; claims: number }>;
}

export function usePlatformAudience() {
  return useQuery<PlatformAudienceData, Error>({
    queryKey: ['platform-audience', DEPLOYMENT_NETWORK],
    queryFn: () => apiClient.get<PlatformAudienceData>('/api/platformAnalytics'),
    staleTime: 60_000,
  });
}
