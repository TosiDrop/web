import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getMock = vi.fn();
vi.mock('@/api/client', () => ({
  apiClient: { get: (...args: unknown[]) => getMock(...args) },
}));

import { usePersonalAnalytics } from '../hooks/usePersonalAnalytics';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const STAKE = 'stake_test1' + 'x'.repeat(40);

const RAW = {
  degraded: false,
  feesUnavailable: true,
  summary: {
    totalClaims: 2,
    distinctTokens: 1,
    totalFeesLovelace: '0',
    activeSince: 1_750_000_000,
  },
  claimsByMonth: [{ month: '2026-06', claims: 2 }],
  rewardsByMonth: [
    { month: '2026-06', token: 'lovelace', amount: '3000000' },
  ],
  tokenMix: [{ token: 'lovelace', rewards: 2 }],
};

describe('usePersonalAnalytics', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('does not request analytics without a stake address', () => {
    renderHook(() => usePersonalAnalytics(null), { wrapper });
    expect(getMock).not.toHaveBeenCalled();
  });

  it('loads aggregates and token metadata into a display model', async () => {
    getMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/personalAnalytics')) {
        return Promise.resolve(RAW);
      }
      return Promise.resolve({ lovelace: { ticker: 'ADA', decimals: 6 } });
    });

    const { result } = renderHook(() => usePersonalAnalytics(STAKE), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(getMock).toHaveBeenCalledWith(
      `/api/personalAnalytics?staking_address=${encodeURIComponent(STAKE)}`,
    );
    expect(getMock).toHaveBeenCalledWith('/api/getTokens');
    expect(result.current.data!.summary.totalClaims).toBe(2);
    expect(result.current.data!.seriesByToken.lovelace.points[0].cumulative).toBe(3);
    expect(result.current.data!.feesUnavailable).toBe(true);
  });
});
