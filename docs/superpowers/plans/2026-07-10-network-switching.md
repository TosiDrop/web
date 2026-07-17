# Network Switching (#175) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every VM API request routes to the selected network's VM backend (mainnet/preview); mainnet ships gated behind env config; no cache or state bleeds across networks.

**Architecture:** vm-sdk cannot route per-network (its client hard-instantiates a bundled base URL and holds the API token in module-global state; no vm-sdk types are imported anywhere in the repo), so `functions/services/vmClient.ts` replaces `initVmSdk` with a raw-fetch `vmFetch(env, network, action, params)`; all 15 VM-calling Functions migrate to it. The frontend `apiClient` appends `network=<selected>` to every request; a store subscription clears the query cache and claim state on switch. Availability is advertised by a new env-derived `GET /api/networks`.

**Tech Stack:** Cloudflare Pages Functions, Zustand 5 (persist), TanStack Query, Vitest, React 18.

## Global Constraints

- Branch: `feat/network-switching`, created from `feat/claim-store-lookup` (PR base = that branch). Never add `Co-Authored-By` trailers.
- `npm test` green and `npm run build` clean at every task's commit.
- Backend default network when no `?network=` param is present: **`preview`** (preserves today's behavior — production currently serves vmprev data).
- Unconfigured network → HTTP 503, body `{ "error": "network_unavailable" }` — exact string, frontend matches on it.
- Env vars (all optional additions to `Env`): `VM_BASE_URL_MAINNET`, `VM_API_KEY_MAINNET`, `VM_BASE_URL_PREVIEW`, `VM_API_KEY_PREVIEW`. Preview resolution falls back `VM_BASE_URL_PREVIEW → VM_BASE_URL → DEFAULT_VM_BASE_URL` and `VM_API_KEY_PREVIEW → VITE_VM_API_KEY`. Mainnet requires BOTH `VM_BASE_URL_MAINNET` and `VM_API_KEY_MAINNET`, no fallback to the preview key.
- KV cache keys gain suffix `:{network}` (e.g. `__internal:pools_cache:preview`). Old unsuffixed entries are simply orphaned until TTL expiry — do not migrate them.
- Every handler touched in Tasks 2–4 must also thread CORS origin consistently (`request.headers.get('Origin')` → `requireApiKey`/`jsonResponse`/`errorResponse`/`optionsResponse`), fixing the current inconsistency where 7 files always fall back to the first allowed origin.
- **Documented deviation from the spec:** the `networks: {mainnet, preview}` availability map is exposed via a new `GET /api/networks` endpoint instead of being folded into `getSettings` — `getSettings` is KV-cached per network and can 503 when the requested network is down, while availability must always be answerable fresh from env. The spec's intent (backend advertises which networks are configured) is unchanged.
- Known accepted tradeoff: a user whose persisted store says `mainnet` gets a brief 503 flurry on first paint until the `/api/networks` fallback effect (Task 7) switches them to `preview`; `queryClient.clear()` on the switch wipes those error states. This resolves itself permanently once mainnet env vars are provisioned.

---

### Task 1: vmClient core — network resolution, per-network fetch, cache keys

**Files:**
- Modify: `functions/services/vmClient.ts`
- Modify: `functions/types/env.ts`
- Test: `functions/services/__tests__/vmClient.test.ts` (create)

**Interfaces (every later task consumes these exact names):**
- `export type VmNetwork = 'mainnet' | 'preview'`
- `export function resolveNetwork(request: Request): VmNetwork` — `?network=mainnet` → `'mainnet'`, `?network=preview` → `'preview'`, anything else/absent → `'preview'`
- `export function vmConfigFor(env: Env, network: VmNetwork): { baseUrl: string; apiKey: string } | null` — null when the network is unconfigured (see Global Constraints fallback rules; for preview, null only when no API key resolves)
- `export function networksAvailable(env: Env): { mainnet: boolean; preview: boolean }`
- `export function networkUnavailableResponse(requestOrigin?: string | null): Response` — 503, body `{ error: 'network_unavailable' }`, CORS headers applied
- `export async function vmFetch(env: Env, network: VmNetwork, action: string, params?: Record<string, string | number | boolean | undefined>): Promise<unknown>` — GET `${baseUrl}/api.php?action=...&...` with `X-API-Token: apiKey`; skips undefined params; throws `Error('VM API <status>: <statusText>')` on !ok; throws `Error('network_unavailable')` if `vmConfigFor` returns null (belt-and-braces — handlers should have checked already)
- `export function netCacheKey(base: string, network: VmNetwork): string` — returns `` `${base}:${network}` ``
- Existing exports (`DEFAULT_VM_BASE_URL`, `requireApiKey`, `withCache`, `jsonResponse`, `errorResponse`, `optionsResponse`, `sessionIdFor`) keep their signatures. `vmApiGet` and `initVmSdk` remain temporarily (deleted in Task 4 once the last caller migrates).

- [ ] **Step 1: Write the failing tests**

```ts
// functions/services/__tests__/vmClient.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  resolveNetwork,
  vmConfigFor,
  networksAvailable,
  netCacheKey,
  vmFetch,
} from '../vmClient';
import type { Env } from '../../types/env';

const baseEnv = { VITE_VM_API_KEY: 'legacy-key', VM_WEB_PROFILES: {} as never } as Env;

function req(url: string): Request {
  return new Request(url);
}

describe('resolveNetwork', () => {
  it('reads mainnet from the query param', () => {
    expect(resolveNetwork(req('https://x/api/getPools?network=mainnet'))).toBe('mainnet');
  });
  it('defaults to preview when absent', () => {
    expect(resolveNetwork(req('https://x/api/getPools'))).toBe('preview');
  });
  it('defaults to preview on garbage values', () => {
    expect(resolveNetwork(req('https://x/api/getPools?network=devnet'))).toBe('preview');
  });
});

describe('vmConfigFor', () => {
  it('preview falls back to legacy VM_BASE_URL and VITE_VM_API_KEY', () => {
    const env = { ...baseEnv, VM_BASE_URL: 'https://legacy.example' };
    expect(vmConfigFor(env, 'preview')).toEqual({
      baseUrl: 'https://legacy.example',
      apiKey: 'legacy-key',
    });
  });
  it('preview prefers the dedicated vars', () => {
    const env = {
      ...baseEnv,
      VM_BASE_URL_PREVIEW: 'https://prev.example',
      VM_API_KEY_PREVIEW: 'prev-key',
    };
    expect(vmConfigFor(env, 'preview')).toEqual({
      baseUrl: 'https://prev.example',
      apiKey: 'prev-key',
    });
  });
  it('mainnet requires both dedicated vars', () => {
    expect(vmConfigFor({ ...baseEnv, VM_BASE_URL_MAINNET: 'https://vm.example' }, 'mainnet')).toBeNull();
    expect(vmConfigFor({ ...baseEnv, VM_API_KEY_MAINNET: 'main-key' }, 'mainnet')).toBeNull();
    expect(
      vmConfigFor(
        { ...baseEnv, VM_BASE_URL_MAINNET: 'https://vm.example', VM_API_KEY_MAINNET: 'main-key' },
        'mainnet',
      ),
    ).toEqual({ baseUrl: 'https://vm.example', apiKey: 'main-key' });
  });
  it('mainnet never falls back to the preview key', () => {
    const env = { ...baseEnv, VM_BASE_URL_MAINNET: 'https://vm.example' };
    expect(vmConfigFor(env, 'mainnet')).toBeNull();
  });
});

describe('networksAvailable', () => {
  it('reports preview-only under legacy config', () => {
    expect(networksAvailable(baseEnv)).toEqual({ mainnet: false, preview: true });
  });
  it('reports mainnet when fully configured', () => {
    const env = { ...baseEnv, VM_BASE_URL_MAINNET: 'https://vm.example', VM_API_KEY_MAINNET: 'k' };
    expect(networksAvailable(env)).toEqual({ mainnet: true, preview: true });
  });
});

describe('netCacheKey', () => {
  it('suffixes with the network', () => {
    expect(netCacheKey('__internal:pools_cache', 'mainnet')).toBe('__internal:pools_cache:mainnet');
  });
});

describe('vmFetch', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('builds the VM URL with action and params, skipping undefined', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const env = { ...baseEnv, VM_BASE_URL_PREVIEW: 'https://prev.example', VM_API_KEY_PREVIEW: 'pk' };
    await vmFetch(env, 'preview', 'get_rewards', { staking_address: 'stake1x', token_id: undefined });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://prev.example/api.php?action=get_rewards&staking_address=stake1x');
    expect((init.headers as Record<string, string>)['X-API-Token']).toBe('pk');
  });

  it('throws network_unavailable for unconfigured mainnet', async () => {
    await expect(vmFetch(baseEnv, 'mainnet', 'get_pools')).rejects.toThrow('network_unavailable');
  });

  it('throws on non-OK VM responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 502, statusText: 'Bad Gateway' })));
    await expect(vmFetch(baseEnv, 'preview', 'get_pools')).rejects.toThrow('VM API 502');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run functions/services/__tests__/vmClient.test.ts`
Expected: FAIL — `resolveNetwork` etc. not exported.

- [ ] **Step 3: Implement in `functions/services/vmClient.ts`**

Add below `DEFAULT_VM_BASE_URL` (keep all existing exports; `vmApiGet` refactors to delegate):

```ts
export type VmNetwork = 'mainnet' | 'preview';

export function resolveNetwork(request: Request): VmNetwork {
  const value = new URL(request.url).searchParams.get('network');
  return value === 'mainnet' ? 'mainnet' : 'preview';
}

export function vmConfigFor(env: Env, network: VmNetwork): { baseUrl: string; apiKey: string } | null {
  if (network === 'mainnet') {
    if (!env.VM_BASE_URL_MAINNET || !env.VM_API_KEY_MAINNET) return null;
    return { baseUrl: env.VM_BASE_URL_MAINNET, apiKey: env.VM_API_KEY_MAINNET };
  }
  const apiKey = env.VM_API_KEY_PREVIEW || env.VITE_VM_API_KEY;
  if (!apiKey || apiKey.trim() === '') return null;
  return { baseUrl: env.VM_BASE_URL_PREVIEW || env.VM_BASE_URL || DEFAULT_VM_BASE_URL, apiKey };
}

export function networksAvailable(env: Env): { mainnet: boolean; preview: boolean } {
  return { mainnet: vmConfigFor(env, 'mainnet') !== null, preview: vmConfigFor(env, 'preview') !== null };
}

export function networkUnavailableResponse(requestOrigin?: string | null): Response {
  return errorResponse('network_unavailable', 503, requestOrigin ?? undefined);
}

export function netCacheKey(base: string, network: VmNetwork): string {
  return `${base}:${network}`;
}

export async function vmFetch(
  env: Env,
  network: VmNetwork,
  action: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<unknown> {
  const config = vmConfigFor(env, network);
  if (!config) throw new Error('network_unavailable');
  const qs = new URLSearchParams({ action });
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v === undefined) continue;
    qs.append(k, String(v));
  }
  const res = await fetch(`${config.baseUrl}/api.php?${qs.toString()}`, {
    headers: { 'X-API-Token': config.apiKey },
  });
  if (!res.ok) throw new Error(`VM API ${res.status}: ${res.statusText}`);
  return res.json();
}
```

Refactor the existing `vmApiGet(env, action, params)` body to `return vmFetch(env, 'preview', action, params)` (temporary shim; its one caller migrates in Task 4). Do not delete `initVmSdk` yet.

In `functions/types/env.ts`, add to `Env`:

```ts
VM_BASE_URL_MAINNET?: string;
VM_API_KEY_MAINNET?: string;
VM_BASE_URL_PREVIEW?: string;
VM_API_KEY_PREVIEW?: string;
```

- [ ] **Step 4: Run the new tests, then the full suite**

Run: `npx vitest run functions/services/__tests__/vmClient.test.ts` — Expected: PASS.
Run: `npm test` — Expected: all green (no existing test touches these new exports).

- [ ] **Step 5: Commit**

```bash
git add functions/services/vmClient.ts functions/types/env.ts functions/services/__tests__/vmClient.test.ts
git commit -m "feat(network): per-network VM client core in vmClient (#175)"
```

---

### Task 2: Migrate KV-cached catalog endpoints

**Files:**
- Modify: `functions/api/getPools.ts`, `functions/api/getDistributions.ts`, `functions/api/getTokens.ts`, `functions/api/getWhitelist.ts`, `functions/api/getSettings.ts`
- Modify tests: `functions/api/__tests__/getWhitelist.test.ts` (adapt VM mocking from `initVmSdk` to `vmFetch`)

**Interfaces:**
- Consumes from Task 1: `resolveNetwork`, `vmConfigFor`, `vmFetch`, `netCacheKey`, `networkUnavailableResponse`, `VmNetwork`.
- Produces: these five routes accept `?network=`, serve per-network KV caches, and return 503 `network_unavailable` for unconfigured networks. Response shapes are otherwise unchanged.

The uniform transform, fully worked for `getPools.ts` (apply the same shape to all five; per-file specifics in the table below):

```ts
import type { Env } from '../types/env';
import {
  resolveNetwork,
  vmConfigFor,
  vmFetch,
  netCacheKey,
  networkUnavailableResponse,
  requireApiKey,
  jsonResponse,
  errorResponse,
  optionsResponse,
} from '../services/vmClient';

const CACHE_KEY = '__internal:pools_cache';
const CACHE_TTL = 86400;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const network = resolveNetwork(request);

  const keyError = requireApiKey(env, origin);
  if (keyError) return keyError;
  if (!vmConfigFor(env, network)) return networkUnavailableResponse(origin);

  try {
    const cacheKey = netCacheKey(CACHE_KEY, network);
    const cached = await env.VM_WEB_PROFILES.get(cacheKey, { type: 'json' });
    if (cached !== null) return jsonResponse(cached, 200, origin);

    const data = await vmFetch(env, network, 'get_pools');
    await env.VM_WEB_PROFILES.put(cacheKey, JSON.stringify(data), { expirationTtl: CACHE_TTL });
    return jsonResponse(data, 200, origin);
  } catch (error) {
    console.error('getPools error:', error);
    return errorResponse('Failed to fetch pools', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
```

Preserve each file's existing extra logic verbatim around this skeleton (e.g. `getWhitelist`'s response normalization, `getSettings`'s pass-through of upstream JSON). If a file already has an `onRequestOptions`, keep it, just thread origin.

| File | VM action | Cache base key | TTL | Notes |
|---|---|---|---|---|
| `getPools.ts` | `get_pools` | `__internal:pools_cache` | 86400 | worked example above |
| `getDistributions.ts` | `get_distributions` | `__internal:distributions_cache` | 86400 | — |
| `getTokens.ts` | `get_tokens` | `__internal:tokens_cache` | 86400 | key shared with tokenImage + sync worker (Tasks 3, 8 use the same suffix scheme) |
| `getWhitelist.ts` | `get_whitelist` | `__internal:whitelist_cache` | 86400 | already threads origin; keep its normalization + tests |
| `getSettings.ts` | `get_settings` | `__internal:settings_cache` | 3600 | replace its inline `fetch` with `vmFetch` (removes the duplicated base-URL resolution) |

- [ ] **Step 1: Migrate the five files per the transform + table**
- [ ] **Step 2: Adapt `getWhitelist.test.ts`** — replace its `initVmSdk`/sdk mock with a `vmFetch` mock (`vi.mock` the `../services/vmClient` module's `vmFetch`, keep the other real exports via `importOriginal`); keep every behavioral assertion; add one test: request with `?network=mainnet` against an env lacking mainnet vars returns 503 with body `{ error: 'network_unavailable' }`.
- [ ] **Step 3: Run** `npx vitest run functions/api/__tests__/getWhitelist.test.ts` — Expected: PASS.
- [ ] **Step 4: Run** `npm test` and `npm run build` — Expected: green/clean.
- [ ] **Step 5: Commit**

```bash
git add functions/api/getPools.ts functions/api/getDistributions.ts functions/api/getTokens.ts functions/api/getWhitelist.ts functions/api/getSettings.ts functions/api/__tests__/getWhitelist.test.ts
git commit -m "feat(network): per-network routing for KV-cached catalog endpoints (#175)"
```

---

### Task 3: Migrate edge-cached and pass-through endpoints

**Files:**
- Modify: `functions/api/getSystemInfo.ts`, `functions/api/getStatistics.ts`, `functions/api/getQueue.ts`, `functions/api/estimateFees.ts`, `functions/api/getRewardBreakdown.ts`, `functions/api/getDeliveredRewards.ts`, `functions/api/sanitizeAddress.ts`, `functions/api/tokenImage.ts`
- Modify tests: `functions/api/__tests__/getRewardBreakdown.test.ts`, `functions/api/__tests__/getDeliveredRewards.test.ts`, `functions/api/__tests__/tokenImage.test.ts` (adapt VM mocking to `vmFetch`, same approach as Task 2 Step 2)

**Interfaces:** consumes Task 1's exports; response shapes unchanged.

Per-file transform — same skeleton as Task 2 (origin + `resolveNetwork` + `requireApiKey` + `vmConfigFor` gate + `vmFetch`), with these specifics:

| File | VM action + params | Caching | Notes |
|---|---|---|---|
| `getSystemInfo.ts` | `system_info` | keeps direct `caches.default`, TTL 300 — cache key already derives from full request URL, which now varies by `?network=`; no key change needed | add origin threading (currently none) |
| `getStatistics.ts` | `get_statistics` | same direct `caches.default`, TTL 3600 | add origin threading |
| `getQueue.ts` | `get_pending_tx_count` | `withCache` (URL-keyed — splits on `?network=` automatically) | already threads origin |
| `estimateFees.ts` | `estimate_fees`, param `token_count` | `withCache` | already threads origin |
| `getRewardBreakdown.ts` | `get_reward_breakdown`, param `staking_address` | `withCache` | already threads origin |
| `getDeliveredRewards.ts` | `delivered_rewards`, params `staking_address`, `token_id?` | `withCache` | already threads origin; its D1 `withdrawals` sync stays as-is (addresses are network-prefixed by bech32) |
| `sanitizeAddress.ts` | `sanitize_address`, param `address` | none | already threads origin |
| `tokenImage.ts` | `get_tokens` (only on KV miss) | reads `__internal:tokens_cache` → `netCacheKey('__internal:tokens_cache', network)`; R2 object keys unchanged (asset ids are network-unique) | keep its R2 logic untouched |

- [ ] **Step 1: Migrate the eight files**
- [ ] **Step 2: Adapt the three test files; in ONE of them (getRewardBreakdown.test.ts) add the 503 `network_unavailable` mainnet test** (same shape as Task 2's — no need to repeat it in all three)
- [ ] **Step 3: Run** `npx vitest run functions/api/__tests__/` — Expected: PASS.
- [ ] **Step 4: Run** `npm test` and `npm run build` — Expected: green/clean.
- [ ] **Step 5: Commit**

```bash
git add functions/api/getSystemInfo.ts functions/api/getStatistics.ts functions/api/getQueue.ts functions/api/estimateFees.ts functions/api/getRewardBreakdown.ts functions/api/getDeliveredRewards.ts functions/api/sanitizeAddress.ts functions/api/tokenImage.ts functions/api/__tests__/
git commit -m "feat(network): per-network routing for edge-cached and passthrough endpoints (#175)"
```

---

### Task 4: Migrate claim endpoints, gate handle resolution, add /api/networks, delete dead client paths

**Files:**
- Modify: `functions/api/getRewards.ts`, `functions/api/getCustomRewards.ts`, `functions/api/claim/create.ts`, `functions/api/claim/status.ts`, `functions/api/resolveHandle.ts`, `functions/services/vmClient.ts` (delete `initVmSdk` + `vmApiGet`)
- Create: `functions/api/networks.ts`
- Modify tests: `functions/api/claim/__tests__/create.test.ts`, `functions/api/claim/__tests__/status.test.ts` (adapt mocks)
- Test: extend `functions/services/__tests__/vmClient.test.ts` if needed (no new exports expected)

**Interfaces:**
- Produces: `GET /api/networks` → `{ "networks": { "mainnet": boolean, "preview": boolean } }`, no API key required, CORS like other endpoints. Task 6/7 consume it.

Specifics:

| File | Change |
|---|---|
| `getRewards.ts` | `sdk.getRewards(addr)` → `vmFetch(env, network, 'get_rewards', { staking_address: addr })`; both `sdk.getTokens()` calls → `vmFetch(env, network, 'get_tokens')`; add origin threading + `vmConfigFor` gate; keep all merge logic byte-identical |
| `getCustomRewards.ts` | `getCustomRequest({...})` → `vmFetch(env, network, 'custom_request', { staking_address, session_id, selected, ...(overhead_fee != null ? { overhead_fee } : {}) })` — note the sdk sent the same fields as query params (GET); `selected` is already a comma-joined string at this call site — verify and keep whatever serialization the current code produces; add origin threading |
| `claim/create.ts` | same `custom_request` migration, keep `sessionIdFor` and `unlocks_special` param |
| `claim/status.ts` | replace `vmApiGet(env, 'check_status_custom_request', {...})` with `vmFetch(env, resolveNetwork(request), 'check_status_custom_request', {...})` — this makes the network param the deposit-flow frontend ALREADY SENDS finally effective |
| `resolveHandle.ts` | before the Koios call: `if (resolveNetwork(request) === 'preview') return errorResponse('ADA Handle resolution is only available on mainnet', 400, origin);` (Koios is mainnet-only) |
| `networks.ts` (new) | `onRequestGet`: `return jsonResponse({ networks: networksAvailable(env) }, 200, origin)` — NO `requireApiKey` (availability booleans are not sensitive; the frontend needs this before anything else works). `onRequestOptions` with origin. |
| `vmClient.ts` | delete `initVmSdk` and `vmApiGet` (last callers gone); delete the now-unused vm-sdk comment block |

Wait — `resolveHandle` today is called for `$handle` lookups on the claim page, which currently serves preview data; after this task a preview-network user typing `$handle` gets a clear 400 instead of a mainnet address that silently returns empty preview rewards. That is the intended behavior change; note it in the PR body.

- [ ] **Step 1: Migrate per the table; create `networks.ts`; delete `initVmSdk`/`vmApiGet`**
- [ ] **Step 2: Adapt claim tests' mocks; add a `networks.ts` test** in `functions/api/__tests__/networks.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { onRequestGet } from '../networks';
import type { Env } from '../../types/env';

const baseEnv = { VITE_VM_API_KEY: 'k', VM_WEB_PROFILES: {} as never } as Env;

function ctx(env: Env) {
  return {
    request: new Request('https://x/api/networks'),
    env,
  } as unknown as Parameters<typeof onRequestGet>[0];
}

describe('GET /api/networks', () => {
  it('reports preview-only under legacy env', async () => {
    const res = await onRequestGet(ctx(baseEnv));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ networks: { mainnet: false, preview: true } });
  });
  it('reports mainnet when configured', async () => {
    const env = { ...baseEnv, VM_BASE_URL_MAINNET: 'https://vm.example', VM_API_KEY_MAINNET: 'mk' };
    const res = await onRequestGet(ctx(env));
    expect(await res.json()).toEqual({ networks: { mainnet: true, preview: true } });
  });
});
```

- [ ] **Step 3: Run** `npx vitest run functions/` — Expected: PASS. Confirm `grep -rn "initVmSdk\|vmApiGet" functions/ src/ workers/` returns nothing.
- [ ] **Step 4: Run** `npm test` and `npm run build` — Expected: green/clean.
- [ ] **Step 5: Commit**

```bash
git add functions/ && git commit -m "feat(network): claim endpoints route per network; add /api/networks; drop vm-sdk client (#175)"
```

---

### Task 5: Frontend — apiClient network param + switch-time state reset

**Files:**
- Modify: `src/api/client.ts`
- Modify: `src/main.tsx` (or wherever the `QueryClient` instance is constructed — locate with `grep -rn "new QueryClient" src/`)
- Modify: `src/features/deposit/hooks/useClaimStatus.ts` (remove its now-duplicate manual `network` param append; KEEP `network` in its queryKey)
- Test: `src/api/__tests__/client.test.ts` (create)

**Interfaces:**
- Produces: every `apiClient.get/post` URL carries `network=<selectedNetwork>`; network switch ⇒ `queryClient.clear()` + claim store `reset()` + `setLookupAddress(null)`.

- [ ] **Step 1: Write failing tests**

```ts
// src/api/__tests__/client.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/api/client';
import { useNetworkStore } from '@/store/network-state';

afterEach(() => {
  vi.unstubAllGlobals();
  useNetworkStore.setState({ selectedNetwork: 'mainnet' });
});

function stubFetch() {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), { status: 200 }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('apiClient network param', () => {
  it('appends network to bare URLs', async () => {
    const fetchMock = stubFetch();
    useNetworkStore.setState({ selectedNetwork: 'preview' });
    await apiClient.get('/api/getPools');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/getPools?network=preview');
  });

  it('appends with & when a query string exists', async () => {
    const fetchMock = stubFetch();
    useNetworkStore.setState({ selectedNetwork: 'mainnet' });
    await apiClient.get('/api/getRewards?walletId=stake1x');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/getRewards?walletId=stake1x&network=mainnet');
  });

  it('appends on POST too', async () => {
    const fetchMock = stubFetch();
    useNetworkStore.setState({ selectedNetwork: 'preview' });
    await apiClient.post('/api/getCustomRewards', { a: 1 });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/getCustomRewards?network=preview');
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/api/__tests__/client.test.ts` — Expected: FAIL (URLs lack the param).

- [ ] **Step 3: Implement**

`src/api/client.ts` — add at top:

```ts
import { useNetworkStore } from '@/store/network-state';

function withNetwork(url: string): string {
  const network = useNetworkStore.getState().selectedNetwork;
  return `${url}${url.includes('?') ? '&' : '?'}network=${network}`;
}
```

and change the two fetch call sites: `fetch(url)` → `fetch(withNetwork(url))`, `fetch(url, {...})` → `fetch(withNetwork(url), {...})`.

In the file constructing the `QueryClient`, after its construction:

```ts
import { useNetworkStore } from '@/store/network-state';
import { useClaimStore } from '@/store/claim-state';

useNetworkStore.subscribe((state, prev) => {
  if (state.selectedNetwork === prev.selectedNetwork) return;
  const claim = useClaimStore.getState();
  claim.reset();
  claim.setLookupAddress(null);
  queryClient.clear();
});
```

In `src/features/deposit/hooks/useClaimStatus.ts`, delete only the line(s) adding `network` to its `URLSearchParams` (the param now arrives via `apiClient`); keep `network` in the queryKey and in the hook's signature.

- [ ] **Step 4: Run** `npx vitest run src/api/__tests__/client.test.ts` then `npm test` and `npm run build` — Expected: all green/clean.
- [ ] **Step 5: Commit**

```bash
git add src/api/client.ts src/main.tsx src/features/deposit/hooks/useClaimStatus.ts src/api/__tests__/client.test.ts
git commit -m "feat(network): apiClient sends network; cache and claim state reset on switch (#175)"
```

(If the QueryClient lives in a different file than `src/main.tsx`, stage that file instead.)

---

### Task 6: Network-scoped query keys + ClaimPage network guard

**Files:**
- Modify: `src/pages/ClaimPage.tsx` (block claim creation on wallet/selected-network mismatch)
- Modify: `src/features/rewards/api/pools.queries.ts` (key `['pools']` → `['pools', network]`)
- Modify: `src/features/team/api/team.queries.ts` (`['whitelisted-pools']` → `['whitelisted-pools', network]`)
- Modify: `src/features/rewards/components/QueueCount.tsx` (`['queue', 'pending_tx_count']` → `['queue', 'pending_tx_count', network]`)
- Modify: `src/features/rewards/api/fees.queries.ts` (`['estimateFees', tokenCount]` → `['estimateFees', tokenCount, network]`)
- Modify: `src/features/claim/api/claim.queries.ts` (`['claim-status', requestId, stakeAddress]` → `['claim-status', requestId, stakeAddress, network]`)

**Interfaces:** none new. In each file: `const network = useNetworkStore((s) => s.selectedNetwork);` inside the hook/component (import from `@/store/network-state`), appended as the last key element. Address-keyed queries (`rewards`, `history`, `preferences`, `profile`, `reward-breakdown`, `delivered-rewards`) intentionally do NOT gain a network component — stake addresses are network-prefixed (`stake1…` vs `stake_test1…`), and `queryClient.clear()` covers the switch; do not modify them.

- [ ] **Step 1: Apply the five key changes**

- [ ] **Step 2: ClaimPage guard** — in `src/pages/ClaimPage.tsx`, add imports:

```ts
import { useNetworkStore, networkFromId } from '@/store/network-state';
```

inside the component read the wallet network alongside the existing `useWalletStore` destructure (add `networkId` to it: `const { stakeAddress, connected, networkId } = useWalletStore();`), then:

```ts
const selectedNetwork = useNetworkStore((s) => s.selectedNetwork);
const networkMatches = !connected || networkFromId(networkId) === selectedNetwork;
```

and change the `canClaim` line to include it:

```ts
const canClaim =
  walletReady &&
  networkMatches &&
  lookupAddress?.toLowerCase() === stakeAddress?.toLowerCase();
```

(`claimDisabled` already derives from `canClaim`, so the claim button disables and the existing "connect this wallet" hero hint shows; the NetworkMismatchBanner in MainLayout explains why.)

- [ ] **Step 3: Run** `npm test` and `npm run build` — Expected: green/clean (these keys have no test assertions today).
- [ ] **Step 4: Commit**

```bash
git add src/pages/ClaimPage.tsx src/features/rewards/api/pools.queries.ts src/features/team/api/team.queries.ts src/features/rewards/components/QueueCount.tsx src/features/rewards/api/fees.queries.ts src/features/claim/api/claim.queries.ts
git commit -m "feat(network): network-scoped query keys and claim network guard (#175)"
```

---

### Task 7: Availability-aware NetworkSelector + fallback

**Files:**
- Create: `src/features/preferences/api/networks.queries.ts`
- Modify: `src/features/preferences/components/NetworkSelector.tsx`
- Modify: `src/layouts/MainLayout.tsx`
- Test: `src/features/preferences/__tests__/networks.queries.test.tsx` (create)

**Interfaces:**
- Produces: `useNetworks(): UseQueryResult<{ mainnet: boolean; preview: boolean }>` from `GET /api/networks` (Task 4's endpoint).

- [ ] **Step 1: Write the failing hook test**

```tsx
// src/features/preferences/__tests__/networks.queries.test.tsx
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNetworks } from '@/features/preferences/api/networks.queries';

afterEach(() => vi.unstubAllGlobals());

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useNetworks', () => {
  it('returns the availability map', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ networks: { mainnet: false, preview: true } }), { status: 200 }),
      ),
    );
    const { result } = renderHook(() => useNetworks(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual({ mainnet: false, preview: true }));
  });
});
```

- [ ] **Step 2: Run to verify failure** — module not found. Then implement:

```ts
// src/features/preferences/api/networks.queries.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface NetworksResponse {
  networks: { mainnet: boolean; preview: boolean };
}

