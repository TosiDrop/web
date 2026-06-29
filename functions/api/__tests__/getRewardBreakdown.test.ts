import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Env } from '../../types/env';

const sdkBreakdown = vi.fn();
vi.mock('../../services/vmClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/vmClient')>();
  return {
    ...actual,
    initVmSdk: async () => ({ getRewardBreakdown: sdkBreakdown }),
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
    sdkBreakdown.mockReset();
    sdkBreakdown.mockResolvedValue({
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

  it('500 when the API key is not configured', async () => {
    const res = await onRequestGet(ctx(`?staking_address=${STAKE}`, { VITE_VM_API_KEY: '' }));
    expect(res.status).toBe(500);
  });

  it('passes the staking address through to the SDK and returns its payload', async () => {
    const res = await onRequestGet(ctx(`?staking_address=${STAKE}`));
    expect(res.status).toBe(200);
    expect(sdkBreakdown).toHaveBeenCalledWith(STAKE);
    const body = (await res.json()) as { vending_address: string; rewards: unknown[] };
    expect(body.vending_address).toBe('addr1x');
    expect(body.rewards).toHaveLength(1);
  });

  it('maps SDK failures to a 500', async () => {
    sdkBreakdown.mockRejectedValue(new Error('vm down'));
    const res = await onRequestGet(ctx(`?staking_address=${STAKE}`));
    expect(res.status).toBe(500);
  });
});
