import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/api/client';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch() {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), { status: 200 }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('apiClient deployment-fixed routing', () => {
  it('leaves bare URLs unchanged', async () => {
    const fetchMock = stubFetch();
    await apiClient.get('/api/getPools');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/getPools');
  });

  it('preserves existing query strings without adding a network', async () => {
    const fetchMock = stubFetch();
    await apiClient.get('/api/getRewards?walletId=stake1x');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/getRewards?walletId=stake1x');
  });

  it('leaves POST URLs unchanged', async () => {
    const fetchMock = stubFetch();
    await apiClient.post('/api/getCustomRewards', { a: 1 });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/getCustomRewards');
  });
});
