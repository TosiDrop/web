import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Env } from '../../types/env';

const { vmGet } = vi.hoisted(() => ({ vmGet: vi.fn() }));
vi.mock('../../services/vmClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/vmClient')>();
  return { ...actual, vmGet };
});

import { onRequestGet } from '../tokenImage';

type Ctx = Parameters<typeof onRequestGet>[0];

const ASSET = `${'ab'.repeat(28)}.4d494e`;
const TOKENS = {
  'pol.aaaa': { logo: 'https://img.example/aaaa.png' },
  'pol.data': { logo: 'data:image/png;base64,xyz' },
  [ASSET]: { logo: 'https://img.example/broken.png' },
};
const REGISTRY_PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

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
    vmGet.mockReset();
    vmGet.mockResolvedValue(TOKENS);
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
    const bucket = fakeR2({ 'pol.aaaa:preview': { body: PNG, contentType: 'image/png' } });
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
      'pol.aaaa:preview',
      expect.anything(),
      { httpMetadata: { contentType: 'image/png' } },
    );
  });

  it('isolates R2 objects by the deployment network', async () => {
    const bucket = fakeR2();

    await onRequestGet(
      ctx('?id=pol.aaaa&network=preview', {
        VITE_NETWORK: 'mainnet',
        VM_BASE_URL: 'https://vm-mainnet.example',
        TOKEN_IMAGES: bucket,
      }),
    );

    expect(bucket.get).toHaveBeenCalledWith('pol.aaaa:mainnet');
    expect(bucket.put).toHaveBeenCalledWith(
      'pol.aaaa:mainnet',
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

  describe('Cardano Token Registry fallback', () => {
    function stubFetch(registryHasLogo: boolean) {
      const fetchMock = vi.fn(async (url: string) => {
        if (url.includes('/metadata/')) {
          return registryHasLogo
            ? new Response(JSON.stringify({ logo: { value: btoa(String.fromCharCode(...REGISTRY_PNG)) } }))
            : new Response(null, { status: 204 });
        }
        return new Response('not found', { status: 404 });
      });
      vi.stubGlobal('fetch', fetchMock);
      return fetchMock;
    }

    it('stores and serves the registry logo when the token logo is broken', async () => {
      const fetchMock = stubFetch(true);
      const bucket = fakeR2();
      const res = await onRequestGet(ctx(`?id=${ASSET}`, { TOKEN_IMAGES: bucket }));

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('image/png');
      expect(new Uint8Array(await res.arrayBuffer())).toEqual(REGISTRY_PNG);
      expect(fetchMock).toHaveBeenCalledWith(
        `https://metadata.world.dev.cardano.org/metadata/${ASSET.replace('.', '')}/properties/logo`,
        expect.anything(),
      );
      expect(bucket.put).toHaveBeenCalledWith(`${ASSET}:preview`, expect.anything(), {
        httpMetadata: { contentType: 'image/png' },
      });
    });

    it('serves a registry logo for a token with no logo, even without R2', async () => {
      stubFetch(true);
      const res = await onRequestGet(ctx(`?id=${'cd'.repeat(28)}.4d494e`, {}));
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('image/png');
    });

    it('302s to the broken logo when the registry has nothing', async () => {
      stubFetch(false);
      const bucket = fakeR2();
      const res = await onRequestGet(ctx(`?id=${ASSET}`, { TOKEN_IMAGES: bucket }));
      expect(res.status).toBe(302);
      expect(res.headers.get('Location')).toBe('https://img.example/broken.png');
      expect(bucket.put).not.toHaveBeenCalled();
    });

    it('404s for a day when neither source has an image', async () => {
      stubFetch(false);
      const res = await onRequestGet(ctx(`?id=${'cd'.repeat(28)}.4d494e`, { TOKEN_IMAGES: fakeR2() }));
      expect(res.status).toBe(404);
      expect(res.headers.get('Cache-Control')).toBe('public, max-age=86400');
    });
  });

  it('falls back to the VM API when the KV tokens cache is empty', async () => {
    const res = await onRequestGet(ctx('?id=pol.aaaa', { VM_WEB_PROFILES: fakeKv(null) }));
    expect(res.status).toBe(302); // no bucket bound, but resolution succeeded via the VM API
    expect(vmGet).toHaveBeenCalledTimes(1);
    expect(vmGet).toHaveBeenCalledWith(expect.anything(), 'get_tokens');
  });
});
