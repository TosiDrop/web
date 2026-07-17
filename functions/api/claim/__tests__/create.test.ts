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
