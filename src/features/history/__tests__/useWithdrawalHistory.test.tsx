import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const getMock = vi.fn();
vi.mock('@/api/client', () => ({
  apiClient: { get: (...a: unknown[]) => getMock(...a) },
}));

import { useWithdrawalHistory } from '../hooks/useWithdrawalHistory';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const STAKE = 'stake1' + 'u'.repeat(40);

describe('useWithdrawalHistory', () => {
  // Block body on purpose: beforeEach treats a returned function as a
  // teardown hook, and mockReset() returns the mock itself.
  beforeEach(() => {
    getMock.mockReset();
  });

  it('is disabled without a stake address', () => {
    const { result } = renderHook(() => useWithdrawalHistory(null, 1, 'desc'), { wrapper });
    expect(result.current.isPending).toBe(true);
    expect(getMock).not.toHaveBeenCalled();
  });

  it('joins history items with token metadata and scales amounts', async () => {
    getMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/history')) {
        return Promise.resolve({
          items: [{
            rewardId: 'r1', token: 'lovelace', amount: '1500000', epoch: 500,
            deliveredOn: '1750000000', deliveredAt: 1750000000, withdrawalRequest: 'w1',
          }],
          page: 1, limit: 50, total: 120, hasMore: true,
        });
      }
      return Promise.resolve({}); // /api/getTokens
    });
    const { result } = renderHook(() => useWithdrawalHistory(STAKE, 1, 'desc'), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.total).toBe(120);
    expect(result.current.data!.hasMore).toBe(true);
    const row = result.current.data!.rows[0];
    expect(row.ticker).toBe('ADA');
    expect(row.amount).toBeCloseTo(1.5);
    expect(row.epoch).toBe(500);
    expect(row.deliveredOn?.getTime()).toBe(1750000000 * 1000);
  });

  it('propagates the degraded flag', async () => {
    getMock.mockImplementation((url: string) =>
      url.startsWith('/api/history')
        ? Promise.resolve({ items: [], page: 1, limit: 50, total: 0, hasMore: false, degraded: true })
        : Promise.resolve({}),
    );
    const { result } = renderHook(() => useWithdrawalHistory(STAKE, 1, 'desc'), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.degraded).toBe(true);
  });
});
