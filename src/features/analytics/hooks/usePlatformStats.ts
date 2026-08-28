import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { DEPLOYMENT_NETWORK } from '@/config/network';

export interface PlatformStats {
  backend_up: boolean;
  ntds_up: boolean;
  pending_tx: number;
  pending_rewards: number;
  pending_promises: number;
  tracked_stake: number;
  tracked_delegators: number;
  delivered_rewards: number;
  pending_withdrawals: number;
  processed_withdrawals: number;
  failed_withdrawals: number;
  uptime: string;
  uptime_ntds: string;
  epoch: number;
}

export function usePlatformStats() {
  return useQuery<PlatformStats, Error>({
    queryKey: ['platform-stats', DEPLOYMENT_NETWORK],
    queryFn: () => apiClient.get<PlatformStats>('/api/getSystemInfo'),
    staleTime: 5 * 60_000,
  });
}
