import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Env } from '../../../types/env';

const { vmFetch } = vi.hoisted(() => ({ vmFetch: vi.fn() }));
vi.mock('../../../services/vmClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../services/vmClient')>();
  return { ...actual, vmFetch };
});

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

describe('GET /api/claim/status', () => {
  const stake = 'stake_test1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  const url = (extra = '') =>
    `https://example.com/api/claim/status?requestId=7&stakeAddress=${stake}${extra}`;

  beforeEach(() => {
    vmFetch.mockReset();
  });

  it('maps code 0 to waiting', async () => {
    vmFetch.mockResolvedValueOnce({ status: 0 });
    const res = await onRequestGet(makeContext(url()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ kind: 'waiting' });
  });

  it('maps code 1 to processing with optional txHash', async () => {
    vmFetch.mockResolvedValueOnce({ status: 1, tx_hash: 'abc' });
    const res = await onRequestGet(makeContext(url()));
    expect(await res.json()).toEqual({ kind: 'processing', txHash: 'abc' });
  });

  it('maps code 2 to failure with a reason', async () => {
    vmFetch.mockResolvedValueOnce({ status: 2, reason: 'oops' });
    const res = await onRequestGet(makeContext(url()));
    expect(await res.json()).toEqual({ kind: 'failure', reason: 'oops' });
  });

  it('maps code 3 to success with txHash', async () => {
    vmFetch.mockResolvedValueOnce({ status: 3, tx_hash: 'final' });
    const res = await onRequestGet(makeContext(url()));
    expect(await res.json()).toEqual({ kind: 'success', txHash: 'final' });
  });

  it('maps unknown status codes to failure', async () => {
    vmFetch.mockResolvedValueOnce({ status: 9, tx_hash: 'abc' });
    const res = await onRequestGet(makeContext(url()));
    expect(await res.json()).toEqual({
      kind: 'failure',
      reason: 'Unknown status code: 9 (tx: abc)',
    });
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

  it('returns 502 when the VM API call fails', async () => {
    vmFetch.mockRejectedValueOnce(new Error('vm down'));
    const res = await onRequestGet(makeContext(url()));
    expect(res.status).toBe(502);
  });

  it('returns 503 network_unavailable when the preview API key is missing', async () => {
    const res = await onRequestGet(makeContext(url(), { VITE_VM_API_KEY: '' }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'network_unavailable' });
  });

  it('defaults to the preview network when ?network= is absent', async () => {
    vmFetch.mockResolvedValueOnce({ status: 0 });
    await onRequestGet(makeContext(url()));
    expect(vmFetch.mock.calls[0][1]).toBe('preview');
  });

  it('routes to the network requested via ?network= (the deposit flow sends this)', async () => {
    vmFetch.mockResolvedValueOnce({ status: 0 });
    const env = { VM_BASE_URL_MAINNET: 'https://vm.example', VM_API_KEY_MAINNET: 'mk' };
    await onRequestGet(makeContext(url('&network=mainnet'), env));
    expect(vmFetch.mock.calls[0][1]).toBe('mainnet');
    const [, , action, params] = vmFetch.mock.calls[0];
    expect(action).toBe('check_status_custom_request');
    expect(params).toEqual({
      staking_address: stake,
      request_id: 7,
      session_id: stake.slice(0, 40),
    });
  });

  it('returns 503 network_unavailable when ?network=mainnet is requested without mainnet config', async () => {
    const res = await onRequestGet(makeContext(url('&network=mainnet')));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'network_unavailable' });
    expect(vmFetch).not.toHaveBeenCalled();
  });
});
