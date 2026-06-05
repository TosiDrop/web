# Token Image Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** R2-backed token-logo proxy with lazy fill (#188), R2 binding (#187), client integration with fallback (#190), and a standalone daily cron Worker that warms the cache (#189 — Pages can't cron).

**Architecture:** `/api/tokenImage?id=` resolves the logo URL from token metadata only (no SSRF), serves from R2 or fetch-validate-store-serve, degrading to a 302 to the source. Clients route http(s) logos through the proxy via a pure `tokenImageSrc` util and a `useImageFallback` hook (proxy → original → initials). A separate Worker project at `workers/token-image-sync/` rotates through tokens nightly with a KV cursor.

**Tech Stack:** Cloudflare Pages Functions, R2 (`tosidrop-token-images`, exists), KV, a standalone cron Worker, vitest.

**Branch:** `feat/team-image-cache`. Spec: `docs/superpowers/specs/2026-06-05-token-image-cache-design.md`.

---

### Task 1: R2 binding (#187)

**Files:**
- Modify: `wrangler.jsonc` (add `r2_buckets` after `d1_databases`)
- Modify: `functions/types/env.ts`

- [ ] **Step 1: Add the binding**

In `wrangler.jsonc`, after the `d1_databases` array add:

```jsonc
  // R2-backed token image cache (bucket exists; see infrastructure#84).
  // /api/tokenImage feature-detects the binding and degrades to a redirect.
  "r2_buckets": [
    { "binding": "TOKEN_IMAGES", "bucket_name": "tosidrop-token-images" }
  ],
```

In `functions/types/env.ts` add below the `DB` field:

```ts
  // R2 token-image cache is optional; /api/tokenImage degrades to a redirect.
  TOKEN_IMAGES?: R2Bucket;
```

- [ ] **Step 2: Verify and commit**

```bash
npx tsc -b
git add wrangler.jsonc functions/types/env.ts
git commit -m "feat(images): bind tosidrop-token-images R2 bucket (#187)"
```

---

### Task 2: `GET /api/tokenImage` (#188)

**Files:**
- Create: `functions/api/tokenImage.ts`
- Test: `functions/api/__tests__/tokenImage.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Env } from '../../types/env';

const sdkGetTokens = vi.fn();
vi.mock('../../services/vmClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/vmClient')>();
  return { ...actual, initVmSdk: async () => ({ getTokens: sdkGetTokens }) };
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
      key === '__internal:tokens_cache' ? tokens : null,
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
  beforeEach(() => {
    sdkGetTokens.mockReset();
    sdkGetTokens.mockResolvedValue(TOKENS);
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

  it('falls back to the SDK when the KV tokens cache is empty', async () => {
    const res = await onRequestGet(ctx('?id=pol.aaaa', { VM_WEB_PROFILES: fakeKv(null) }));
    expect(res.status).toBe(302); // no bucket bound, but resolution succeeded via SDK
    expect(sdkGetTokens).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run functions/api/__tests__/tokenImage.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement `functions/api/tokenImage.ts`**

```ts
import type { Env } from '../types/env';
import { initVmSdk, errorResponse, optionsResponse } from '../services/vmClient';

const MAX_ID_LEN = 120;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const TOKENS_CACHE_KEY = '__internal:tokens_cache';

interface TokenInfo {
  logo?: unknown;
}

function hasBucket(env: Env): env is Env & { TOKEN_IMAGES: R2Bucket } {
  return typeof env?.TOKEN_IMAGES?.get === 'function';
}

function redirect(location: string): Response {
  return new Response(null, { status: 302, headers: { Location: location } });
}

