import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Env } from '../../../types/env';

const { vmGet } = vi.hoisted(() => ({ vmGet: vi.fn() }));
vi.mock('../../../services/vmClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../services/vmClient')>();
  return { ...actual, vmGet };
});

import { onRequestPost } from '../create';

type CFContext = Parameters<typeof onRequestPost>[0];

/** Work handed to waitUntil; tests await it before asserting on D1 calls. */
let deferred: Promise<unknown>[] = [];
const flushDeferred = () => Promise.all(deferred);

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
    waitUntil: (promise: Promise<unknown>) => {
      deferred.push(promise);
    },
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
    vmGet.mockReset();
    deferred = [];
  });

  it('maps SDK response to camelCase and uses session_id = stake[:40]', async () => {
    const stake = 'stake_test1' + 'x'.repeat(50);
    vmGet.mockResolvedValueOnce({
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
    const [, action, params] = vmGet.mock.calls[0];
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

  it('returns 500 when the deployment API key is missing', async () => {
    const res = await onRequestPost(
      makeContext(
        { stakeAddress: 'stake_test1x', assetIds: ['a'] },
        { VITE_VM_API_KEY: '' },
      ),
    );
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Server configuration error' });
  });

  it('returns 502 when the VM API throws', async () => {
    vmGet.mockRejectedValueOnce(new Error('upstream down'));
    const res = await onRequestPost(
      makeContext({ stakeAddress: 'stake_test1x', assetIds: ['a'] }),
    );
    expect(res.status).toBe(502);
  });

  it('persists the accepted request with a fresh fee quote', async () => {
    const { db, bind } = fakeDb();
    vmGet
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
    // Persistence is handed to waitUntil; the response never awaits it.
    expect(deferred).toHaveLength(1);
    await flushDeferred();
    expect(vmGet.mock.calls.map((call) => call[1])).toEqual([
      'custom_request',
      'estimate_fees',
    ]);
    expect(vmGet.mock.calls[1][2]).toEqual({ token_count: 3 });
    expect(bind).toHaveBeenCalledWith(
      '99',
      'stake_test1analytics',
      'preview',
      3,
      '5000000',
      '500000',
      '300000',
      '180000',
      '200000',
    );
  });

  it('records the network of the deployment, not a default', async () => {
    const { db, bind } = fakeDb();
    vmGet
      .mockResolvedValueOnce({
        request_id: 7,
        deposit: 1,
        overhead_fee: 0,
        withdrawal_address: 'addr1',
        is_whitelisted: true,
      })
      .mockResolvedValueOnce({ withdrawal_fee: 1, tokens_fee: 1, fee: 1 });

    await onRequestPost(
      makeContext(
        { stakeAddress: 'stake1mainnet', assetIds: ['a1'] },
        { DB: db, VITE_NETWORK: 'mainnet', VM_BASE_URL: 'https://vm.example' },
      ),
    );
    await flushDeferred();

    expect(bind.mock.calls[0][2]).toBe('mainnet');
  });

  it('still records the claim, with unknown fees, when fee lookup fails', async () => {
    const { db, bind } = fakeDb();
    vmGet
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
    await flushDeferred();
    expect(bind).toHaveBeenCalledWith(
      '100',
      'stake_test1analytics',
      'preview',
      1,
      '5000000',
      null,
      null,
      null,
      '200000',
    );
  });

  it('returns the accepted claim when quote persistence fails', async () => {
    const { db } = fakeDb({ fail: true });
    vmGet
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
    expect(((await res.json()) as { requestId: string }).requestId).toBe('101');
    await expect(flushDeferred()).resolves.toBeDefined();
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
