import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Env } from '../../types/env';

const { vmFetch } = vi.hoisted(() => ({ vmFetch: vi.fn() }));
vi.mock('../../services/vmClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/vmClient')>();
  return { ...actual, vmFetch };
});

import { onRequestGet } from '../tokenImage';

type Ctx = Parameters<typeof onRequestGet>[0];

const TOKENS = {
  'pol.aaaa': { logo: 'https://img.example/aaaa.png' },
  'pol.data': { logo: 'data:image/png;base64,xyz' },
};

function fakeKv(tokens: unknown = TOKENS) {
  return {
    get: vi.fn(async (key: string) =>
      key === '__internal:tokens_cache:preview' ? tokens : null,
    ),
  } as unknown as KVNamespace;
}

function fakeR2(initial: Record<string, { body: ArrayBuffer; contentType: string }> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    get: vi.fn(async (key: string) => {
      const hit = store.get(key);
      if (!hit) return null;
      return { body: hit.body, httpMetadata: { contentType: hit.contentType } };
    }),
    put: vi.fn(async (key: string, value: ArrayBuffer, opts: { httpMetadata: { contentType: string } }) => {
      store.set(key, { body: value, contentType: opts.httpMetadata.contentType });
    }),
  } as unknown as R2Bucket & { get: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> };
}

function ctx(qs: string, env: Partial<Env>): Ctx {
  return {
    request: new Request(`https://x/api/tokenImage${qs}`, {
      headers: { Origin: 'http://localhost:5173' },
    }),
    env: { VITE_VM_API_KEY: 'k', VM_WEB_PROFILES: fakeKv(), ...env } as Env,
  } as unknown as Ctx;
}

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer;

describe('GET /api/tokenImage', () => {
  // Block body on purpose: beforeEach treats a returned function as a
  // teardown hook, and mockReset() returns the mock itself.
  beforeEach(() => {
    vmFetch.mockReset();
    vmFetch.mockResolvedValue(TOKENS);
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(PNG, { headers: { 'Content-Type': 'image/png', 'Content-Length': '4' } }),
    ));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('400 when id is missing or oversized', async () => {
    expect((await onRequestGet(ctx('', {}))).status).toBe(400);
    expect((await onRequestGet(ctx(`?id=${'x'.repeat(121)}`, {}))).status).toBe(400);
  });

  it('404 for an unknown token or a non-http logo', async () => {
    expect((await onRequestGet(ctx('?id=pol.nope', {}))).status).toBe(404);
    expect((await onRequestGet(ctx('?id=pol.data', {}))).status).toBe(404);
  });

  it('302s to the source when the R2 binding is absent', async () => {
    const res = await onRequestGet(ctx('?id=pol.aaaa', {}));
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('https://img.example/aaaa.png');
  });

  it('serves a cached image from R2 with immutable headers', async () => {
    const bucket = fakeR2({ 'pol.aaaa': { body: PNG, contentType: 'image/png' } });
    const res = await onRequestGet(ctx('?id=pol.aaaa', { TOKEN_IMAGES: bucket }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    expect(res.headers.get('Cache-Control')).toContain('immutable');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('fetches, stores, and serves on an R2 miss', async () => {
    const bucket = fakeR2();
    const res = await onRequestGet(ctx('?id=pol.aaaa', { TOKEN_IMAGES: bucket }));
    expect(res.status).toBe(200);
    expect(bucket.put).toHaveBeenCalledWith(
      'pol.aaaa',
      expect.anything(),
      { httpMetadata: { contentType: 'image/png' } },
    );
  });

  it('302s instead of caching non-image or oversized upstream responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response('<html/>', { headers: { 'Content-Type': 'text/html' } }),
    ));
    const bucket = fakeR2();
    const res = await onRequestGet(ctx('?id=pol.aaaa', { TOKEN_IMAGES: bucket }));
    expect(res.status).toBe(302);
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it('cancels oversized image streams without a content length', async () => {
    const cancel = vi.fn();
    let pulls = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        controller.enqueue(new Uint8Array(1024 * 1024));
      },
      cancel,
    });
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(stream, { headers: { 'Content-Type': 'image/png' } }),
    ));
    const bucket = fakeR2();
    const res = await onRequestGet(ctx('?id=pol.aaaa', { TOKEN_IMAGES: bucket }));
    expect(res.status).toBe(302);
    expect(bucket.put).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(pulls).toBeLessThan(6);
  });

  it('falls back to the VM API when the KV tokens cache is empty', async () => {
    const res = await onRequestGet(ctx('?id=pol.aaaa', { VM_WEB_PROFILES: fakeKv(null) }));
    expect(res.status).toBe(302); // no bucket bound, but resolution succeeded via the VM API
    expect(vmFetch).toHaveBeenCalledTimes(1);
    expect(vmFetch).toHaveBeenCalledWith(expect.anything(), 'preview', 'get_tokens');
  });
});
