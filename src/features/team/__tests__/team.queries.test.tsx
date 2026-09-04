import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const getMock = vi.fn();
vi.mock('@/api/client', () => ({
  apiClient: { get: (...a: unknown[]) => getMock(...a) },
}));

import { normalizePartnerPoolIds, usePartnerPools } from '../api/team.queries';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('normalizePartnerPoolIds', () => {
  it('normalizes a list of pool IDs', () => {
    expect([...normalizePartnerPoolIds(['p1', 'p2', 'p2'])]).toEqual(['p1', 'p2']);
  });

  it('tolerates null and garbage values', () => {
    expect(normalizePartnerPoolIds(null).size).toBe(0);
    expect(normalizePartnerPoolIds(undefined).size).toBe(0);
    expect(normalizePartnerPoolIds([42, ''] as never).size).toBe(0);
  });
});

describe('usePartnerPools', () => {
  // Block body on purpose: beforeEach treats a returned function as a
  // teardown hook, and mockReset() returns the mock itself.
  beforeEach(() => {
    getMock.mockReset();
  });

  it('returns only configured partner pools, joined by map key or pool id', async () => {
    getMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/getPools')) {
        return Promise.resolve({
          pool1abc: { id: 'pool1abc', ticker: 'TOSI', name: 'Tosi Pool', enabled: '1', logo: 'http://l/t' },
          pool1xyz: { id: 'pool1xyz', ticker: 'NOPE', name: 'Other', enabled: '1', logo: '' },
        });
      }
      return Promise.resolve(['pool1abc']);
    });
    const { result } = renderHook(() => usePartnerPools(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toEqual([
      { poolId: 'pool1abc', ticker: 'TOSI', name: 'Tosi Pool', logo: 'http://l/t', description: null },
    ]);
  });
});
