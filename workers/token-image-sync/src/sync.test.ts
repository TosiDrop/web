import { describe, it, expect, vi } from 'vitest';
import { syncTokenImages, type SyncDeps } from './sync';

const PNG = new Uint8Array([1, 2, 3]).buffer;

function deps(overrides: Partial<SyncDeps> = {}): SyncDeps & {
  kvStore: Map<string, unknown>;
  r2Store: Map<string, unknown>;
  fetchImage: ReturnType<typeof vi.fn>;
} {
  const kvStore = new Map<string, unknown>();
  const r2Store = new Map<string, unknown>();
  return {
    kvStore,
    r2Store,
    kv: {
      get: async (key: string) => kvStore.get(key) ?? null,
      put: async (key: string, value: string) => {
        kvStore.set(key, JSON.parse(value));
      },
    },
    bucket: {
      head: async (key: string) => (r2Store.has(key) ? {} : null),
      put: async (key: string, value: ArrayBuffer) => {
        r2Store.set(key, value);
      },
    },
    fetchTokens: async () => ({
      a: { logo: 'https://img/a.png' },
      b: { logo: 'https://img/b.png' },
      c: { logo: 'data:image/png;base64,x' }, // skipped: not http
      d: {}, // skipped: no logo
    }),
    fetchImage: vi.fn(async () => ({ ok: true, contentType: 'image/png', bytes: PNG })),
    ...overrides,
  } as never;
}

describe('syncTokenImages', () => {
  it('stores http-logo tokens and records the cursor', async () => {
    const d = deps();
    const result = await syncTokenImages(d);
    expect(result.stored).toBe(2);
    expect([...d.r2Store.keys()].sort()).toEqual(['a', 'b']);
    expect(d.kvStore.get('__internal:image_sync_cursor')).toBe('b');
  });

  it('skips images already in R2', async () => {
    const d = deps();
    d.r2Store.set('a', PNG);
    const result = await syncTokenImages(d);
    expect(result.stored).toBe(1);
    expect(d.fetchImage).toHaveBeenCalledTimes(1);
  });

  it('honors the fetch limit and resumes from the cursor', async () => {
    const d = deps({ limit: 1 });
    await syncTokenImages(d);
    expect(d.r2Store.has('a')).toBe(true);
    expect(d.r2Store.has('b')).toBe(false);
    expect(d.kvStore.get('__internal:image_sync_cursor')).toBe('a');

    await syncTokenImages(deps({ limit: 1, kv: d.kv, bucket: d.bucket }));
    expect(d.r2Store.has('b')).toBe(true);
  });

  it('survives per-image failures and rejects non-images', async () => {
    const d = deps({
      fetchImage: vi.fn(async (url: string) => {
        if (url.includes('/a.png')) throw new Error('boom');
        return { ok: true, contentType: 'text/html', bytes: PNG };
      }),
    });
    const result = await syncTokenImages(d);
    expect(result.stored).toBe(0);
    expect(d.kvStore.get('__internal:image_sync_cursor')).toBe('b');
  });

  it('prefers the KV tokens cache over fetching', async () => {
    const d = deps();
    d.kvStore.set('__internal:tokens_cache', { z: { logo: 'https://img/z.png' } });
    const fetchTokens = vi.fn();
    await syncTokenImages({ ...d, fetchTokens });
    expect(fetchTokens).not.toHaveBeenCalled();
    expect(d.r2Store.has('z')).toBe(true);
  });
});
