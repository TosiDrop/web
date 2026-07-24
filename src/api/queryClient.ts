import { QueryClient } from '@tanstack/react-query';
import { useNetworkStore } from '@/store/network-state';
import { useClaimStore } from '@/store/claim-state';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

useNetworkStore.subscribe((state, prev) => {
  if (state.selectedNetwork === prev.selectedNetwork) return;
  const claim = useClaimStore.getState();
  claim.reset();
  claim.setLookupAddress(null);
  queryClient.clear();
});
