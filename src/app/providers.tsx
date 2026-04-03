import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MeshProvider } from '@meshsdk/react';
import { queryClient } from '@/api/queryClient';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <MeshProvider>
        {children}
      </MeshProvider>
    </QueryClientProvider>
  );
}
