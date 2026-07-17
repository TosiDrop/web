import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Env } from '../../types/env';

const { vmFetch } = vi.hoisted(() => ({ vmFetch: vi.fn() }));
vi.mock('../../services/vmClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/vmClient')>();
  return {
    ...actual,
    vmFetch,
    withCache: async (_req: Request, _ttl: number, fetchFn: () => Promise<unknown>) =>
      new Response(JSON.stringify(await fetchFn()), { status: 200 }),
  };
});

import { onRequestGet } from '../getRewardBreakdown';

type Ctx = Parameters<typeof onRequestGet>[0];

const STAKE = 'stake1' + 'u'.repeat(40);

function ctx(qs: string, env: Partial<Env> = {}): Ctx {
  return {
    request: new Request(`https://x/api/getRewardBreakdown${qs}`, {
      headers: { Origin: 'http://localhost:5173' },
    }),
    env: { VITE_VM_API_KEY: 'k', ...env } as Env,
    waitUntil: vi.fn(),
  } as unknown as Ctx;
}

describe('GET /api/getRewardBreakdown', () => {
  beforeEach(() => {
    vmFetch.mockReset();
    vmFetch.mockResolvedValue({
      rewards: [{ token: 'lovelace', amount: '1000000' }],
      promises: [],
      vending_address: 'addr1x',
      withdrawal_fee: '500000',
    });
  });

  it('400 when staking_address missing', async () => {
    const res = await onRequestGet(ctx(''));
    expect(res.status).toBe(400);
  });

  it('503 network_unavailable when the preview API key is not configured', async () => {
    const res = await onRequestGet(ctx(`?staking_address=${STAKE}`, { VITE_VM_API_KEY: '' }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'network_unavailable' });
  });

  it('503 network_unavailable when requesting mainnet without mainnet config', async () => {
    const res = await onRequestGet(ctx(`?staking_address=${STAKE}&network=mainnet`));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'network_unavailable' });
  });

  it('passes the staking address through to the VM API and returns its payload', async () => {
    const res = await onRequestGet(ctx(`?staking_address=${STAKE}`));
    expect(res.status).toBe(200);
    expect(vmFetch).toHaveBeenCalledWith(
      expect.anything(),
      'preview',
      'get_reward_breakdown',
      { staking_address: STAKE },
    );
    const body = (await res.json()) as { vending_address: string; rewards: unknown[] };
    expect(body.vending_address).toBe('addr1x');
    expect(body.rewards).toHaveLength(1);
  });

  it('maps VM API failures to a 500', async () => {
    vmFetch.mockRejectedValue(new Error('vm down'));
    const res = await onRequestGet(ctx(`?staking_address=${STAKE}`));
    expect(res.status).toBe(500);
  });
});
