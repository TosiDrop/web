# Team Page + Whitelist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Public `/team` page showing Blink Labs info and whitelisted Tosi pools, backed by a KV-cached `/api/getWhitelist` (issues #185, #186).

**Architecture:** `getWhitelist.ts` clones the `getPools.ts` KV-cache pattern (24 h TTL). The client flattens the `{ key: string[] }` whitelist into a pool-ID set and joins it against `/api/getPools` in a `useWhitelistedPools` hook; `TeamPage` renders hero + pools grid with the repo's `card-premium` idioms.

**Tech Stack:** Cloudflare Pages Functions + KV, vm-sdk `getWhitelist()`, React 18 + TanStack Query, vitest.

**Branch:** `feat/team-image-cache` (off `feat/favorite-tokens`). Spec: `docs/superpowers/specs/2026-06-05-team-page-whitelist-design.md`.

---

### Task 1: `GET /api/getWhitelist`

**Files:**
- Create: `functions/api/getWhitelist.ts`
- Test: `functions/api/__tests__/getWhitelist.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
  } as unknown as Ctx;
}

const WHITELIST = { tosi: ['pool1abc', 'pool1def'] };

describe('GET /api/getWhitelist', () => {
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run functions/api/__tests__/getWhitelist.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `functions/api/getWhitelist.ts`**

```ts
import type { Env } from '../types/env';
import { initVmSdk, jsonResponse, errorResponse, optionsResponse } from '../services/vmClient';

