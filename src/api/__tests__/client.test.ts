import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/api/client';
import { useNetworkStore } from '@/store/network-state';

afterEach(() => {
  vi.unstubAllGlobals();
  useNetworkStore.setState({ selectedNetwork: 'mainnet' });
});

function stubFetch() {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), { status: 200 }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('apiClient network param', () => {
  it('appends network to bare URLs', async () => {
    const fetchMock = stubFetch();
    useNetworkStore.setState({ selectedNetwork: 'preview' });
    await apiClient.get('/api/getPools');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/getPools?network=preview');
  });

  it('appends with & when a query string exists', async () => {
    const fetchMock = stubFetch();
    useNetworkStore.setState({ selectedNetwork: 'mainnet' });
    await apiClient.get('/api/getRewards?walletId=stake1x');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/getRewards?walletId=stake1x&network=mainnet');
  });

  it('appends on POST too', async () => {
    const fetchMock = stubFetch();
    useNetworkStore.setState({ selectedNetwork: 'preview' });
    await apiClient.post('/api/getCustomRewards', { a: 1 });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/getCustomRewards?network=preview');
  });
});
