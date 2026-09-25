import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../types/env';
import { PREVIEW_STAKE } from '../../../src/shared/__tests__/stakeAddresses';
import { onRequestGet } from '../wallet/summary';

type Ctx = Parameters<typeof onRequestGet>[0];

const fetchMock = vi.fn();

function ctx(query: string, env: Partial<Env> = {}): Ctx {
  return {
    request: new Request(`https://x/api/wallet/summary?${query}`),
    env: { VITE_VM_API_KEY: 'k', ...env } as Env,
    waitUntil: () => {},
  } as unknown as Ctx;
}

describe('GET /api/wallet/summary', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects malformed staking addresses before querying Koios', async () => {
    const response = await onRequestGet(ctx('staking_address=not-an-address'));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('combines account, holdings, rewards, and metadata from a configured Koios endpoint', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/account_info')) {
        return new Response(JSON.stringify([{
          total_balance: '1234567',
          rewards_available: '42',
          delegated_pool: 'pool1abc',
          status: 'registered',
        }]));
      }
      if (url.endsWith('/account_assets')) {
        return new Response(JSON.stringify([{
          asset_policy: 'policy',
          asset_name: 'name',
          quantity: '2500',
        }]));
      }
      if (url.endsWith('/account_rewards')) {
        return new Response(JSON.stringify([{ earned_epoch: 500, amount: '99', pool_id: 'pool1abc', type: 'member' }]));
      }
      if (url.endsWith('/asset_info')) {
        return new Response(JSON.stringify([{
          asset_policy: 'policy',
          asset_name: 'name',
          asset_name_ascii: 'Example Token',
          decimals: 2,
          token_registry_metadata: { ticker: 'EX' },
        }]));
      }
      throw new Error(`unexpected URL: ${url}`);
    });

    const response = await onRequestGet(ctx(
      `staking_address=${PREVIEW_STAKE}`,
      {
        KOIOS_BASE_URL_PREVIEW: 'https://koios.internal',
        KOIOS_API_KEY_PREVIEW: 'secret-test-key',
      },
    ));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      network: 'preview',
      balance: { accountLovelace: '1234567', rewardsAvailableLovelace: '42' },
      delegation: { poolId: 'pool1abc', registered: true },
      rewards: { totalLovelace: '99' },
      holdings: [{ unit: 'policyname', quantity: '2500', ticker: 'EX', decimals: 2 }],
      metadata: { returned: 1, total: 1, complete: true },
      sources: { account: true, assets: true, rewards: true },
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls.every(([url, init]) =>
      url.startsWith('https://koios.internal/api/v1/') &&
      (init as RequestInit).headers &&
      ((init as RequestInit).headers as Record<string, string>).Authorization === 'Bearer secret-test-key',
    )).toBe(true);
  });

  it('marks missing Koios account data unknown instead of presenting zero balance', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/account_info')) return new Response('down', { status: 503 });
      return new Response('[]');
    });
    const response = await onRequestGet(ctx(`staking_address=${PREVIEW_STAKE}`));
    const body = await response.json() as Record<string, unknown>;
    expect(body).toMatchObject({
      degraded: true,
      sources: { account: false, assets: true, rewards: true },
      balance: { accountLovelace: null, utxoLovelace: null, rewardsAvailableLovelace: null },
    });
  });

  it('keeps assets whose Cardano asset name is empty', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/account_assets')) return new Response(JSON.stringify([
        { asset_policy: 'policy', asset_name: '', quantity: '1' },
      ]));
      return new Response('[]');
    });
    const response = await onRequestGet(ctx(`staking_address=${PREVIEW_STAKE}`));
    const body = await response.json() as { holdings: Array<{ unit: string }> };
    expect(body.holdings).toEqual([expect.objectContaining({ unit: 'policy' })]);
  });
});
