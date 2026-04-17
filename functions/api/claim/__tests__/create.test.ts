import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Env } from '../../../types/env';

const getCustomRequestMock = vi.fn();

vi.mock('../../../services/vmClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../services/vmClient')>();
  return {
    ...actual,
    initVmSdk: vi.fn(async () => ({ getCustomRequest: getCustomRequestMock })),
  };
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
    getCustomRequestMock.mockReset();
  });

  it('maps SDK response to camelCase and uses session_id = stake[:40]', async () => {
    const stake = 'stake_test1' + 'x'.repeat(50);
    getCustomRequestMock.mockResolvedValueOnce({
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
    const arg = getCustomRequestMock.mock.calls[0][0];
    expect(arg.staking_address).toBe(stake);
    expect(arg.session_id).toBe(stake.slice(0, 40));
    expect(arg.selected).toBe('a1,a2');
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

  it('returns 500 when API key is missing', async () => {
    const res = await onRequestPost(
      makeContext(
        { stakeAddress: 'stake_test1x', assetIds: ['a'] },
        { VITE_VM_API_KEY: '' },
      ),
    );
    expect(res.status).toBe(500);
  });

  it('returns 502 when SDK throws', async () => {
    getCustomRequestMock.mockRejectedValueOnce(new Error('upstream down'));
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
