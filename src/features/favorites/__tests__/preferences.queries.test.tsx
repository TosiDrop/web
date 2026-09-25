import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getMock = vi.fn();
const postMock = vi.fn();
vi.mock('@/api/client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
  },
}));

import { usePreferencesQuery, useSavePreferencesMutation } from '../api/preferences.queries';

const stakeAddress = 'stake_test1preferences';
const favorites = [{ assetId: 'policy.token', ticker: 'TOK', logo: '' }];

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('preferences persistence', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it('does not treat a missing database as an empty saved list', async () => {
    getMock.mockResolvedValue({ favorites: [], dislikes: [], degraded: true });
    const { result } = renderHook(() => usePreferencesQuery(stakeAddress), { wrapper });
    await waitFor(() => expect(result.current.error?.message).toMatch(/unavailable/i));
  });

  it('does not report a degraded write as saved', async () => {
    postMock.mockResolvedValue({ success: true, degraded: true });
    const { result } = renderHook(() => useSavePreferencesMutation(), { wrapper });
    await expect(result.current.mutateAsync({
      stakeAddress, favorites, dislikes: [], signature: 's', key: 'k', message: 'm',
    })).rejects.toThrow(/unavailable/i);
  });
});
