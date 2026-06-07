# Reward Breakdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show users where rewards came from (distribution rule, pool, epoch, per token) via a cached `/api/getRewardBreakdown` Pages Function (#192) and a `RewardBreakdown` component replacing the Analytics tab placeholder (#191).

**Architecture:** The endpoint clones the `getDeliveredRewards` proxy pattern over vm-sdk's existing `getRewardBreakdown()` (typed `any[]` — so the client owns a tolerant, pure `normalizeBreakdown` that probes common field names and drops uninterpretable rows). A hook joins with `/api/getTokens` and groups by token; the component renders expandable per-token groups.

**Tech Stack:** Cloudflare Pages Functions, vm-sdk 1.0.5, vitest, React 18 + TanStack Query, Tailwind.

**Branch:** `feat/reward-breakdown` created off `feat/withdrawal-history` (needs the exported `tickerFor`/`decimalsFor` helpers from that branch). Spec: `docs/superpowers/specs/2026-06-03-reward-breakdown-design.md`.

---

### Task 1: `/api/getRewardBreakdown` endpoint (#192)

**Files:**
- Create: `functions/api/getRewardBreakdown.ts`
- Create: `functions/api/__tests__/getRewardBreakdown.test.ts`

- [ ] **Step 1: Branch**

```bash
git checkout -b feat/reward-breakdown feat/withdrawal-history
```

- [ ] **Step 2: Write failing tests**

`functions/api/__tests__/getRewardBreakdown.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Env } from '../../types/env';

const sdkBreakdown = vi.fn();
vi.mock('../../services/vmClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/vmClient')>();
  return {
    ...actual,
    initVmSdk: async () => ({ getRewardBreakdown: sdkBreakdown }),
    withCache: async (_req: Request, _ttl: number, fetchFn: () => Promise<unknown>) =>
      new Response(JSON.stringify(await fetchFn()), { status: 200 }),
  };
});

import { onRequestGet } from '../getRewardBreakdown';

type Ctx = Parameters<typeof onRequestGet>[0];

const STAKE = 'stake1' + 'u'.repeat(40);

function ctx(qs: string, env: Partial<Env> = {}): Ctx {
  return {
    request: new Request(`https://x/api/getRewardBreakdown${qs}`, {
      headers: { Origin: 'http://localhost:5173' },
    }),
    env: { VITE_VM_API_KEY: 'k', ...env } as Env,
    waitUntil: vi.fn(),
  } as unknown as Ctx;
}

