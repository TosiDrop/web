import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNetworks } from '@/features/preferences/api/networks.queries';

afterEach(() => vi.unstubAllGlobals());

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useNetworks', () => {
  it('returns the availability map', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ networks: { mainnet: false, preview: true } }), { status: 200 }),
      ),
    );
    const { result } = renderHook(() => useNetworks(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual({ mainnet: false, preview: true }));
  });
});
