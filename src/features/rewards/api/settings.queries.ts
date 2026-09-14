import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { DEPLOYMENT_NETWORK } from '@/config/network';

export interface VmSettings {
  max_assets_in_request: number;
}

export function useVmSettings() {
  return useQuery<VmSettings, Error>({
    queryKey: ['vm-settings', DEPLOYMENT_NETWORK],
    queryFn: () => apiClient.get<VmSettings>('/api/getSettings'),
    staleTime: 60 * 60 * 1000,
  });
}