describe('GET /api/getRewardBreakdown', () => {
  beforeEach(() => {
    sdkBreakdown.mockReset();
    sdkBreakdown.mockResolvedValue({
      rewards: [{ token: 'lovelace', amount: '1000000' }],
      promises: [],
      vending_address: 'addr1x',
      withdrawal_fee: '500000',
    });
  });

  it('400 when staking_address missing', async () => {
    const res = await onRequestGet(ctx(''));
    expect(res.status).toBe(400);
  });

  it('500 when the API key is not configured', async () => {
    const res = await onRequestGet(ctx(`?staking_address=${STAKE}`, { VITE_VM_API_KEY: '' }));
    expect(res.status).toBe(500);
  });

  it('passes the staking address through to the SDK and returns its payload', async () => {
    const res = await onRequestGet(ctx(`?staking_address=${STAKE}`));
    expect(res.status).toBe(200);
    expect(sdkBreakdown).toHaveBeenCalledWith(STAKE);
    const body = await res.json();
    expect(body.vending_address).toBe('addr1x');
    expect(body.rewards).toHaveLength(1);
  });

  it('maps SDK failures to a 500', async () => {
    sdkBreakdown.mockRejectedValue(new Error('vm down'));
    const res = await onRequestGet(ctx(`?staking_address=${STAKE}`));
    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run functions/api/__tests__/getRewardBreakdown.test.ts`
Expected: FAIL (module does not exist).

- [ ] **Step 4: Implement `functions/api/getRewardBreakdown.ts`**

```ts
import type { Env } from '../types/env';
import { initVmSdk, requireApiKey, withCache, errorResponse, optionsResponse } from '../services/vmClient';

const CACHE_TTL = 300;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const staking_address = new URL(request.url).searchParams.get('staking_address');

  if (!staking_address) {
    return errorResponse('staking_address is required', 400, origin);
  }

  const keyError = requireApiKey(env, origin);
  if (keyError) return keyError;

  try {
    return await withCache(request, CACHE_TTL, async () => {
      const sdk = await initVmSdk(env);
      return sdk.getRewardBreakdown(staking_address);
    }, context.waitUntil.bind(context));
  } catch (error) {
    console.error('getRewardBreakdown error:', error);
    return errorResponse('Failed to fetch reward breakdown', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
```

- [ ] **Step 5: Run, then commit**

```bash
npx vitest run functions/api/__tests__/getRewardBreakdown.test.ts
git add functions
git commit -m "feat(breakdown): cached /api/getRewardBreakdown proxy (#192)"
```

---

### Task 2: `normalizeBreakdown` (pure normalizer)

**Files:**
- Create: `src/features/profile/utils/normalizeBreakdown.ts`
- Create: `src/features/profile/__tests__/normalizeBreakdown.test.ts`

- [ ] **Step 1: Write failing tests**

`src/features/profile/__tests__/normalizeBreakdown.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalizeBreakdown } from '../utils/normalizeBreakdown';

const TOKENS = {
  'pol.61626364': { ticker: 'ABCD', decimals: '4', logo: 'http://l/abcd' },
};

describe('normalizeBreakdown', () => {
  it('normalizes canonical reward rows with token metadata', () => {
    const out = normalizeBreakdown(
      {
        rewards: [{ token: 'pol.61626364', amount: '15000', epoch: 500, pool: 'TOSI', rule: 'delegator' }],
        promises: [],
      },
      TOKENS,
    );
    expect(out).toEqual([{
      token: 'pol.61626364',
      ticker: 'ABCD',
      logo: 'http://l/abcd',
      amount: 1.5,
      epoch: 500,
      pool: 'TOSI',
      rule: 'delegator',
      kind: 'reward',
    }]);
  });

  it('probes alternate field names and tags promises', () => {
    const out = normalizeBreakdown(
      {
        rewards: [],
        promises: [{ token_id: 'lovelace', quantity: 2_000_000, pool_id: 'pool1abc', source: 'fixed' }],
      },
      {},
    );
    expect(out).toEqual([{
      token: 'lovelace',
      ticker: 'ADA',
      logo: undefined,
      amount: 2,
      epoch: null,
      pool: 'pool1abc',
      rule: 'fixed',
      kind: 'promise',
    }]);
  });

  it('drops rows lacking token or amount and tolerates garbage', () => {
    const out = normalizeBreakdown(
      {
        rewards: [null, 42, 'x', {}, { token: 'lovelace' }, { amount: '5' }, { token: 'lovelace', amount: 'NaN-ish' }],
        promises: undefined,
      } as never,
      {},
    );
    expect(out).toEqual([]);
  });

  it('handles a null payload', () => {
    expect(normalizeBreakdown(null, {})).toEqual([]);
    expect(normalizeBreakdown(undefined, {})).toEqual([]);
  });

  it('decodes hex asset names when the token map has no entry', () => {
    const out = normalizeBreakdown(
      { rewards: [{ token: 'pol.434841', amount: '7' }], promises: [] },
      {},
    );
    expect(out[0].ticker).toBe('CHA');
    expect(out[0].amount).toBe(7); // 0 decimals default
  });
});
```

- [ ] **Step 2: Run to verify failure, then implement**

Run: `npx vitest run src/features/profile/__tests__/normalizeBreakdown.test.ts` → FAIL.

`src/features/profile/utils/normalizeBreakdown.ts`:

```ts
import { tickerFor, decimalsFor, type TokenMap } from '@/features/history/api/history.queries';

export interface BreakdownEntry {
  token: string;
  ticker: string;
  logo?: string;
  amount: number;
  epoch: number | null;
  pool: string | null;
  rule: string | null;
  kind: 'reward' | 'promise';
}

interface RawBreakdown {
  rewards?: unknown[];
  promises?: unknown[];
}

function firstString(row: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === 'string' && v) return v;
  }
  return null;
}

function firstValue(row: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) return row[k];
  }
  return undefined;
}

// The VM API types this payload as any[]; probe common field spellings and
// drop anything we cannot interpret so one malformed row never blanks the tab.
export function normalizeBreakdown(
  raw: RawBreakdown | null | undefined,
  tokenMap: TokenMap,
): BreakdownEntry[] {
  const out: BreakdownEntry[] = [];

  const push = (rows: unknown[] | undefined, kind: 'reward' | 'promise') => {
    for (const r of rows ?? []) {
      if (!r || typeof r !== 'object') continue;
      const row = r as Record<string, unknown>;
      const token = firstString(row, ['token', 'token_id', 'asset', 'asset_id']);
      const amountRaw = firstValue(row, ['amount', 'quantity']);
      if (!token || amountRaw === undefined) continue;
      const amountNum = Number(amountRaw);
      if (Number.isNaN(amountNum)) continue;

      const info = tokenMap[token];
      const decimals = decimalsFor(token, info);
      const epochRaw = firstValue(row, ['epoch']);
      const epochNum = Number(epochRaw);

      out.push({
        token,
        ticker: tickerFor(token, info),
        logo: info?.logo,
        amount: amountNum / Math.pow(10, decimals),
        epoch: epochRaw !== undefined && !Number.isNaN(epochNum) ? epochNum : null,
        pool: firstString(row, ['pool', 'pool_id', 'pool_ticker']),
        rule: firstString(row, ['rule', 'source', 'distribution', 'reason']),
        kind,
      });
    }
  };

  push(raw?.rewards, 'reward');
  push(raw?.promises, 'promise');
  return out;
}
```

- [ ] **Step 3: Run, then commit**

```bash
npx vitest run src/features/profile/__tests__/normalizeBreakdown.test.ts
git add src/features/profile
git commit -m "feat(breakdown): tolerant normalizer for the VM breakdown payload"
```

---

### Task 3: `useRewardBreakdown` hook (#191 data layer)

**Files:**
- Create: `src/features/profile/hooks/useRewardBreakdown.ts`
- Create: `src/features/profile/__tests__/useRewardBreakdown.test.tsx`

- [ ] **Step 1: Write failing test**

`src/features/profile/__tests__/useRewardBreakdown.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const getMock = vi.fn();
vi.mock('@/api/client', () => ({
  apiClient: { get: (...a: unknown[]) => getMock(...a) },
}));

import { useRewardBreakdown } from '../hooks/useRewardBreakdown';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const STAKE = 'stake1' + 'u'.repeat(40);

describe('useRewardBreakdown', () => {
  beforeEach(() => getMock.mockReset());

  it('is disabled without a stake address', () => {
    renderHook(() => useRewardBreakdown(null), { wrapper });
    expect(getMock).not.toHaveBeenCalled();
  });

  it('groups normalized entries by token with totals', async () => {
    getMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/getRewardBreakdown')) {
        return Promise.resolve({
          rewards: [
            { token: 'lovelace', amount: '1000000', epoch: 500, pool: 'TOSI', rule: 'delegator' },
            { token: 'lovelace', amount: '2000000', epoch: 501, pool: 'TOSI', rule: 'delegator' },
          ],
          promises: [{ token: 'lovelace', amount: '500000', rule: 'fixed' }],
        });
      }
      return Promise.resolve({});
    });
    const { result } = renderHook(() => useRewardBreakdown(STAKE), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toHaveLength(1);
    const group = result.current.data![0];
    expect(group.ticker).toBe('ADA');
    expect(group.total).toBeCloseTo(3.5);
    expect(group.entries).toHaveLength(3);
    expect(group.entries[2].kind).toBe('promise');
  });
});
```

- [ ] **Step 2: Run to verify failure, then implement**

Run: `npx vitest run src/features/profile/__tests__/useRewardBreakdown.test.tsx` → FAIL.

`src/features/profile/hooks/useRewardBreakdown.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { TokenMap } from '@/features/history/api/history.queries';
import { normalizeBreakdown, type BreakdownEntry } from '@/features/profile/utils/normalizeBreakdown';

