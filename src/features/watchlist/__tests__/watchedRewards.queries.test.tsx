import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';
import { bech32 } from 'bech32';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import { useWatchedRewards } from '../api/watchedRewards.queries';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/api/client', () => ({ apiClient: { get } }));
const address = (n: number) => bech32.encode(DEPLOYMENT_NETWORK === 'mainnet' ? 'stake' : 'stake_test', bech32.toWords(Uint8Array.from([DEPLOYMENT_NETWORK === 'mainnet' ? 225 : 224, ...Array<number>(28).fill(n)])), 128);
const setup = () => { const client = new QueryClient(); return { client, wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> }; };

describe('watched wallet reward queries', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });
  it('separates wallet and deployment caches from the signing wallet rewards', async () => {
    const { client, wrapper } = setup();
    const signingRewards = [{ assetId: 'signing.asset', amount: 99 }];
    client.setQueryData(['rewards', address(3)], signingRewards);
    get.mockResolvedValue({ rewards: [{ assetId: 'watched.asset', ticker: 'WATCH', amount: 5 }] });
    const first = renderHook(() => useWatchedRewards(address(1)), { wrapper });
    const second = renderHook(() => useWatchedRewards(address(2)), { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess && second.result.current.isSuccess).toBe(true));
    expect(client.getQueryData(['watched-wallet-rewards', DEPLOYMENT_NETWORK, address(1)])).toEqual(first.result.current.data);
    expect(client.getQueryData(['watched-wallet-rewards', DEPLOYMENT_NETWORK, address(2)])).toEqual(second.result.current.data);
    expect(client.getQueryData(['rewards', address(3)])).toBe(signingRewards);
    expect(get).toHaveBeenCalledTimes(2);
  });
  it('does not query an invalid or disabled wallet', () => {
    const { wrapper } = setup();
    renderHook(() => useWatchedRewards('stake_test1typo'), { wrapper });
    renderHook(() => useWatchedRewards(address(1), false), { wrapper });
    expect(get).not.toHaveBeenCalled();
  });
  it('rejects malformed reward data instead of presenting an empty wallet', async () => {
    const { wrapper } = setup();
    get.mockResolvedValue({ rewards: [{ assetId: 'broken', amount: '20' }] });
    const result = renderHook(() => useWatchedRewards(address(1)), { wrapper });
    await waitFor(() => expect(result.result.current.isError).toBe(true), { timeout: 3000 });
    expect(result.result.current.data).toBeUndefined();
  });
});