// Only URLs registered in token metadata are ever fetched — the caller cannot
// supply one, which keeps this proxy SSRF-free.
async function resolveLogo(env: Env, assetId: string): Promise<string | null> {
  let tokens = (await env.VM_WEB_PROFILES.get(TOKENS_CACHE_KEY, { type: 'json' })) as
    | Record<string, TokenInfo>
    | null;
  if (!tokens) {
    const sdk = await initVmSdk(env);
    tokens = (await sdk.getTokens()) as Record<string, TokenInfo>;
  }
  const logo = tokens?.[assetId]?.logo;
  return typeof logo === 'string' && /^https?:\/\//i.test(logo) ? logo : null;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const id = new URL(request.url).searchParams.get('id');

  if (!id || id.length > MAX_ID_LEN) {
    return errorResponse('id is required', 400, origin);
  }

  let logo: string | null;
  try {
    logo = await resolveLogo(env, id);
  } catch (err) {
    console.error('tokenImage metadata error:', err);
    return errorResponse('Failed to resolve token', 500, origin);
  }
  if (!logo) {
    return errorResponse('Unknown token or no image', 404, origin);
  }

  if (!hasBucket(env)) {
    return redirect(logo);
  }

  try {
    const cached = await env.TOKEN_IMAGES.get(id);
    if (cached) {
      return new Response(cached.body, {
        headers: {
          'Content-Type': cached.httpMetadata?.contentType ?? 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }
  } catch (err) {
    console.error('tokenImage R2 read error:', err);
  }

  try {
    const upstream = await fetch(logo, { signal: AbortSignal.timeout(10_000) });
    const contentType = upstream.headers.get('Content-Type') ?? '';
    const declaredLength = Number(upstream.headers.get('Content-Length') ?? '0');
    if (!upstream.ok || !contentType.startsWith('image/') || declaredLength > MAX_IMAGE_BYTES) {
      return redirect(logo);
    }
    const bytes = await upstream.arrayBuffer();
    if (bytes.byteLength > MAX_IMAGE_BYTES) {
      return redirect(logo);
    }

    await env.TOKEN_IMAGES.put(id, bytes, { httpMetadata: { contentType } });
    return new Response(bytes, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error('tokenImage upstream error:', err);
    return redirect(logo);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
```

- [ ] **Step 4: Run to verify pass, then commit**

```bash
npx vitest run functions/api/__tests__/tokenImage.test.ts
git add functions
git commit -m "feat(images): R2-backed token image proxy with lazy fill (#188)"
```

---

### Task 3: Client integration (#190)

**Files:**
- Create: `src/shared/tokenImage.ts`
- Create: `src/hooks/useImageFallback.ts`
- Test: `src/shared/__tests__/tokenImage.test.ts`
- Modify: `src/features/rewards/components/DistributionCard.tsx`
- Modify: `src/features/history/components/HistoryList.tsx` (`TokenAvatar`)
- Modify: `src/features/favorites/components/FavoritesTab.tsx` (`TokenRow`)

- [ ] **Step 1: Write the failing util test**

`src/shared/__tests__/tokenImage.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tokenImageSrc } from '../tokenImage';

describe('tokenImageSrc', () => {
  it('routes http(s) logos through the proxy', () => {
    expect(tokenImageSrc('pol.aaaa', 'https://img.example/a.png')).toBe(
      '/api/tokenImage?id=pol.aaaa',
    );
    expect(tokenImageSrc('a b', 'http://x/y.png')).toBe('/api/tokenImage?id=a%20b');
  });

  it('passes data URIs and other non-http values through', () => {
    expect(tokenImageSrc('pol.aaaa', 'data:image/png;base64,xyz')).toBe(
      'data:image/png;base64,xyz',
    );
  });

  it('returns undefined for a missing logo', () => {
    expect(tokenImageSrc('pol.aaaa', undefined)).toBeUndefined();
    expect(tokenImageSrc('pol.aaaa', '')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify failure, then implement util + hook**

Run: `npx vitest run src/shared/__tests__/tokenImage.test.ts` → FAIL.

`src/shared/tokenImage.ts`:

```ts
// Route remote token logos through the R2-backed proxy; data URIs (and any
// other non-http values) render directly.
export function tokenImageSrc(assetId: string, logo?: string): string | undefined {
  if (!logo) return undefined;
  if (!/^https?:\/\//i.test(logo)) return logo;
  return `/api/tokenImage?id=${encodeURIComponent(assetId)}`;
}
```

`src/hooks/useImageFallback.ts`:

```ts
import { useState } from 'react';

// Walks candidate image srcs on <img> error: proxy → original → exhausted.
// Callers keyed by assetId remount per token, so the index never goes stale.
export function useImageFallback(candidates: Array<string | undefined>) {
  const sources = [...new Set(candidates.filter((s): s is string => !!s))];
  const [index, setIndex] = useState(0);
  return {
    src: index < sources.length ? sources[index] : undefined,
    failed: index >= sources.length,
    onError: () => setIndex((i) => i + 1),
  };
}
```

- [ ] **Step 3: Wire the three render sites**

`DistributionCard.tsx` — replace the `imgFailed` state with the hook. Remove
`const [imgFailed, setImgFailed] = useState(false);` (and the now-unused `useState`
import if nothing else uses it), add:

```tsx
import { tokenImageSrc } from '@/shared/tokenImage';
import { useImageFallback } from '@/hooks/useImageFallback';
```

```tsx
  const img = useImageFallback([tokenImageSrc(token.assetId, token.logo), token.logo]);
```

and the avatar block becomes:

```tsx
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-inset text-xs font-medium text-slate-400">
            {img.failed || !img.src ? (
              token.ticker.slice(0, 2)
            ) : (
              <img
                src={img.src}
                alt={token.ticker}
                className="h-8 w-8 rounded-full"
                onError={img.onError}
              />
            )}
          </div>
```

`HistoryList.tsx` — `TokenAvatar` gains the asset id (callers pass `row.token`):

```tsx
function TokenAvatar({ assetId, logo, ticker }: { assetId: string; logo?: string; ticker: string }) {
  const img = useImageFallback([tokenImageSrc(assetId, logo), logo]);
  if (img.src && !img.failed) {
    return (
      <img
        src={img.src}
        alt=""
        onError={img.onError}
        className="h-9 w-9 shrink-0 rounded-full border border-border-subtle bg-surface-inset object-cover"
      />
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-cyan/20 bg-gradient-to-br from-brand-cyan/12 to-brand-teal/8 font-mono text-[10px] font-medium uppercase tracking-tight text-brand-cyan">
      {ticker.slice(0, 3)}
    </div>
  );
}
```

with the call site `<TokenAvatar assetId={row.token} logo={row.logo} ticker={row.ticker} />`
(remove the local `useState` for `failed` and add the two imports).

`FavoritesTab.tsx` — `TokenRow` swaps `imgFailed` for the hook the same way
(`useImageFallback([tokenImageSrc(token.assetId, token.logo), token.logo])`; initials
branch when `img.failed || !img.src`).

- [ ] **Step 4: Verify and commit**

```bash
npx vitest run
npx tsc -b
npm run lint
git add src
git commit -m "feat(images): serve token logos through the cache proxy with fallback (#190)"
```

---

### Task 4: Cron sync Worker (#189)

**Files:**
- Create: `workers/token-image-sync/wrangler.jsonc`
- Create: `workers/token-image-sync/src/sync.ts`
- Create: `workers/token-image-sync/src/index.ts`
- Create: `workers/token-image-sync/README.md`
- Test: `workers/token-image-sync/src/sync.test.ts`
- Modify: `vitest.config.ts` (include `workers/**/*.test.ts`)
- Modify: `tsconfig.app.json` (include `workers`)

- [ ] **Step 1: Config plumbing**

`vitest.config.ts` include becomes:

```ts
    include: ['src/**/*.test.{ts,tsx}', 'functions/**/*.test.ts', 'workers/**/*.test.ts'],
```

`tsconfig.app.json` include becomes:

```jsonc
  "include": ["src", "functions", "workers"]
```

- [ ] **Step 2: Write the failing sync tests**

`workers/token-image-sync/src/sync.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { syncTokenImages, type SyncDeps } from './sync';

const PNG = new Uint8Array([1, 2, 3]).buffer;

function deps(overrides: Partial<SyncDeps> = {}): SyncDeps & {
  kvStore: Map<string, unknown>;
  r2Store: Map<string, unknown>;
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
      d: {},                                   // skipped: no logo
    }),
    fetchImage: vi.fn(async () => ({ ok: true, contentType: 'image/png', bytes: PNG })),
    ...overrides,
  };
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

    const second = await syncTokenImages(deps({ limit: 1, kv: d.kv, bucket: d.bucket }) as never);
    void second;
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
    await syncTokenImages({ ...d, fetchTokens } as never);
    expect(fetchTokens).not.toHaveBeenCalled();
    expect(d.r2Store.has('z')).toBe(true);
  });
});
```

- [ ] **Step 3: Run to verify failure, then implement**

Run: `npx vitest run workers` → FAIL (module missing).

`workers/token-image-sync/src/sync.ts`:

```ts
// Pure, dependency-injected core of the nightly image-sync cron. Rotates
// through tokens alphabetically with a KV cursor so each run fetches at most
// `limit` new images (Workers subrequest limits) and the cache converges
// over successive nights.
export interface SyncDeps {
  kv: {
    get(key: string, opts: { type: 'json' }): Promise<unknown>;
    put(key: string, value: string): Promise<void>;
  };
  bucket: {
    head(key: string): Promise<unknown | null>;
    put(
      key: string,
      value: ArrayBuffer,
      opts: { httpMetadata: { contentType: string } },
    ): Promise<unknown>;
  };
  fetchTokens: () => Promise<Record<string, { logo?: string }>>;
  fetchImage: (
    url: string,
  ) => Promise<{ ok: boolean; contentType: string; bytes: ArrayBuffer } | null>;
  limit?: number;
}

const TOKENS_CACHE_KEY = '__internal:tokens_cache';
const CURSOR_KEY = '__internal:image_sync_cursor';
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_SCANS_PER_RUN = 500;

export async function syncTokenImages({
  kv,
  bucket,
  fetchTokens,
  fetchImage,
  limit = 40,
}: SyncDeps): Promise<{ scanned: number; stored: number }> {
  const cached = (await kv.get(TOKENS_CACHE_KEY, { type: 'json' })) as Record<
    string,
    { logo?: string }
  > | null;
  const tokens = cached ?? (await fetchTokens());

  const ids = Object.keys(tokens ?? {})
    .filter((id) => {
      const logo = tokens[id]?.logo;
      return typeof logo === 'string' && /^https?:\/\//i.test(logo);
    })
    .sort();
  if (ids.length === 0) return { scanned: 0, stored: 0 };

  const cursor = ((await kv.get(CURSOR_KEY, { type: 'json' })) as string | null) ?? '';
  const startIdx = cursor ? ids.findIndex((id) => id > cursor) : 0;
  const rotation =
    startIdx <= 0 ? ids : [...ids.slice(startIdx), ...ids.slice(0, startIdx)];

  let scanned = 0;
  let fetched = 0;
  let stored = 0;
  let last = cursor;

  for (const id of rotation) {
    if (fetched >= limit || scanned >= MAX_SCANS_PER_RUN) break;
    scanned += 1;
    last = id;
    try {
      if (await bucket.head(id)) continue;
      fetched += 1;
      const img = await fetchImage(tokens[id]!.logo!);
      if (
        !img ||
        !img.ok ||
        !img.contentType.startsWith('image/') ||
        img.bytes.byteLength > MAX_IMAGE_BYTES
      ) {
        continue;
      }
      await bucket.put(id, img.bytes, { httpMetadata: { contentType: img.contentType } });
      stored += 1;
    } catch (err) {
      console.error(`image sync failed for ${id}:`, err);
    }
  }

  await kv.put(CURSOR_KEY, JSON.stringify(last));
  return { scanned, stored };
}
```

`workers/token-image-sync/src/index.ts`:

```ts
import { syncTokenImages } from './sync';

interface Env {
  TOKEN_IMAGES: R2Bucket;
  VM_WEB_PROFILES: KVNamespace;
  VITE_VM_API_KEY: string;
  VM_BASE_URL?: string;
}

const DEFAULT_VM_BASE_URL = 'https://vmprev.adaseal.eu';

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      syncTokenImages({
        kv: env.VM_WEB_PROFILES,
        bucket: env.TOKEN_IMAGES,
        fetchTokens: async () => {
          const res = await fetch(
            `${env.VM_BASE_URL || DEFAULT_VM_BASE_URL}/api.php?action=get_tokens`,
            { headers: { 'X-API-Token': env.VITE_VM_API_KEY } },
          );
          if (!res.ok) throw new Error(`VM API ${res.status}: ${res.statusText}`);
          return res.json();
        },
        fetchImage: async (url) => {
          const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
          if (!res.ok) return null;
          return {
            ok: true,
            contentType: res.headers.get('Content-Type') ?? '',
            bytes: await res.arrayBuffer(),
          };
        },
      }).then((result) =>
        console.log(`image sync: scanned ${result.scanned}, stored ${result.stored}`),
      ),
    );
  },
};
```

`workers/token-image-sync/wrangler.jsonc`:

```jsonc
{
  "$schema": "../../node_modules/wrangler/config-schema.json",
  "name": "tosidrop-token-image-sync",
  "main": "src/index.ts",
  "compatibility_date": "2025-02-04",
  "triggers": { "crons": ["0 2 * * *"] },
  "r2_buckets": [
    { "binding": "TOKEN_IMAGES", "bucket_name": "tosidrop-token-images" }
  ],
  "kv_namespaces": [
    { "binding": "VM_WEB_PROFILES", "id": "7a6e9597aa6d4e708c3e100c63ab2881" }
  ]
  // Secret: VITE_VM_API_KEY — set with `wrangler secret put VITE_VM_API_KEY`.
}
```

`workers/token-image-sync/README.md`:

```md
# tosidrop-token-image-sync

Nightly cron Worker (02:00 UTC) that warms the `tosidrop-token-images` R2 cache
used by the Pages `/api/tokenImage` proxy. Standalone Worker because Cloudflare
Pages cannot run cron triggers (see issue #189).

Each run fetches at most 40 new images, resuming alphabetically from a KV
cursor (`__internal:image_sync_cursor`), so the cache converges over a few
nights; the proxy lazy-fills any gaps in the meantime.

## Deploy

    cd workers/token-image-sync
    npx wrangler secret put VITE_VM_API_KEY   # once
    npx wrangler deploy

## Test locally

    npx vitest run workers
```

- [ ] **Step 4: Run to verify pass, then commit**

```bash
npx vitest run workers
npx tsc -b
npm run lint
git add workers vitest.config.ts tsconfig.app.json
git commit -m "feat(images): nightly R2 warm-up cron Worker (#189)"
```

---

### Task 5: Full verification, push, PR

- [ ] **Step 1: Whole-repo gates**

```bash
npx vitest run
npx tsc -b
npm run lint
npm run build
```

Expected: all pass.

- [ ] **Step 2: Push and open the PR** (gh account: `JaeBrian` — switch if a push 403s)

```bash
git push -u origin feat/team-image-cache
gh pr create --base feat/favorite-tokens --title "feat: Team page, whitelist endpoint, and R2 token image cache" --body "..."
```

(PR body: closes #185, #186, #187, #188, #189, #190; explains the Pages-can't-cron
constraint and the standalone Worker; notes the Worker deploy is a separate manual
step documented in its README.)

- [ ] **Step 3: Deploy the cron Worker** — requires the VM API key secret; confirm
with the user before running `wrangler deploy` (a new production Worker).
