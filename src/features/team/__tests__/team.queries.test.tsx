import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const getMock = vi.fn();
vi.mock('@/api/client', () => ({
  apiClient: { get: (...a: unknown[]) => getMock(...a) },
}));

import { flattenWhitelist, useWhitelistedPools } from '../api/team.queries';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('flattenWhitelist', () => {
  it('unions ids across keys', () => {
    const set = flattenWhitelist({ a: ['p1', 'p2'], b: ['p2', 'p3'] });
    expect([...set].sort()).toEqual(['p1', 'p2', 'p3']);
  });

  it('tolerates null and garbage values', () => {
    expect(flattenWhitelist(null).size).toBe(0);
    expect(flattenWhitelist(undefined).size).toBe(0);
    expect(flattenWhitelist({ a: 'nope', b: [42, ''] } as never).size).toBe(0);
  });
});

describe('useWhitelistedPools', () => {
  // Block body on purpose: beforeEach treats a returned function as a
  // teardown hook, and mockReset() returns the mock itself.
  beforeEach(() => {
    getMock.mockReset();
  });

  it('returns only whitelisted pools, joined by map key or pool id', async () => {
    getMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/getPools')) {
        return Promise.resolve({
          pool1abc: { id: 'pool1abc', ticker: 'TOSI', name: 'Tosi Pool', enabled: '1', logo: 'http://l/t' },
          pool1xyz: { id: 'pool1xyz', ticker: 'NOPE', name: 'Other', enabled: '1', logo: '' },
        });
      }
      return Promise.resolve({ tosi: ['pool1abc'] });
    });
    const { result } = renderHook(() => useWhitelistedPools(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toEqual([
      { poolId: 'pool1abc', ticker: 'TOSI', name: 'Tosi Pool', logo: 'http://l/t', description: null },
    ]);
  });
});
