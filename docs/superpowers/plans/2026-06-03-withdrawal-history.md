# Withdrawal History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist delivered rewards into a D1 `withdrawals` table on read (issue #181), serve them through a paginated/filterable `GET /api/history` (issue #180), and upgrade `HistoryList` to server-driven pagination + date sorting with graceful fallback (issue #179).

**Architecture:** `getDeliveredRewards` upserts rows append-only (`ON CONFLICT DO NOTHING`) via `waitUntil` on cache misses. `/api/history` is a pure D1 reader. The client keeps `useDeliveredRewards` as primary (it triggers sync, covers degraded mode) and switches to server pagination whenever `/api/history` has data.

**Tech Stack:** Cloudflare Pages Functions, D1 (raw SQL), vitest, React 18 + TanStack Query.

**Branch:** `feat/withdrawal-history` created off `feat/favorite-tokens` (stacked). Spec: `docs/superpowers/specs/2026-06-03-withdrawal-history-design.md`.

---

### Task 1: Branch + migration 0003 + shared `hasDb`

**Files:**
- Create: `migrations/0003_create_withdrawals.sql`
- Create: `functions/services/d1.ts`
- Modify: `functions/api/tokenPreferences.ts` (use the shared helper)
- Modify: `wrangler.jsonc` (comment gains the third migration line)

- [ ] **Step 1: Branch**

```bash
git checkout -b feat/withdrawal-history feat/favorite-tokens
```

- [ ] **Step 2: Migration**

`migrations/0003_create_withdrawals.sql`:

```sql
-- Migration: Create withdrawals table syncing the VM API's delivered rewards
-- so history accumulates beyond its ~100-row window. Rows are immutable;
-- sync inserts with ON CONFLICT DO NOTHING. delivered_at is parsed unix
-- seconds (nullable) used for sorting and range filters.
CREATE TABLE IF NOT EXISTS withdrawals (
  stake_address      TEXT NOT NULL,
  reward_id          TEXT NOT NULL,
  token              TEXT NOT NULL,
  amount             TEXT NOT NULL,
  epoch              INTEGER,
  delivered_on       TEXT NOT NULL,
  delivered_at       INTEGER,
  withdrawal_request TEXT,
  synced_at          TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (stake_address, reward_id)
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_stake_time
  ON withdrawals (stake_address, delivered_at DESC);
```

In `wrangler.jsonc`, after the 0002 execute comment line add:

```
  //   wrangler d1 execute tosi-users --remote --file=migrations/0003_create_withdrawals.sql
```

- [ ] **Step 3: Shared `hasDb`**

`functions/services/d1.ts`:

```ts
import type { Env } from '../types/env';

export function hasDb(env: Env): env is Env & { DB: D1Database } {
  return typeof env?.DB?.prepare === 'function';
}
```

In `functions/api/tokenPreferences.ts`, delete the local `hasDb` and
`import { hasDb } from '../services/d1';`.

- [ ] **Step 4: Verify + commit**

```bash
npx vitest run functions
git add -A migrations functions wrangler.jsonc
git commit -m "feat(history): withdrawals migration and shared hasDb helper"
```

---

### Task 2: Sync mechanism in `getDeliveredRewards` (#181)

**Files:**
- Create: `functions/services/withdrawalsSync.ts`
- Create: `functions/api/__tests__/getDeliveredRewards.test.ts`
- Modify: `functions/api/getDeliveredRewards.ts`

- [ ] **Step 1: Write failing tests**

