import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface NetworksResponse {
  networks: { mainnet: boolean; preview: boolean };
}

export function useNetworks() {
  return useQuery<{ mainnet: boolean; preview: boolean }, Error>({
    queryKey: ['networks'],
    queryFn: async () => (await apiClient.get<NetworksResponse>('/api/networks')).networks,
    staleTime: 5 * 60_000,
  });
}
