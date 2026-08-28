import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { decodeStakeAuth, parseProjectListMessage } from '@/shared/projects';

const getMock = vi.fn();
vi.mock('@/api/client', () => ({
  apiClient: { get: (...args: unknown[]) => getMock(...args) },
}));

const signData = vi.fn();
const walletMock = vi.fn();
vi.mock('@meshsdk/react', () => ({ useWallet: () => walletMock() }));

import { useOwnerProjects } from '../api/projects.queries';
import { forgetProjectListAuth } from '../utils/signProjectList';

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const STAKE = 'stake_test1' + 'u'.repeat(40);

describe('useOwnerProjects', () => {
  beforeEach(() => {
    getMock.mockReset();
    signData.mockReset();
    signData.mockResolvedValue({ signature: 'sig', key: 'key' });
    walletMock.mockReturnValue({ wallet: { signData }, connected: true });
    forgetProjectListAuth();
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    getMock.mockResolvedValue({ projects: [], degraded: false, scope: 'owner' });
  });

  it('signs a list message for the owner and sends it as Authorization', async () => {
    const { result } = renderHook(() => useOwnerProjects(STAKE), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(signData).toHaveBeenCalledTimes(1);
    const [url, init] = getMock.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(url).toBe(`/api/projects?owner=${encodeURIComponent(STAKE)}`);
    const auth = decodeStakeAuth(init.headers.Authorization)!;
    expect(auth).toMatchObject({ signature: 'sig', key: 'key' });
    expect(parseProjectListMessage(auth.message)).toMatchObject({ network: 'preview', stakeAddress: STAKE });
    expect(result.current.data!.scope).toBe('owner');
  });

  it('reuses the signature on refetch instead of prompting the wallet again', async () => {
    const { result } = renderHook(() => useOwnerProjects(STAKE), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());

    await result.current.refetch();

    expect(getMock).toHaveBeenCalledTimes(2);
    expect(signData).toHaveBeenCalledTimes(1);
  });

  it('does not read without a connected wallet to sign with', () => {
    walletMock.mockReturnValue({ wallet: null, connected: false });
    renderHook(() => useOwnerProjects(STAKE), { wrapper });
    expect(getMock).not.toHaveBeenCalled();
    expect(signData).not.toHaveBeenCalled();
  });
});
