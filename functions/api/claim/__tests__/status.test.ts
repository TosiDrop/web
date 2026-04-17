import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Env } from '../../../types/env';
import { onRequestGet } from '../status';

type CFContext = Parameters<typeof onRequestGet>[0];

function makeContext(url: string, env?: Partial<Env>): CFContext {
  const request = new Request(url, { method: 'GET', headers: { Origin: 'http://localhost:5173' } });
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

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  global.fetch = vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status: ok ? status : status || 500,
      headers: { 'Content-Type': 'application/json' },
    }),
  ) as unknown as typeof fetch;
}

describe('GET /api/claim/status', () => {
  const stake = 'stake_test1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  const url = (extra = '') =>
    `https://example.com/api/claim/status?requestId=7&stakeAddress=${stake}${extra}`;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('maps code 0 to waiting', async () => {
    mockFetchOnce({ status: 0 });
    const res = await onRequestGet(makeContext(url()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ kind: 'waiting' });
  });

  it('maps code 1 to processing with optional txHash', async () => {
    mockFetchOnce({ status: 1, tx_hash: 'abc' });
    const res = await onRequestGet(makeContext(url()));
    expect(await res.json()).toEqual({ kind: 'processing', txHash: 'abc' });
  });

  it('maps code 2 to failure with a reason', async () => {
    mockFetchOnce({ status: 2, reason: 'oops' });
    const res = await onRequestGet(makeContext(url()));
    expect(await res.json()).toEqual({ kind: 'failure', reason: 'oops' });
  });

  it('maps code 3 to success with txHash', async () => {
    mockFetchOnce({ status: 3, tx_hash: 'final' });
    const res = await onRequestGet(makeContext(url()));
    expect(await res.json()).toEqual({ kind: 'success', txHash: 'final' });
  });

  it('returns 400 when requestId is missing', async () => {
    const res = await onRequestGet(
      makeContext(`https://example.com/api/claim/status?stakeAddress=${stake}`),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when stakeAddress is not bech32', async () => {
    const res = await onRequestGet(
      makeContext('https://example.com/api/claim/status?requestId=1&stakeAddress=addr1xyz'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when requestId is not a positive integer', async () => {
    const res = await onRequestGet(
      makeContext(`https://example.com/api/claim/status?requestId=abc&stakeAddress=${stake}`),
    );
    expect(res.status).toBe(400);
  });

  it('returns 502 when upstream fetch fails', async () => {
    global.fetch = vi.fn(async () =>
      new Response('bad', { status: 500 }),
    ) as unknown as typeof fetch;
    const res = await onRequestGet(makeContext(url()));
    expect(res.status).toBe(502);
  });

  it('returns 500 when API key is missing', async () => {
    const res = await onRequestGet(makeContext(url(), { VITE_VM_API_KEY: '' }));
    expect(res.status).toBe(500);
  });
});