`functions/api/__tests__/getDeliveredRewards.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Env } from '../../types/env';

const sdkGetDelivered = vi.fn();
vi.mock('../../services/vmClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/vmClient')>();
  return {
    ...actual,
    initVmSdk: async () => ({ getDeliveredRewards: sdkGetDelivered }),
    // Bypass the Cache API in tests: always a miss, return the payload directly.
    withCache: async (_req: Request, _ttl: number, fetchFn: () => Promise<unknown>) =>
      new Response(JSON.stringify(await fetchFn()), { status: 200 }),
  };
});

import { onRequestGet } from '../getDeliveredRewards';

type Ctx = Parameters<typeof onRequestGet>[0];

function fakeDb() {
  const calls: { sql: string; binds: unknown[] }[] = [];
  const prepare = (sql: string) => ({
    bind(...b: unknown[]) {
      calls.push({ sql, binds: b });
      return this;
    },
  });
  return {
    prepare,
    batch: vi.fn(async () => []),
    __calls: calls,
  } as unknown as D1Database & { batch: ReturnType<typeof vi.fn>; __calls: typeof calls };
}

const STAKE = 'stake1' + 'u'.repeat(40);

function ctx(env: Partial<Env>, waitUntil = vi.fn()): { ctx: Ctx; waitUntil: ReturnType<typeof vi.fn> } {
  return {
    ctx: {
      request: new Request(`https://x/api/getDeliveredRewards?staking_address=${STAKE}`, {
        headers: { Origin: 'http://localhost:5173' },
      }),
      env: { VITE_VM_API_KEY: 'k', ...env } as Env,
      waitUntil,
    } as unknown as Ctx,
    waitUntil,
  };
}

const VM_ROW = {
  id: 'r1',
  staking_address: STAKE,
  epoch: '500',
  token: 'lovelace',
  amount: '1000000',
  delivered_on: '1750000000',
  withdrawal_request: 'w1',
  expiry: '',
};

