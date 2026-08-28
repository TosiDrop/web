import type { ReactNode } from 'react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getMock = vi.fn();
vi.mock('@/api/client', () => ({
  apiClient: { get: (...args: unknown[]) => getMock(...args) },
}));

import { useDelegatedPool } from '../hooks/useDelegatedPool';

// One client per test: a client created inside the wrapper is rebuilt on every
// render, which orphans an in-flight rejected query as an unhandled rejection.
let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client }, children);
}

const STAKE = 'stake1' + 'u'.repeat(48);

describe('useDelegatedPool', () => {
  beforeEach(() => {
    getMock.mockReset();
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('does nothing without a stake address', () => {
    const { result } = renderHook(() => useDelegatedPool(null), { wrapper });
    expect(getMock).not.toHaveBeenCalled();
    expect(result.current.poolId).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('returns the pool from the delegation endpoint', async () => {
    getMock.mockResolvedValue({ poolId: 'pool1abc', registered: true });
    const { result } = renderHook(() => useDelegatedPool(STAKE), { wrapper });

    await waitFor(() => expect(result.current.poolId).toBe('pool1abc'));
    expect(getMock).toHaveBeenCalledWith(`/api/delegation?staking_address=${STAKE}`);
    expect(result.current.error).toBeNull();
  });

  it('reports a confirmed non-delegating account as null without error', async () => {
    getMock.mockResolvedValue({ poolId: null, registered: false });
    const { result } = renderHook(() => useDelegatedPool(STAKE), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.poolId).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('propagates a failed lookup instead of pretending there is no pool', async () => {
    getMock.mockRejectedValue(new Error('Failed to look up delegation'));
    const { result } = renderHook(() => useDelegatedPool(STAKE), { wrapper });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe('Failed to look up delegation');
    expect(result.current.poolId).toBeNull();
  });

  it('refetch retries a failed lookup and clears the error on success', async () => {
    getMock.mockRejectedValueOnce(new Error('Koios blip'));
    const { result } = renderHook(() => useDelegatedPool(STAKE), { wrapper });
    await waitFor(() => expect(result.current.error).not.toBeNull());

    getMock.mockResolvedValueOnce({ poolId: 'pool1new', registered: true });
    await result.current.refetch();

    await waitFor(() => expect(result.current.poolId).toBe('pool1new'));
    expect(result.current.error).toBeNull();
    expect(getMock).toHaveBeenCalledTimes(2);
  });
});
