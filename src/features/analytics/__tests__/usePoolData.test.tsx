import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getMock = vi.fn();
vi.mock('@/api/client', () => ({
  apiClient: { get: (...args: unknown[]) => getMock(...args) },
}));

import { usePoolData } from '../hooks/usePoolData';

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const POOLS = { pool1a: { id: 'pool1a', ticker: 'AAA', name: 'Pool A', enabled: 't', logo: '' } };

describe('usePoolData', () => {
  beforeEach(() => {
    getMock.mockReset();
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('keeps pool and distribution data when an optional source fails', async () => {
    getMock.mockImplementation((url: string) => {
      if (url === '/api/getPools') return Promise.resolve(POOLS);
      if (url === '/api/getDistributions') return Promise.resolve({});
      if (url === '/api/getStatistics') return Promise.reject(new Error('stats down'));
      if (url === '/api/getWhitelist') return Promise.resolve({ main: ['pool1a'] });
      return Promise.resolve({});
    });

    const { result } = renderHook(() => usePoolData(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.error).toBeNull();
    expect(result.current.data!.unavailable).toEqual(['statistics']);
    expect(result.current.data!.rows[0]).toMatchObject({
      poolId: 'pool1a',
      whitelisted: true,
      withdrawals: null,
      collectedFeesAda: null,
    });
  });

  it('still fails when a required source fails', async () => {
    getMock.mockImplementation((url: string) =>
      url === '/api/getPools' ? Promise.reject(new Error('pools down')) : Promise.resolve({}),
    );

    const { result } = renderHook(() => usePoolData(), { wrapper });
    await waitFor(() => expect(result.current.error).not.toBeNull());

    expect(result.current.error?.message).toBe('pools down');
  });
});