export interface BreakdownGroup {
  token: string;
  ticker: string;
  logo?: string;
  total: number;
  entries: BreakdownEntry[];
}

interface RawBreakdownResponse {
  rewards?: unknown[];
  promises?: unknown[];
  vending_address?: string;
  withdrawal_fee?: string;
}

export function useRewardBreakdown(stakeAddress: string | null) {
  return useQuery<BreakdownGroup[], Error>({
    queryKey: ['reward-breakdown', stakeAddress],
    enabled: !!stakeAddress,
    staleTime: 60_000,
    queryFn: async () => {
      if (!stakeAddress) throw new Error('stakeAddress is required');
      const [raw, tokens] = await Promise.all([
        apiClient.get<RawBreakdownResponse>(
          `/api/getRewardBreakdown?staking_address=${encodeURIComponent(stakeAddress)}`,
        ),
        apiClient.get<TokenMap>('/api/getTokens'),
      ]);

      const entries = normalizeBreakdown(raw, tokens);
      const groups = new Map<string, BreakdownGroup>();
      for (const entry of entries) {
        const existing = groups.get(entry.token);
        if (existing) {
          existing.total += entry.amount;
          existing.entries.push(entry);
        } else {
          groups.set(entry.token, {
            token: entry.token,
            ticker: entry.ticker,
            logo: entry.logo,
            total: entry.amount,
            entries: [entry],
          });
        }
      }
      return [...groups.values()].sort((a, b) => b.total - a.total);
    },
  });
}
```

- [ ] **Step 3: Run, then commit**

```bash
npx vitest run src/features/profile
git add src/features/profile
git commit -m "feat(breakdown): useRewardBreakdown hook with token grouping"
```

---

### Task 4: `RewardBreakdown` component + Analytics tab wiring (#191 UI)

**Files:**
- Create: `src/features/profile/components/RewardBreakdown.tsx`
- Modify: `src/pages/ProfilePage.tsx` (AnalyticsTab body)

- [ ] **Step 1: Implement the component**

`src/features/profile/components/RewardBreakdown.tsx`:

```tsx
import { useState } from 'react';
import { IconAlertCircle, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { useWalletStore } from '@/store/wallet-state';
import { useRewardBreakdown, type BreakdownGroup } from '@/features/profile/hooks/useRewardBreakdown';
import type { BreakdownEntry } from '@/features/profile/utils/normalizeBreakdown';

function formatAmount(amount: number): string {
  if (amount >= 1000) return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (amount >= 1) return amount.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return amount.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function TokenAvatar({ logo, ticker }: { logo?: string; ticker: string }) {
  const [failed, setFailed] = useState(false);
  if (logo && !failed) {
    return (
      <img
        src={logo}
        alt=""
        onError={() => setFailed(true)}
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

function EntryRow({ entry }: { entry: BreakdownEntry }) {
  return (
    <li className="flex items-center gap-3 px-5 py-2.5 pl-[4.25rem]">
      <p className="flex flex-1 items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
        {entry.epoch !== null && <span>Epoch {entry.epoch}</span>}
        {entry.epoch !== null && (entry.pool || entry.rule) && <span className="text-slate-700">·</span>}
        {entry.pool && <span>{entry.pool}</span>}
        {entry.pool && entry.rule && <span className="text-slate-700">·</span>}
        {entry.rule && <span>{entry.rule}</span>}
        {entry.kind === 'promise' && (
          <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-medium normal-case tracking-normal text-purple-400">
            Promised
          </span>
        )}
      </p>
      <p className="font-mono text-xs text-emerald-300/95">+{formatAmount(entry.amount)}</p>
    </li>
  );
}

function GroupRow({ group }: { group: BreakdownGroup }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-white/[0.015]"
      >
        {open ? (
          <IconChevronDown size={14} stroke={1.6} className="shrink-0 text-slate-500" />
        ) : (
          <IconChevronRight size={14} stroke={1.6} className="shrink-0 text-slate-500" />
        )}
        <TokenAvatar logo={group.logo} ticker={group.ticker} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{group.ticker}</p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
            {group.entries.length} distribution{group.entries.length === 1 ? '' : 's'}
          </p>
        </div>
        <p className="font-mono text-sm text-emerald-300/95">+{formatAmount(group.total)}</p>
      </button>
      {open && <ul className="divide-y divide-border-subtle/40 border-t border-border-subtle/40 bg-surface-inset/30">{group.entries.map((e, i) => <EntryRow key={i} entry={e} />)}</ul>}
    </li>
  );
}

function StateMessage({ eyebrow, message }: { eyebrow: string; message: string }) {
  return (
    <div className="card-premium px-6 py-16 text-center">
      <p className="label-eyebrow">{eyebrow}</p>
      <p className="mx-auto mt-3 max-w-sm text-sm text-slate-400">{message}</p>
    </div>
  );
}

export function RewardBreakdown() {
  const stakeAddress = useWalletStore((s) => s.stakeAddress);
  const { data, isLoading, error } = useRewardBreakdown(stakeAddress);

  if (!stakeAddress) {
    return (
      <StateMessage
        eyebrow="Not connected"
        message="Connect a wallet to see where your rewards come from."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="card-premium space-y-3 px-5 py-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-surface-inset" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-premium flex items-start gap-3 px-5 py-4 text-sm text-rose-200">
        <IconAlertCircle size={18} stroke={1.6} className="mt-0.5 shrink-0 text-rose-400" />
        <div>
          <p className="font-medium text-white">Couldn't load the breakdown</p>
          <p className="mt-0.5 text-xs text-slate-400">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <StateMessage
        eyebrow="No breakdown data yet"
        message="Once rewards are allocated to you, their source pools and rules show up here."
      />
    );
  }

  return (
    <section className="card-premium overflow-hidden">
      <header className="flex items-center justify-between border-b border-border-subtle/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <p className="label-eyebrow">By source</p>
          <span className="rounded-full border border-border-subtle bg-surface-inset/70 px-2 py-0.5 font-mono text-[10px] text-slate-300">
            {data.length}
          </span>
        </div>
        <p className="text-[11px] text-slate-500">Largest totals first</p>
      </header>
      <ul className="divide-y divide-border-subtle/50">
        {data.map((group) => (
          <GroupRow key={group.token} group={group} />
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Wire the Analytics tab**

In `src/pages/ProfilePage.tsx` add
`import { RewardBreakdown } from '@/features/profile/components/RewardBreakdown';` and
replace `AnalyticsTab` with:

```tsx
function AnalyticsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-light tracking-tight text-white">
          Reward <span className="font-semibold">analytics</span>
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Where your rewards came from — by pool, epoch, and distribution rule.
        </p>
      </div>
      <RewardBreakdown />
    </div>
  );
}
```

If `EmptyTab` has no remaining usage after this change, delete it.

- [ ] **Step 3: Full verification, commit, push, PR**

```bash
npx vitest run
npx tsc -b
npx eslint src functions --max-warnings 0
npm run build
git add -A src
git commit -m "feat(breakdown): RewardBreakdown in the Analytics tab (#191)"
git push -u origin feat/reward-breakdown
gh pr create --base feat/withdrawal-history --title "feat: reward breakdown in Analytics tab (#191 #192)" --body "..."
```

(PR body: closes #191, #192; notes the stacked base and the tolerant normalizer.)
