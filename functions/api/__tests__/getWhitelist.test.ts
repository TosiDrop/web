import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Env } from '../../types/env';

const sdkWhitelist = vi.fn();
vi.mock('../../services/vmClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/vmClient')>();
  return { ...actual, initVmSdk: async () => ({ getWhitelist: sdkWhitelist }) };
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

function ctx(env: Partial<Env>): Ctx {
  return {
    request: new Request('https://x/api/getWhitelist', {
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
    sdkWhitelist.mockReset();
    sdkWhitelist.mockResolvedValue(WHITELIST);
  });

  it('500 when the API key is not configured', async () => {
    const res = await onRequestGet(ctx({ VITE_VM_API_KEY: '', VM_WEB_PROFILES: fakeKv() }));
    expect(res.status).toBe(500);
  });

  it('serves from KV without calling the SDK on a cache hit', async () => {
    const kv = fakeKv({ '__internal:whitelist_cache': WHITELIST });
    const res = await onRequestGet(ctx({ VM_WEB_PROFILES: kv }));
    expect(await res.json()).toEqual(WHITELIST);
    expect(sdkWhitelist).not.toHaveBeenCalled();
  });

  it('fetches, stores with a daily TTL, and serves on a cache miss', async () => {
    const kv = fakeKv();
    const res = await onRequestGet(ctx({ VM_WEB_PROFILES: kv }));
    expect(await res.json()).toEqual(WHITELIST);
    expect(sdkWhitelist).toHaveBeenCalledTimes(1);
    expect(kv.put).toHaveBeenCalledWith(
      '__internal:whitelist_cache',
      JSON.stringify(WHITELIST),
      { expirationTtl: 86400 },
    );
  });

  it('maps SDK failures to a 500', async () => {
    sdkWhitelist.mockRejectedValue(new Error('vm down'));
    const res = await onRequestGet(ctx({ VM_WEB_PROFILES: fakeKv() }));
    expect(res.status).toBe(500);
  });
});
