import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../types/env';

vi.mock('../../services/vmClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/vmClient')>();
  return {
    ...actual,
    // Bypass the Cache API: always a miss, return the payload directly.
    withCache: async (_req: Request, _env: Env, _ttl: number, fetchFn: () => Promise<unknown>) =>
      new Response(JSON.stringify(await fetchFn()), { status: 200 }),
  };
});

import { onRequestGet } from '../delegation';
import { MAINNET_STAKE, PREVIEW_STAKE } from '../../../src/shared/__tests__/stakeAddresses';

type Ctx = Parameters<typeof onRequestGet>[0];

// The deployment under test is preview unless VITE_NETWORK says otherwise.
const STAKE = PREVIEW_STAKE;
const MAINNET = { VITE_NETWORK: 'mainnet', VM_BASE_URL: 'https://vm.example' };
const fetchMock = vi.fn();

function ctx(query: string, env: Partial<Env> = {}): Ctx {
  return {
    request: new Request(`https://x/api/delegation?${query}`, {
      headers: { Origin: 'http://localhost:5173' },
    }),
    env: { VITE_VM_API_KEY: 'k', ...env } as Env,
    waitUntil: () => {},
  } as unknown as Ctx;
}

describe('GET /api/delegation', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('400 for a missing, malformed, or badly checksummed address, before Koios is called', async () => {
    expect((await onRequestGet(ctx(''))).status).toBe(400);
    expect((await onRequestGet(ctx('staking_address=addr1x'))).status).toBe(400);
    expect((await onRequestGet(ctx('staking_address=stake_test1' + 'q'.repeat(53)))).status).toBe(400);
    expect((await onRequestGet(ctx(`staking_address=${STAKE.slice(0, -1)}q`))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('400 for the other network\'s address, naming the mismatch', async () => {
    const onPreview = await onRequestGet(ctx(`staking_address=${MAINNET_STAKE}`));
    expect(onPreview.status).toBe(400);
    expect(((await onPreview.json()) as { error: string }).error).toContain('Mainnet stake address');

    const onMainnet = await onRequestGet(ctx(`staking_address=${PREVIEW_STAKE}`, MAINNET));
    expect(onMainnet.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the pool the account currently delegates to', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([{ stake_address: STAKE, status: 'registered', delegated_pool: 'pool1abc' }])),
    );

    const res = await onRequestGet(ctx(`staking_address=${STAKE}`));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ poolId: 'pool1abc', registered: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://preview.koios.rest/api/v1/account_info');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ _stake_addresses: [STAKE] });
  });

  it('uses the mainnet Koios instance for a mainnet deployment', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([])));

    await onRequestGet(ctx(`staking_address=${MAINNET_STAKE}`, MAINNET));

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.koios.rest/api/v1/account_info');
  });

  it('distinguishes no delegation from an unknown account', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([{ stake_address: STAKE, status: 'not registered', delegated_pool: null }])),
    );

    const res = await onRequestGet(ctx(`staking_address=${STAKE}`));

    expect(await res.json()).toEqual({ poolId: null, registered: false });
  });

  it('502 when Koios fails, never a silent null', async () => {
    fetchMock.mockResolvedValue(new Response('down', { status: 503 }));

    const res = await onRequestGet(ctx(`staking_address=${STAKE}`));

    expect(res.status).toBe(502);
  });
});