const CACHE_KEY = '__internal:whitelist_cache';
const CACHE_TTL = 86400;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');

  if (!env.VITE_VM_API_KEY || env.VITE_VM_API_KEY.trim() === '') {
    return errorResponse('Server configuration error', 500, origin);
  }

  try {
    const cached = await env.VM_WEB_PROFILES.get(CACHE_KEY, { type: 'json' });
    if (cached !== null) {
      return jsonResponse(cached, 200, origin);
    }

    const sdk = await initVmSdk(env);
    const data = await sdk.getWhitelist();

    await env.VM_WEB_PROFILES.put(CACHE_KEY, JSON.stringify(data), {
      expirationTtl: CACHE_TTL,
    });

    return jsonResponse(data, 200, origin);
  } catch (error) {
    console.error('getWhitelist error:', error);
    return errorResponse('Failed to fetch whitelist', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
```

- [ ] **Step 4: Run to verify pass, then commit**

```bash
npx vitest run functions/api/__tests__/getWhitelist.test.ts
git add functions
git commit -m "feat(team): KV-cached /api/getWhitelist endpoint (#186)"
```

---

### Task 2: `flattenWhitelist` + `useWhitelistedPools`

**Files:**
- Create: `src/features/team/api/team.queries.ts`
- Test: `src/features/team/__tests__/team.queries.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const getMock = vi.fn();
vi.mock('@/api/client', () => ({
  apiClient: { get: (...a: unknown[]) => getMock(...a) },
}));

import { flattenWhitelist, useWhitelistedPools } from '../api/team.queries';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('flattenWhitelist', () => {
  it('unions ids across keys', () => {
    const set = flattenWhitelist({ a: ['p1', 'p2'], b: ['p2', 'p3'] });
    expect([...set].sort()).toEqual(['p1', 'p2', 'p3']);
  });

  it('tolerates null and garbage values', () => {
    expect(flattenWhitelist(null).size).toBe(0);
    expect(flattenWhitelist(undefined).size).toBe(0);
    expect(flattenWhitelist({ a: 'nope', b: [42, ''] } as never).size).toBe(0);
  });
});

describe('useWhitelistedPools', () => {
  // Block body on purpose: beforeEach treats a returned function as a
  // teardown hook, and mockReset() returns the mock itself.
  beforeEach(() => {
    getMock.mockReset();
  });

  it('returns only whitelisted pools, joined by map key or pool id', async () => {
    getMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/getPools')) {
        return Promise.resolve({
          pool1abc: { id: 'pool1abc', ticker: 'TOSI', name: 'Tosi Pool', enabled: '1', logo: 'http://l/t' },
          pool1xyz: { id: 'pool1xyz', ticker: 'NOPE', name: 'Other', enabled: '1', logo: '' },
        });
      }
      return Promise.resolve({ tosi: ['pool1abc'] });
    });
    const { result } = renderHook(() => useWhitelistedPools(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toEqual([
      { poolId: 'pool1abc', ticker: 'TOSI', name: 'Tosi Pool', logo: 'http://l/t', description: null },
    ]);
  });
});
```

- [ ] **Step 2: Run to verify failure, then implement**

Run: `npx vitest run src/features/team` → FAIL (module missing).

`src/features/team/api/team.queries.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { GetPoolsResponse } from '@/features/rewards/api/pools.queries';

export interface TeamPool {
  poolId: string;
  ticker: string;
  name: string;
  logo?: string;
  description?: string | null;
}

export function flattenWhitelist(
  raw: Record<string, string[]> | null | undefined,
): Set<string> {
  const out = new Set<string>();
  if (!raw || typeof raw !== 'object') return out;
  for (const ids of Object.values(raw)) {
    if (!Array.isArray(ids)) continue;
    for (const id of ids) {
      if (typeof id === 'string' && id) out.add(id);
    }
  }
  return out;
}

export function useWhitelistedPools() {
  return useQuery<TeamPool[], Error>({
    queryKey: ['whitelisted-pools'],
    staleTime: 300_000,
    queryFn: async () => {
      const [pools, whitelist] = await Promise.all([
        apiClient.get<GetPoolsResponse>('/api/getPools'),
        apiClient.get<Record<string, string[]>>('/api/getWhitelist'),
      ]);
      const allowed = flattenWhitelist(whitelist);
      return Object.entries(pools ?? {})
        .filter(([key, pool]) => allowed.has(key) || allowed.has(pool?.id))
        .map(([key, pool]) => ({
          poolId: pool?.id || key,
          ticker: pool?.ticker ?? '',
          name: pool?.name ?? '',
          logo: pool?.logo || undefined,
          description: pool?.description ?? null,
        }));
    },
  });
}
```

- [ ] **Step 3: Run to verify pass, then commit**

```bash
npx vitest run src/features/team
git add src/features/team
git commit -m "feat(team): useWhitelistedPools hook joining pools with the whitelist"
```

---

### Task 3: TeamPage, route, sidebar link

**Files:**
- Create: `src/pages/TeamPage.tsx`
- Modify: `src/App.tsx` (lazy import + `/team` route)
- Modify: `src/layouts/components/Sidebar.tsx` (NAV_LINKS entry)

- [ ] **Step 1: Implement `src/pages/TeamPage.tsx`**

```tsx
import { useState } from 'react';
import { IconAlertCircle, IconExternalLink } from '@tabler/icons-react';
import { useWhitelistedPools, type TeamPool } from '@/features/team/api/team.queries';

function PoolLogo({ logo, ticker }: { logo?: string; ticker: string }) {
  const [failed, setFailed] = useState(false);
  if (logo && !failed) {
    return (
      <img
        src={logo}
        alt=""
        onError={() => setFailed(true)}
        className="h-10 w-10 shrink-0 rounded-full border border-border-subtle bg-surface-inset object-cover"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-cyan/20 bg-gradient-to-br from-brand-cyan/12 to-brand-teal/8 font-mono text-[10px] font-medium uppercase tracking-tight text-brand-cyan">
      {ticker.slice(0, 4)}
    </div>
  );
}

function PoolCard({ pool }: { pool: TeamPool }) {
  return (
    <a
      href={`https://cexplorer.io/pool/${pool.poolId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-4 rounded-xl border border-border-subtle bg-surface-raised p-4 transition hover:bg-surface-overlay"
    >
      <PoolLogo logo={pool.logo} ticker={pool.ticker} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-medium text-white">
          {pool.ticker}
          <IconExternalLink
            size={12}
            stroke={1.6}
            className="opacity-0 transition group-hover:opacity-60"
          />
        </p>
        <p className="mt-0.5 truncate text-xs text-slate-400">{pool.name}</p>
      </div>
    </a>
  );
}

function PoolsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-border-subtle bg-surface-raised p-4">
          <div className="h-10 w-10 animate-pulse rounded-full bg-surface-inset" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-16 animate-pulse rounded bg-surface-inset" />
            <div className="h-2.5 w-28 animate-pulse rounded bg-surface-inset/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TeamPage() {
  const { data: pools, isLoading, error } = useWhitelistedPools();

  return (
    <div className="space-y-7">
      <header>
        <p className="label-eyebrow">About</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          The team
        </h1>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          Who builds TosiDrop, and the stake pools that keep it running.
        </p>
      </header>

      <section className="card-premium px-6 py-5">
        <p className="label-eyebrow">Built by</p>
        <h2 className="mt-2 text-xl font-light tracking-tight text-white">
          Blink <span className="font-semibold">Labs</span>
        </h2>
        <p className="mt-2 max-w-xl text-sm text-slate-400">
          TosiDrop is developed by Blink Labs, building open-source tooling and
          infrastructure for the Cardano ecosystem.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="https://blinklabs.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-sm text-slate-300 transition hover:text-white"
          >
            blinklabs.io <IconExternalLink size={12} stroke={1.6} />
          </a>
          <a
            href="https://github.com/blinklabs-io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-sm text-slate-300 transition hover:text-white"
          >
            GitHub <IconExternalLink size={12} stroke={1.6} />
          </a>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-light tracking-tight text-white">
            Whitelisted <span className="font-semibold">pools</span>
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Delegate to these Tosi pools to earn rewards on TosiDrop.
          </p>
        </div>

        {isLoading ? (
          <PoolsSkeleton />
        ) : error ? (
          <div className="card-premium flex items-start gap-3 px-5 py-4 text-sm text-rose-200">
            <IconAlertCircle size={18} stroke={1.6} className="mt-0.5 shrink-0 text-rose-400" />
            <div>
              <p className="font-medium text-white">Couldn't load pools</p>
              <p className="mt-0.5 text-xs text-slate-400">{error.message}</p>
            </div>
          </div>
        ) : !pools || pools.length === 0 ? (
          <div className="card-premium px-6 py-16 text-center">
            <p className="label-eyebrow">No pools listed</p>
            <p className="mx-auto mt-3 max-w-sm text-sm text-slate-400">
              The whitelist is empty right now — check back soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pools.map((pool) => (
              <PoolCard key={pool.poolId} pool={pool} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Route + nav**

`src/App.tsx`: after the `NotFoundPage` lazy import add

```ts
const TeamPage = lazy(() => import('@/pages/TeamPage'));
```

and after the `/profile` route add

```tsx
                <Route path="/team" element={<TeamPage />} />
```

`src/layouts/components/Sidebar.tsx`: add `IconUsers` to the `@tabler/icons-react`
import and extend `NAV_LINKS`:

```ts
const NAV_LINKS = [
  { name: 'Claim', href: '/', icon: IconGift },
  { name: 'Profile', href: '/profile', icon: IconUserCircle },
  { name: 'Team', href: '/team', icon: IconUsers },
  { name: 'Docs', href: 'https://docs.tosidrop.me/', icon: IconFileText, external: true },
];
```

- [ ] **Step 3: Verify and commit**

```bash
npx vitest run
npx tsc -b
npm run lint
git add src
git commit -m "feat(team): public Team page with Blink Labs info and whitelisted pools (#185)"
```
