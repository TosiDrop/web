import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const getMock = vi.fn();
vi.mock('@/api/client', () => ({
  apiClient: { get: (...a: unknown[]) => getMock(...a) },
}));

import { useRewardBreakdown } from '../hooks/useRewardBreakdown';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const STAKE = 'stake1' + 'u'.repeat(40);

describe('useRewardBreakdown', () => {
  // Block body on purpose: beforeEach treats a returned function as a
  // teardown hook, and mockReset() returns the mock itself.
  beforeEach(() => {
    getMock.mockReset();
  });

  it('is disabled without a stake address', () => {
    renderHook(() => useRewardBreakdown(null), { wrapper });
    expect(getMock).not.toHaveBeenCalled();
  });

  it('groups normalized entries by token with totals', async () => {
    getMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/getRewardBreakdown')) {
        return Promise.resolve({
          rewards: [
            { token: 'lovelace', amount: '1000000', epoch: 500, pool: 'TOSI', rule: 'delegator' },
            { token: 'lovelace', amount: '2000000', epoch: 501, pool: 'TOSI', rule: 'delegator' },
          ],
          promises: [{ token: 'lovelace', amount: '500000', rule: 'fixed' }],
        });
      }
      return Promise.resolve({});
    });
    const { result } = renderHook(() => useRewardBreakdown(STAKE), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toHaveLength(1);
    const group = result.current.data![0];
    expect(group.ticker).toBe('ADA');
    expect(group.total).toBeCloseTo(3.5);
    expect(group.entries).toHaveLength(3);
    expect(group.entries[2].kind).toBe('promise');
  });
});