export function useNetworks() {
  return useQuery<{ mainnet: boolean; preview: boolean }, Error>({
    queryKey: ['networks'],
    queryFn: async () => (await apiClient.get<NetworksResponse>('/api/networks')).networks,
    staleTime: 5 * 60_000,
  });
}
```

- [ ] **Step 3: NetworkSelector** — consume `useNetworks()`; on each `ListboxOption` set `disabled={available ? undefined : true}` where `available = networks?.[value] ?? true` (optimistic while loading), and when unavailable append a muted `· not yet available` note to the option's description line. Keep all existing styling classes; headlessui exposes `data-[disabled]` — add `data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed` to the option className.

- [ ] **Step 4: MainLayout fallback effect** — in `src/layouts/MainLayout.tsx`:

```ts
import { useEffect } from 'react';
import { useNetworks } from '@/features/preferences/api/networks.queries';
import { useNetworkStore } from '@/store/network-state';

// inside the component:
const { data: networks } = useNetworks();
useEffect(() => {
  if (!networks) return;
  const { selectedNetwork, setNetwork } = useNetworkStore.getState();
  if (networks[selectedNetwork]) return;
  const fallback = (['mainnet', 'preview'] as const).find((n) => networks[n]);
  if (fallback) setNetwork(fallback);
}, [networks]);
```

- [ ] **Step 5: Run** `npx vitest run src/features/preferences/` then `npm test` and `npm run build` — Expected: green/clean.
- [ ] **Step 6: Commit**

```bash
git add src/features/preferences/ src/layouts/MainLayout.tsx
git commit -m "feat(network): availability-aware selector with automatic fallback (#175)"
```

---

### Task 8: token-image-sync worker network suffix

**Files:**
- Modify: `workers/token-image-sync/src/index.ts` and `workers/token-image-sync/src/sync.ts`

**Interfaces:** the worker stays pinned to one network via its own env (`VM_BASE_URL`, unchanged); it must simply write/read the KV keys the Pages Functions now expect.

- [ ] **Step 1:** Add `const SYNC_NETWORK = 'preview';` (with a comment: change alongside the worker's `VM_BASE_URL` when pointing it at mainnet) and suffix both KV keys: `__internal:tokens_cache` → `` `__internal:tokens_cache:${SYNC_NETWORK}` ``, `__internal:image_sync_cursor` → `` `__internal:image_sync_cursor:${SYNC_NETWORK}` `` (match however the constants are currently defined in those two files — the worker has its own copies, not imports from functions/).
- [ ] **Step 2:** Run `npm test` (worker tests are in the vitest include glob) and `npm run build` — Expected: green/clean.
- [ ] **Step 3: Commit**

```bash
git add workers/token-image-sync/
git commit -m "feat(network): network-suffixed KV keys in token-image-sync worker (#175)"
```

---

### Task 9: Whole-PR verification and stacked PR

**Files:** none (verification + git/GitHub only)

- [ ] **Step 1: Full gates** — `npm test`, `npm run build`, `npx eslint src functions workers --max-warnings=0 || npx eslint src functions` (repo has 3 pre-existing warnings; require: no NEW warnings vs `git stash`-free baseline on the parent branch).
- [ ] **Step 2: Local smoke** — `npx wrangler pages dev` (or the repo's documented local command): hit `/api/networks` (expect `{"networks":{"mainnet":false,"preview":true}}` with only legacy env), `/api/getPools?network=preview` (expect data), `/api/getPools?network=mainnet` (expect 503 `network_unavailable`).
- [ ] **Step 3: Push and open the stacked PR**

```bash
git push -u origin feat/network-switching
gh pr create --repo TosiDrop/web --base feat/claim-store-lookup --head feat/network-switching \
  --title "feat(network): end-to-end network switching (#175)" \
  --body-file <PR body file — write it to the scratchpad, covering: closes #175; vm-sdk client dropped (no base-URL injection, module-global token, zero type imports — kept only as a dependency until #144 decides its fate); backend defaults to preview without ?network=; mainnet gated on VM_BASE_URL_MAINNET/VM_API_KEY_MAINNET (503 network_unavailable until provisioned); KV/edge caches network-suffixed; /api/networks availability endpoint; selector disables unavailable networks with auto-fallback; behavior change: $handle lookup returns a clear 400 on preview (Koios is mainnet-only); deferred-from-PR-1 item addressed here: claim-store cleanup on network switch is centralized in the store subscription (wallet-disconnect cleanup remains page-level, unchanged); stacked on #222>
```

Expected: PR URL printed.
