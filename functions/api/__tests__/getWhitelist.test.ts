import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Env } from '../../types/env';

const { vmFetch } = vi.hoisted(() => ({ vmFetch: vi.fn() }));
vi.mock('../../services/vmClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/vmClient')>();
  return { ...actual, vmFetch };
});

import { onRequestGet } from '../getWhitelist';

type Ctx = Parameters<typeof onRequestGet>[0];

function fakeKv(initial: Record<string, unknown> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, JSON.parse(value));
    }),
  } as unknown as KVNamespace & { get: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> };
}

function ctx(env: Partial<Env>, url = 'https://x/api/getWhitelist'): Ctx {
  return {
    request: new Request(url, {
      headers: { Origin: 'http://localhost:5173' },
    }),
    env: { VITE_VM_API_KEY: 'k', ...env } as Env,
    waitUntil: vi.fn(),
  } as unknown as Ctx;
}

const WHITELIST = { tosi: ['pool1abc', 'pool1def'] };

describe('GET /api/getWhitelist', () => {
  // Block body on purpose: beforeEach treats a returned function as a
  // teardown hook, and mockReset() returns the mock itself.
  beforeEach(() => {
    vmFetch.mockReset();
    vmFetch.mockResolvedValue(WHITELIST);
  });

  it('503 network_unavailable when the preview API key is not configured', async () => {
    const res = await onRequestGet(ctx({ VITE_VM_API_KEY: '', VM_WEB_PROFILES: fakeKv() }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'network_unavailable' });
  });

  it('serves from KV without calling the VM API on a cache hit', async () => {
    const kv = fakeKv({ '__internal:whitelist_cache:preview': WHITELIST });
    const res = await onRequestGet(ctx({ VM_WEB_PROFILES: kv }));
    expect(await res.json()).toEqual(WHITELIST);
    expect(vmFetch).not.toHaveBeenCalled();
  });

  it('fetches, stores with a daily TTL, and serves on a cache miss', async () => {
    const kv = fakeKv();
    const res = await onRequestGet(ctx({ VM_WEB_PROFILES: kv }));
    expect(await res.json()).toEqual(WHITELIST);
    expect(vmFetch).toHaveBeenCalledTimes(1);
    expect(kv.put).toHaveBeenCalledWith(
      '__internal:whitelist_cache:preview',
      JSON.stringify(WHITELIST),
      { expirationTtl: 86400 },
    );
  });

  it('maps VM API failures to a 500', async () => {
    vmFetch.mockRejectedValue(new Error('vm down'));
    const res = await onRequestGet(ctx({ VM_WEB_PROFILES: fakeKv() }));
    expect(res.status).toBe(500);
  });

  it('503 network_unavailable when requesting mainnet without mainnet config', async () => {
    const res = await onRequestGet(
      ctx({ VM_WEB_PROFILES: fakeKv() }, 'https://x/api/getWhitelist?network=mainnet'),
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'network_unavailable' });
  });
});