describe('getDeliveredRewards sync', () => {
  beforeEach(() => {
    sdkGetDelivered.mockReset();
    sdkGetDelivered.mockResolvedValue([VM_ROW]);
  });

  it('returns the VM payload untouched', async () => {
    const { ctx: c } = ctx({});
    const res = await onRequestGet(c);
    expect(await res.json()).toEqual([VM_ROW]);
  });

  it('does not touch D1 when the binding is absent', async () => {
    const { ctx: c, waitUntil } = ctx({});
    await onRequestGet(c);
    // Only the cache-put waitUntil from the real withCache would appear; our
    // mock bypasses it, so no sync call should be scheduled.
    expect(waitUntil).not.toHaveBeenCalled();
  });

  it('schedules an ON CONFLICT DO NOTHING batch via waitUntil when DB present', async () => {
    const db = fakeDb();
    const { ctx: c, waitUntil } = ctx({ DB: db });
    await onRequestGet(c);
    expect(waitUntil).toHaveBeenCalled();
    await Promise.all(waitUntil.mock.calls.map((call) => call[0]));
    expect(db.batch).toHaveBeenCalledTimes(1);
    expect(db.__calls[0].sql).toContain('ON CONFLICT');
    expect(db.__calls[0].binds).toEqual([
      STAKE, 'r1', 'lovelace', '1000000', 500, '1750000000', 1750000000, 'w1',
    ]);
  });

  it('parses ISO delivered_on and stores null for garbage', async () => {
    const db = fakeDb();
    sdkGetDelivered.mockResolvedValue([
      { ...VM_ROW, id: 'r2', delivered_on: '2026-06-01T00:00:00Z' },
      { ...VM_ROW, id: 'r3', delivered_on: 'not-a-date', epoch: 'x' },
    ]);
    const { ctx: c, waitUntil } = ctx({ DB: db });
    await onRequestGet(c);
    await Promise.all(waitUntil.mock.calls.map((call) => call[0]));
    expect(db.__calls[0].binds[6]).toBe(Math.floor(Date.parse('2026-06-01T00:00:00Z') / 1000));
    expect(db.__calls[1].binds[4]).toBe(null); // epoch 'x' -> null
    expect(db.__calls[1].binds[6]).toBe(null); // unparsable delivered_on
  });

  it('skips rows without an id and survives a D1 failure', async () => {
    const db = fakeDb();
    (db.batch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    sdkGetDelivered.mockResolvedValue([{ ...VM_ROW, id: '' }, VM_ROW]);
    const { ctx: c, waitUntil } = ctx({ DB: db });
    const res = await onRequestGet(c);
    expect(res.status).toBe(200);
    await Promise.all(waitUntil.mock.calls.map((call) => call[0])); // must not reject
    expect(db.__calls).toHaveLength(1); // only the row with an id
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run functions/api/__tests__/getDeliveredRewards.test.ts`
Expected: FAIL (no sync exists; waitUntil never called with DB present).

- [ ] **Step 3: Implement the sync service**

`functions/services/withdrawalsSync.ts`:

```ts
// Builds append-only upserts from the VM API's delivered-rewards payload.
// Mirrors the client-side parseDeliveredOn heuristic in
// src/features/history/api/history.queries.ts.
export interface VmDeliveredReward {
  id: string;
  token: string;
  amount: string | number;
  epoch?: string | number;
  delivered_on: string | number;
  withdrawal_request?: string;
}

export function toUnixSeconds(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isNaN(n) && n > 1_000_000_000 && n < 10_000_000_000) return Math.floor(n);
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : Math.floor(t / 1000);
}

export function buildWithdrawalUpserts(
  db: D1Database,
  stakeAddress: string,
  rows: unknown,
): D1PreparedStatement[] {
  if (!Array.isArray(rows)) return [];
  const stmts: D1PreparedStatement[] = [];
  for (const raw of rows as Partial<VmDeliveredReward>[]) {
    if (!raw || typeof raw.id !== 'string' || !raw.id || typeof raw.token !== 'string') continue;
    const epochNum = Number(raw.epoch);
    const deliveredOn = String(raw.delivered_on ?? '');
    stmts.push(
      db
        .prepare(
          'INSERT INTO withdrawals (stake_address, reward_id, token, amount, epoch, delivered_on, delivered_at, withdrawal_request) ' +
            'VALUES (?, ?, ?, ?, ?, ?, ?, ?) ' +
            'ON CONFLICT (stake_address, reward_id) DO NOTHING',
        )
        .bind(
          stakeAddress,
          raw.id,
          raw.token,
          String(raw.amount ?? ''),
          Number.isNaN(epochNum) ? null : epochNum,
          deliveredOn,
          toUnixSeconds(deliveredOn),
          raw.withdrawal_request ?? null,
        ),
    );
  }
  return stmts;
}
```

- [ ] **Step 4: Wire it into the endpoint**

`functions/api/getDeliveredRewards.ts` — the `withCache` callback becomes:

```ts
import { hasDb } from '../services/d1';
import { buildWithdrawalUpserts } from '../services/withdrawalsSync';
```

```ts
    return await withCache(request, CACHE_TTL, async () => {
      const sdk = await initVmSdk(env);
      const input: { staking_address: string; token_id?: string } = { staking_address };
      if (token_id) input.token_id = token_id;
      const data = await sdk.getDeliveredRewards(input);

      // #181: accumulate history beyond the VM window. Append-only; a D1
      // hiccup must never break the read path.
      if (hasDb(env)) {
        const stmts = buildWithdrawalUpserts(env.DB, staking_address, data);
        if (stmts.length > 0) {
          context.waitUntil(
            env.DB.batch(stmts).then(
              () => undefined,
              (err) => console.error('withdrawals sync error:', err),
            ),
          );
        }
      }
      return data;
    }, context.waitUntil.bind(context));
```

- [ ] **Step 5: Run, then commit**

```bash
npx vitest run functions
git add functions
git commit -m "feat(history): sync delivered rewards into D1 withdrawals on read"
```

---

### Task 3: `GET /api/history` (#180)

**Files:**
- Create: `functions/api/history.ts`
- Create: `functions/api/__tests__/history.test.ts`

- [ ] **Step 1: Write failing tests**

`functions/api/__tests__/history.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import type { Env } from '../../types/env';
import { onRequestGet } from '../history';

type Ctx = Parameters<typeof onRequestGet>[0];

const STAKE = 'stake1' + 'u'.repeat(40);

function fakeDb(rows: unknown[], total: number) {
  const calls: { sql: string; binds: unknown[] }[] = [];
  const prepare = (sql: string) => ({
    _sql: sql,
    bind(...b: unknown[]) {
      calls.push({ sql, binds: b });
      return this;
    },
    all: async () => ({ results: sql.includes('COUNT') ? [{ total }] : rows }),
    first: async () => ({ total }),
  });
  return { prepare, __calls: calls } as unknown as D1Database & { __calls: typeof calls };
}

function ctx(qs: string, env: Partial<Env>): Ctx {
  return {
    request: new Request(`https://x/api/history?${qs}`, {
      headers: { Origin: 'http://localhost:5173' },
    }),
    env: { VITE_VM_API_KEY: 'k', ...env } as Env,
  } as unknown as Ctx;
}

const ROW = {
  reward_id: 'r1',
  token: 'lovelace',
  amount: '1000000',
  epoch: 500,
  delivered_on: '1750000000',
  delivered_at: 1750000000,
  withdrawal_request: 'w1',
};

describe('GET /api/history', () => {
  it('400 when staking_address missing', async () => {
    const res = await onRequestGet(ctx('', {}));
    expect(res.status).toBe(400);
  });

  it('400 for a bad limit', async () => {
    const res = await onRequestGet(ctx(`staking_address=${STAKE}&limit=0`, {}));
    expect(res.status).toBe(400);
    const res2 = await onRequestGet(ctx(`staking_address=${STAKE}&limit=101`, {}));
    expect(res2.status).toBe(400);
  });

  it('degrades without a DB binding', async () => {
    const res = await onRequestGet(ctx(`staking_address=${STAKE}`, {}));
    const body = await res.json();
    expect(body).toEqual({
      items: [], page: 1, limit: 50, total: 0, hasMore: false, degraded: true,
    });
  });

  it('returns camelCase items with paging metadata', async () => {
    const db = fakeDb([ROW], 1);
    const res = await onRequestGet(ctx(`staking_address=${STAKE}`, { DB: db }));
    const body = await res.json();
    expect(body).toEqual({
      items: [{
        rewardId: 'r1', token: 'lovelace', amount: '1000000', epoch: 500,
        deliveredOn: '1750000000', deliveredAt: 1750000000, withdrawalRequest: 'w1',
      }],
      page: 1, limit: 50, total: 1, hasMore: false,
    });
  });

  it('derives hasMore from the limit+1 probe row', async () => {
    const rows = [ROW, { ...ROW, reward_id: 'r2' }, { ...ROW, reward_id: 'r3' }];
    const db = fakeDb(rows, 30);
    const res = await onRequestGet(ctx(`staking_address=${STAKE}&limit=2`, { DB: db }));
    const body = await res.json();
    expect(body.items).toHaveLength(2);
    expect(body.hasMore).toBe(true);
    expect(body.total).toBe(30);
  });

  it('applies token, date-range, order, and page params to the SQL', async () => {
    const db = fakeDb([], 0);
    await onRequestGet(ctx(
      `staking_address=${STAKE}&token=lovelace&from=1700000000&to=2026-06-01&order=asc&page=3&limit=10`,
      { DB: db },
    ));
    const dataCall = db.__calls.find((c) => !c.sql.includes('COUNT'))!;
    expect(dataCall.sql).toContain('token = ?');
    expect(dataCall.sql).toContain('delivered_at >= ?');
    expect(dataCall.sql).toContain('delivered_at <= ?');
    expect(dataCall.sql).toContain('ASC');
    // binds: stake, token, from, to, limit+1, offset
    expect(dataCall.binds).toEqual([
      STAKE, 'lovelace', 1700000000, Math.floor(Date.parse('2026-06-01') / 1000), 11, 20,
    ]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run functions/api/__tests__/history.test.ts`
Expected: FAIL (module does not exist).

- [ ] **Step 3: Implement `functions/api/history.ts`**

```ts
import type { Env } from '../types/env';
import { jsonResponse, errorResponse, optionsResponse } from '../services/vmClient';
import { hasDb } from '../services/d1';
import { toUnixSeconds } from '../services/withdrawalsSync';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

interface WithdrawalRow {
  reward_id: string;
  token: string;
  amount: string;
  epoch: number | null;
  delivered_on: string;
  delivered_at: number | null;
  withdrawal_request: string | null;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const params = new URL(request.url).searchParams;

  const stakingAddress = params.get('staking_address');
  if (!stakingAddress) {
    return errorResponse('staking_address is required', 400, origin);
  }

  const page = Number(params.get('page') ?? '1');
  if (!Number.isInteger(page) || page < 1) {
    return errorResponse('page must be a positive integer', 400, origin);
  }
  const limit = Number(params.get('limit') ?? String(DEFAULT_LIMIT));
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return errorResponse(`limit must be 1-${MAX_LIMIT}`, 400, origin);
  }
  const order = params.get('order') ?? 'desc';
  if (order !== 'asc' && order !== 'desc') {
    return errorResponse('order must be asc or desc', 400, origin);
  }
  const token = params.get('token');
  const from = params.get('from') ? toUnixSeconds(params.get('from')!) : null;
  if (params.get('from') && from === null) {
    return errorResponse('from must be a unix timestamp or date', 400, origin);
  }
  const to = params.get('to') ? toUnixSeconds(params.get('to')!) : null;
  if (params.get('to') && to === null) {
    return errorResponse('to must be a unix timestamp or date', 400, origin);
  }

  if (!hasDb(env)) {
    return jsonResponse(
      { items: [], page, limit, total: 0, hasMore: false, degraded: true },
      200,
      origin,
    );
  }

  const where: string[] = ['stake_address = ?'];
  const binds: unknown[] = [stakingAddress];
  if (token) {
    where.push('token = ?');
    binds.push(token);
  }
  if (from !== null) {
    where.push('delivered_at >= ?');
    binds.push(from);
  }
  if (to !== null) {
    where.push('delivered_at <= ?');
    binds.push(to);
  }
  const whereSql = where.join(' AND ');
  const dir = order === 'asc' ? 'ASC' : 'DESC';

  try {
    const [{ results }, count] = await Promise.all([
      env.DB.prepare(
        `SELECT reward_id, token, amount, epoch, delivered_on, delivered_at, withdrawal_request ` +
          `FROM withdrawals WHERE ${whereSql} ` +
          `ORDER BY (delivered_at IS NULL) ASC, delivered_at ${dir} ` +
          `LIMIT ? OFFSET ?`,
      )
        .bind(...binds, limit + 1, (page - 1) * limit)
        .all<WithdrawalRow>(),
      env.DB.prepare(`SELECT COUNT(*) AS total FROM withdrawals WHERE ${whereSql}`)
        .bind(...binds)
        .first<{ total: number }>(),
    ]);

    const rows = results ?? [];
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((r) => ({
      rewardId: r.reward_id,
      token: r.token,
      amount: r.amount,
      epoch: r.epoch,
      deliveredOn: r.delivered_on,
      deliveredAt: r.delivered_at,
      withdrawalRequest: r.withdrawal_request,
    }));

    return jsonResponse(
      { items, page, limit, total: count?.total ?? items.length, hasMore },
      200,
      origin,
    );
  } catch (err) {
    console.error('D1 history error:', err);
    return errorResponse('Error fetching history', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
```

- [ ] **Step 4: Run, then commit**

```bash
npx vitest run functions/api/__tests__/history.test.ts
git add functions
git commit -m "feat(history): paginated /api/history endpoint over D1 withdrawals"
```

---

### Task 4: `useWithdrawalHistory` hook (#179 data layer)

**Files:**
- Modify: `src/features/history/api/history.queries.ts` (export the mapping helpers)
- Create: `src/features/history/hooks/useWithdrawalHistory.ts`
- Create: `src/features/history/__tests__/useWithdrawalHistory.test.tsx`

- [ ] **Step 1: Export helpers**

In `history.queries.ts` add `export` to `tickerFor`, `decimalsFor`, `parseDeliveredOn`,
and the `TokenInfo`/`TokenMap` types (no behavior change).

- [ ] **Step 2: Write failing hook test**

`src/features/history/__tests__/useWithdrawalHistory.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const getMock = vi.fn();
vi.mock('@/api/client', () => ({
  apiClient: { get: (...a: unknown[]) => getMock(...a) },
}));

import { useWithdrawalHistory } from '../hooks/useWithdrawalHistory';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const STAKE = 'stake1' + 'u'.repeat(40);

describe('useWithdrawalHistory', () => {
  beforeEach(() => getMock.mockReset());

  it('is disabled without a stake address', () => {
    const { result } = renderHook(() => useWithdrawalHistory(null, 1, 'desc'), { wrapper });
    expect(result.current.isPending).toBe(true);
    expect(getMock).not.toHaveBeenCalled();
  });

  it('joins history items with token metadata and scales amounts', async () => {
    getMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/history')) {
        return Promise.resolve({
          items: [{
            rewardId: 'r1', token: 'lovelace', amount: '1500000', epoch: 500,
            deliveredOn: '1750000000', deliveredAt: 1750000000, withdrawalRequest: 'w1',
          }],
          page: 1, limit: 50, total: 120, hasMore: true,
        });
      }
      return Promise.resolve({}); // /api/getTokens
    });
    const { result } = renderHook(() => useWithdrawalHistory(STAKE, 1, 'desc'), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.total).toBe(120);
    expect(result.current.data!.hasMore).toBe(true);
    const row = result.current.data!.rows[0];
    expect(row.ticker).toBe('ADA');
    expect(row.amount).toBeCloseTo(1.5);
    expect(row.epoch).toBe(500);
    expect(row.deliveredOn?.getTime()).toBe(1750000000 * 1000);
  });

  it('propagates the degraded flag', async () => {
    getMock.mockImplementation((url: string) =>
      url.startsWith('/api/history')
        ? Promise.resolve({ items: [], page: 1, limit: 50, total: 0, hasMore: false, degraded: true })
        : Promise.resolve({}),
    );
    const { result } = renderHook(() => useWithdrawalHistory(STAKE, 1, 'desc'), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.degraded).toBe(true);
  });
});
```

- [ ] **Step 3: Run to verify failure, then implement**

Run: `npx vitest run src/features/history/__tests__/useWithdrawalHistory.test.tsx` → FAIL.

`src/features/history/hooks/useWithdrawalHistory.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  tickerFor,
  decimalsFor,
  parseDeliveredOn,
  type TokenMap,
  type DeliveredReward,
} from '@/features/history/api/history.queries';

interface HistoryItem {
  rewardId: string;
  token: string;
  amount: string;
  epoch: number | null;
  deliveredOn: string;
  deliveredAt: number | null;
  withdrawalRequest: string | null;
}

interface HistoryResponse {
  items: HistoryItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  degraded?: boolean;
}

export interface WithdrawalHistoryPage {
  // Same display shape HistoryRow consumes.
  rows: DeliveredReward[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  degraded: boolean;
}

export type HistoryOrder = 'asc' | 'desc';

export function useWithdrawalHistory(
  stakeAddress: string | null,
  page: number,
  order: HistoryOrder,
) {
  return useQuery<WithdrawalHistoryPage, Error>({
    queryKey: ['history', stakeAddress, page, order],
    enabled: !!stakeAddress,
    staleTime: 60_000,
    queryFn: async () => {
      if (!stakeAddress) throw new Error('stakeAddress is required');
      const [history, tokens] = await Promise.all([
        apiClient.get<HistoryResponse>(
          `/api/history?staking_address=${encodeURIComponent(stakeAddress)}&page=${page}&order=${order}`,
        ),
        apiClient.get<TokenMap>('/api/getTokens'),
      ]);

      const rows: DeliveredReward[] = (history.items ?? []).map((item) => {
        const info = tokens[item.token];
        const decimals = decimalsFor(item.token, info);
        return {
          key: item.rewardId,
          token: item.token,
          ticker: tickerFor(item.token, info),
          decimals,
          amount: Number(item.amount) / Math.pow(10, decimals),
          deliveredOn: parseDeliveredOn(item.deliveredOn),
          deliveredOnRaw: item.deliveredOn,
          epoch: item.epoch,
          logo: info?.logo,
        };
      });

      return {
        rows,
        page: history.page,
        limit: history.limit,
        total: history.total,
        hasMore: history.hasMore,
        degraded: history.degraded ?? false,
      };
    },
  });
}
```

- [ ] **Step 4: Run, then commit**

```bash
npx vitest run src/features/history
git add src/features/history
git commit -m "feat(history): useWithdrawalHistory hook over /api/history"
```

---

### Task 5: `HistoryList` server mode (#179 UI)

**Files:**
- Modify: `src/features/history/components/HistoryList.tsx`

- [ ] **Step 1: Implement mode selection, pagination, sort toggle**

In `HistoryList.tsx`, add imports and replace the `HistoryList` component (helper
components `TokenAvatar`, `HistoryRow`, `StateMessage`, `SkeletonList`, formatters stay):

```tsx
import { useEffect, useRef, useState } from 'react';
import { IconAlertCircle, IconArrowsSort, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useWalletStore } from '@/store/wallet-state';
import { useDeliveredRewards, type DeliveredReward } from '@/features/history/api/history.queries';
import { useWithdrawalHistory, type HistoryOrder } from '@/features/history/hooks/useWithdrawalHistory';
```

```tsx
export function HistoryList() {
  const stakeAddress = useWalletStore((s) => s.stakeAddress);
  const { data, isLoading, error } = useDeliveredRewards(stakeAddress);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState(1);
  const [order, setOrder] = useState<HistoryOrder>('desc');
  const history = useWithdrawalHistory(stakeAddress, page, order);

  // First visit: the delivered-rewards fetch also syncs D1 server-side, so
  // refresh the archive query once it settles.
  const queryClient = useQueryClient();
  const invalidated = useRef(false);
  useEffect(() => {
    if (data && !invalidated.current) {
      invalidated.current = true;
      queryClient.invalidateQueries({ queryKey: ['history', stakeAddress] });
    }
  }, [data, queryClient, stakeAddress]);

  if (!stakeAddress) {
    return (
      <StateMessage
        eyebrow="Not connected"
        message="Connect a wallet to view your delivered rewards."
      />
    );
  }

  if (isLoading) return <SkeletonList />;

  const serverMode =
    !!history.data && !history.data.degraded && history.data.total > 0;

  if (error && !serverMode) {
    return (
      <div className="card-premium flex items-start gap-3 px-5 py-4 text-sm text-rose-200">
        <IconAlertCircle size={18} stroke={1.6} className="mt-0.5 shrink-0 text-rose-400" />
        <div>
          <p className="font-medium text-white">Couldn't load history</p>
          <p className="mt-0.5 text-xs text-slate-400">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!serverMode && (!data || data.length === 0)) {
    return (
      <StateMessage
        eyebrow="No history yet"
        message="Once your first reward is delivered, it'll appear here."
      />
    );
  }

  const totalPages = serverMode
    ? Math.max(1, Math.ceil(history.data!.total / history.data!.limit))
    : 1;
  const rows: DeliveredReward[] = serverMode
    ? history.data!.rows
    : showAll
      ? data!
      : data!.slice(0, PAGE_SIZE);
  const clientHasMore = !serverMode && !!data && data.length > rows.length;
  const count = serverMode ? history.data!.total : data!.length;

  return (
    <section className="card-premium overflow-hidden">
      <header className="flex items-center justify-between border-b border-border-subtle/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <p className="label-eyebrow">Delivered</p>
          <span className="rounded-full border border-border-subtle bg-surface-inset/70 px-2 py-0.5 font-mono text-[10px] text-slate-300">
            {count}
          </span>
        </div>
        {serverMode ? (
          <button
            type="button"
            onClick={() => {
              setOrder((o) => (o === 'desc' ? 'asc' : 'desc'));
              setPage(1);
            }}
            className="flex items-center gap-1 text-[11px] text-slate-500 transition hover:text-slate-300"
          >
            <IconArrowsSort size={12} stroke={1.6} />
            {order === 'desc' ? 'Newest first' : 'Oldest first'}
          </button>
        ) : (
          <p className="text-[11px] text-slate-500">Most recent first</p>
        )}
      </header>

      <ul className="divide-y divide-border-subtle/50">
        {rows.map((row) => (
          <HistoryRow key={row.key} row={row} />
        ))}
      </ul>

      {serverMode && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border-subtle/60 px-5 py-3">
          <button
            type="button"
            disabled={page <= 1 || history.isFetching}
            onClick={() => setPage((p) => p - 1)}
            className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-brand-cyan transition hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IconChevronLeft size={12} stroke={2} /> Prev
          </button>
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
            Page {page} / {totalPages}
          </p>
          <button
            type="button"
            disabled={!history.data!.hasMore || history.isFetching}
            onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-brand-cyan transition hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next <IconChevronRight size={12} stroke={2} />
          </button>
        </div>
      )}

      {clientHasMore && (
        <div className="border-t border-border-subtle/60 px-5 py-3 text-center">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="font-mono text-[10px] uppercase tracking-wider text-brand-cyan transition hover:text-cyan-200"
          >
            Show {data!.length - rows.length} more
          </button>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Full verification, commit, push, PR**

```bash
npx vitest run
npx tsc -b
npx eslint src functions --max-warnings 0
npm run build
git add src/features/history
git commit -m "feat(history): server-driven pagination and date sort in HistoryList"
git push -u origin feat/withdrawal-history
gh pr create --base feat/favorite-tokens --title "feat: withdrawal history beyond the VM window (#179 #180 #181)" --body "..."
```

(PR body: summarize the three issues, note the stacked base and the D1 degradation
behavior. Closes #179, #180, #181.)
