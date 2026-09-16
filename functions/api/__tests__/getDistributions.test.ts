import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../types/env';

const { vmGet } = vi.hoisted(() => ({ vmGet: vi.fn() }));
vi.mock('../../services/vmClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/vmClient')>();
  return { ...actual, vmGet };
});

import { onRequestGet } from '../getDistributions';

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

function ctx(env: Partial<Env>, network = 'preview'): Ctx {
  return {
    request: new Request('https://x/api/getDistributions', {
      headers: { Origin: 'http://localhost:5173' },
    }),
    env: {
      VITE_VM_API_KEY: 'key',
      VITE_NETWORK: network,
      ...(network === 'mainnet' ? { VM_BASE_URL: 'https://vm.example' } : {}),
      ...env,
    } as Env,
    waitUntil: vi.fn(),
  } as unknown as Ctx;
}

const DISTRIBUTIONS = { everyone: [{ id: '1', pool_id: 'pool1test' }] };

describe('GET /api/getDistributions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    vmGet.mockReset();
    vmGet.mockResolvedValue(DISTRIBUTIONS);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('serves a fresh snapshot without calling the VM', async () => {
    const kv = fakeKv({
      '__internal:distributions_cache:preview': {
        version: 1,
        fetchedAt: Date.now() - 60_000,
        data: DISTRIBUTIONS,
      },
    });

    const res = await onRequestGet(ctx({ VM_WEB_PROFILES: kv }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(DISTRIBUTIONS);
    expect(vmGet).not.toHaveBeenCalled();
  });

  it('fetches and stores a durable snapshot on a cache miss', async () => {
    const kv = fakeKv();

    const res = await onRequestGet(ctx({ VM_WEB_PROFILES: kv }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(DISTRIBUTIONS);
    expect(kv.put).toHaveBeenCalledWith(
      '__internal:distributions_cache:preview',
      JSON.stringify({ version: 1, fetchedAt: Date.now(), data: DISTRIBUTIONS }),
      { expirationTtl: 7 * 86400 },
    );
  });

  it('refreshes a stale snapshot', async () => {
    const kv = fakeKv({
      '__internal:distributions_cache:preview': {
        version: 1,
        fetchedAt: Date.now() - 86400 * 1000,
        data: { everyone: [] },
      },
    });

    const res = await onRequestGet(ctx({ VM_WEB_PROFILES: kv }));

    expect(await res.json()).toEqual(DISTRIBUTIONS);
    expect(vmGet).toHaveBeenCalledWith(expect.anything(), 'get_distributions');
    expect(kv.put).toHaveBeenCalledTimes(1);
  });

  it('serves a retained stale snapshot when refresh fails', async () => {
    const snapshot = { version: 1, fetchedAt: Date.now() - 2 * 86400 * 1000, data: DISTRIBUTIONS };
    const kv = fakeKv({ '__internal:distributions_cache:mainnet': snapshot });
    vmGet.mockRejectedValue(new Error('VM unavailable'));

    const res = await onRequestGet(ctx({ VM_WEB_PROFILES: kv }, 'mainnet'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(DISTRIBUTIONS);
    expect(kv.put).not.toHaveBeenCalled();
  });

  it('keeps preview and mainnet snapshots isolated', async () => {
    const kv = fakeKv({
      '__internal:distributions_cache:preview': {
        version: 1,
        fetchedAt: Date.now(),
        data: { preview: true },
      },
      '__internal:distributions_cache:mainnet': {
        version: 1,
        fetchedAt: Date.now(),
        data: { mainnet: true },
      },
    });

    const res = await onRequestGet(ctx({ VM_WEB_PROFILES: kv }, 'mainnet'));

    expect(await res.json()).toEqual({ mainnet: true });
    expect(kv.get).toHaveBeenCalledWith('__internal:distributions_cache:mainnet', { type: 'json' });
    expect(vmGet).not.toHaveBeenCalled();
  });
});
