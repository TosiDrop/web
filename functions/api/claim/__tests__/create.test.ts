import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Env } from '../../../types/env';

const { vmFetch } = vi.hoisted(() => ({ vmFetch: vi.fn() }));
vi.mock('../../../services/vmClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../services/vmClient')>();
  return { ...actual, vmFetch };
});

import { onRequestPost } from '../create';

type CFContext = Parameters<typeof onRequestPost>[0];

function makeContext(body: unknown, env?: Partial<Env>): CFContext {
  const request = new Request('https://example.com/api/claim/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
    body: JSON.stringify(body),
  });
  return {
    request,
    env: { VITE_VM_API_KEY: 'test-key', ...env } as Env,
    params: {},
    waitUntil: () => {},
    next: async () => new Response(),
    data: {},
    passThroughOnException: () => {},
  } as unknown as CFContext;
}

function fakeDb(options: { fail?: boolean } = {}) {
  const bind = vi.fn();
  const run = options.fail
    ? vi.fn().mockRejectedValue(new Error('D1 unavailable'))
    : vi.fn().mockResolvedValue({ success: true });
  const prepare = vi.fn(() => ({
    bind: (...values: unknown[]) => {
      bind(...values);
      return { run };
    },
  }));
  return {
    db: { prepare } as unknown as D1Database,
    bind,
    run,
  };
}

describe('POST /api/claim/create', () => {
  beforeEach(() => {
    vmFetch.mockReset();
  });

  it('maps SDK response to camelCase and uses session_id = stake[:40]', async () => {
    const stake = 'stake_test1' + 'x'.repeat(50);
    vmFetch.mockResolvedValueOnce({
      request_id: 99,
      deposit: 5_000_000,
      overhead_fee: 200_000,
      withdrawal_address: 'addr1abc',
      is_whitelisted: true,
    });

    const res = await onRequestPost(
      makeContext({ stakeAddress: stake, assetIds: ['a1', 'a2'] }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      requestId: '99',
      deposit: 5_000_000,
      overheadFee: 200_000,
      withdrawalAddress: 'addr1abc',
      isWhitelisted: true,
    });
    const [, , action, params] = vmFetch.mock.calls[0];
    expect(action).toBe('custom_request');
    expect(params.staking_address).toBe(stake);
    expect(params.session_id).toBe(stake.slice(0, 40));
    expect(params.selected).toBe('a1,a2');
  });

  it('returns 400 when stakeAddress is missing or wrong prefix', async () => {
    const res = await onRequestPost(makeContext({ stakeAddress: 'addr1xyz', assetIds: ['a'] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when assetIds is empty', async () => {
    const res = await onRequestPost(
      makeContext({ stakeAddress: 'stake_test1x', assetIds: [] }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when assetIds contains non-string entries', async () => {
    const res = await onRequestPost(
      makeContext({ stakeAddress: 'stake_test1x', assetIds: ['a', 5] }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when overheadFee is not a number', async () => {
    const res = await onRequestPost(
      makeContext({ stakeAddress: 'stake_test1x', assetIds: ['a'], overheadFee: '10' }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when unlocksSpecial is not a boolean', async () => {
    const res = await onRequestPost(
      makeContext({ stakeAddress: 'stake_test1x', assetIds: ['a'], unlocksSpecial: 1 }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 503 network_unavailable when the preview API key is missing', async () => {
    const res = await onRequestPost(
      makeContext(
        { stakeAddress: 'stake_test1x', assetIds: ['a'] },
        { VITE_VM_API_KEY: '' },
      ),
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'network_unavailable' });
  });

  it('returns 502 when the VM API throws', async () => {
    vmFetch.mockRejectedValueOnce(new Error('upstream down'));
    const res = await onRequestPost(
      makeContext({ stakeAddress: 'stake_test1x', assetIds: ['a'] }),
    );
    expect(res.status).toBe(502);
  });

  it('persists the accepted request with a fresh fee quote', async () => {
    const { db, bind } = fakeDb();
    vmFetch
      .mockResolvedValueOnce({
        request_id: 99,
        deposit: 5_000_000,
        overhead_fee: 200_000,
        withdrawal_address: 'addr1abc',
        is_whitelisted: true,
      })
      .mockResolvedValueOnce({
        withdrawal_fee: '500000',
        tokens_fee: 300_000,
        fee: 180_000,
        deposit: 5_000_000,
      });

    const res = await onRequestPost(
      makeContext(
        { stakeAddress: 'stake_test1analytics', assetIds: ['a1', 'a2', 'a3'] },
        { DB: db },
      ),
    );

    expect(res.status).toBe(200);
    expect(vmFetch.mock.calls.map((call) => call[2])).toEqual([
      'custom_request',
      'estimate_fees',
    ]);
    expect(vmFetch.mock.calls[1][3]).toEqual({ token_count: 3 });
    expect(bind).toHaveBeenCalledWith(
      '99',
      'stake_test1analytics',
      'preview',
      3,
      '5000000',
      '500000',
      '300000',
      '180000',
    );
  });

  it('returns the accepted claim when fee lookup fails', async () => {
    const { db, bind } = fakeDb();
    vmFetch
      .mockResolvedValueOnce({
        request_id: 100,
        deposit: 5_000_000,
        overhead_fee: 200_000,
        withdrawal_address: 'addr1abc',
        is_whitelisted: true,
      })
      .mockRejectedValueOnce(new Error('fee service unavailable'));

    const res = await onRequestPost(
      makeContext(
        { stakeAddress: 'stake_test1analytics', assetIds: ['a1'] },
        { DB: db },
      ),
    );

    expect(res.status).toBe(200);
    expect(bind).not.toHaveBeenCalled();
  });

  it('returns the accepted claim when quote persistence fails', async () => {
    const { db } = fakeDb({ fail: true });
    vmFetch
      .mockResolvedValueOnce({
        request_id: 101,
        deposit: 5_000_000,
        overhead_fee: 200_000,
        withdrawal_address: 'addr1abc',
        is_whitelisted: true,
      })
      .mockResolvedValueOnce({
        withdrawal_fee: '500000',
        tokens_fee: 100_000,
        fee: 180_000,
      });

    const res = await onRequestPost(
      makeContext(
        { stakeAddress: 'stake_test1analytics', assetIds: ['a1'] },
        { DB: db },
      ),
    );

    expect(res.status).toBe(200);
    expect((await res.json()).requestId).toBe('101');
  });

  it('returns 400 for invalid JSON', async () => {
    const request = new Request('https://example.com/api/claim/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    });
    const ctx = {
      request,
      env: { VITE_VM_API_KEY: 'k' } as Env,
      params: {},
      waitUntil: () => {},
      next: async () => new Response(),
      data: {},
      passThroughOnException: () => {},
    } as unknown as CFContext;
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(400);
  });
});
