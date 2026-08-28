import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequestGet } from '../resolveHandle';
import type { Env } from '../../types/env';

type Ctx = Parameters<typeof onRequestGet>[0];

function context(network: string | undefined, requestNetwork?: string): Ctx {
  const suffix = requestNetwork ? `&network=${requestNetwork}` : '';
  return {
    request: new Request(`https://x/api/resolveHandle?handle=tosi${suffix}`, {
      headers: { Origin: 'http://localhost:5173' },
    }),
    env: {
      VITE_NETWORK: network,
      VITE_VM_API_KEY: 'k',
    } as Env,
  } as unknown as Ctx;
}

function stubKoios() {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify([{ payment_address: 'addr_test1payment' }]), {
        status: 200,
      }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify([{ stake_address: 'stake_test1resolved' }]), {
        status: 200,
      }),
    );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GET /api/resolveHandle deployment network', () => {
  it('uses Preview Koios and ignores a caller-supplied Mainnet query parameter', async () => {
    const fetchMock = stubKoios();

    const res = await onRequestGet(context('preview', 'mainnet'));

    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://preview.koios.rest/api/v1/asset_nft_address',
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://preview.koios.rest/api/v1/address_info',
    );
  });

  it('uses Mainnet Koios for a Mainnet deployment', async () => {
    const fetchMock = stubKoios();

    const res = await onRequestGet(context('mainnet'));

    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.koios.rest/api/v1/asset_nft_address',
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://api.koios.rest/api/v1/address_info',
    );
  });
});
