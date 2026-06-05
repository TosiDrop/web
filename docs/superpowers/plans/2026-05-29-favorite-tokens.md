# Favorite Tokens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user star tokens (tied to their stake address), persist the set with one CIP-30 signed save, sort favorites to the top of the claim list, and view/manage them in a profile "Favorites" tab.

**Architecture:** Server-side D1 table `user_favorites` accessed via raw SQL behind a Pages Function (`/api/userFavorites`) that verifies a payload-bound CIP-30 stake signature. Client edits live in a shared zustand "draft" layer (seeded from a react-query GET); one `useFavorites` hook coordinates draft + save + signing and is consumed by the star button, the claim list (sort-to-top), a save bar, and the profile tab.

**Tech Stack:** React 18, TypeScript, react-query v5, zustand v5, @meshsdk/react (CIP-30 `signData`), Cloudflare Pages Functions + D1 (raw SQL), `@cardano-foundation/cardano-verify-datasignature`, vitest + @testing-library/react.

---

## File Structure

**Create:**
- `migrations/0002_create_user_favorites.sql` — favorites table.
- `functions/services/verifyStakeSignature.ts` — payload-bound CIP-30 verifier + `favoritesDigest`.
- `functions/services/__tests__/verifyStakeSignature.test.ts`
- `functions/api/userFavorites.ts` — GET/POST/OPTIONS endpoint.
- `functions/api/__tests__/userFavorites.test.ts`
- `src/features/favorites/types.ts` — `FavoriteToken`.
- `src/features/favorites/utils/sortFavoritesFirst.ts`
- `src/features/favorites/__tests__/sortFavoritesFirst.test.ts`
- `src/features/favorites/utils/signFavoritesUpdate.ts` — client message build + sign + `favoritesDigest`.
- `src/features/favorites/__tests__/signFavoritesUpdate.test.ts`
- `src/features/favorites/api/favorites.queries.ts` — GET query + save mutation.
- `src/features/favorites/store/favorites-draft.ts` — zustand draft store.
- `src/features/favorites/hooks/useFavorites.ts` — coordinator hook.
- `src/features/favorites/__tests__/useFavorites.test.tsx`
- `src/features/favorites/components/FavoriteStarButton.tsx`
- `src/features/favorites/components/FavoritesSaveBar.tsx`
- `src/features/favorites/components/FavoritesTab.tsx`

**Modify:**
- `package.json` / `package-lock.json` — add verify dependency.
- `src/features/rewards/components/DistributionCard.tsx` — root `<div>` + star overlay sibling.
- `src/features/rewards/components/AvailableDistributions.tsx` — sort + wire stars + save bar.
- `src/pages/ProfilePage.tsx` — add "Favorites" tab + panel.
- `wrangler.jsonc` — operator note referencing the new migration.

---

## Task 1: Favorites D1 migration

**Files:**
- Create: `migrations/0002_create_user_favorites.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Migration: Create user_favorites table for per-user favorite tokens.
-- Keyed by stake address (matches users.stake_address). ticker/logo are
-- denormalized snapshots so the profile favorites view is self-contained.
CREATE TABLE IF NOT EXISTS user_favorites (
  stake_address TEXT NOT NULL,
  asset_id      TEXT NOT NULL,
  ticker        TEXT,
  logo          TEXT,
  position      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (stake_address, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_stake
  ON user_favorites (stake_address, position);
```

- [ ] **Step 2: Commit**

```bash
git add migrations/0002_create_user_favorites.sql
git commit -m "feat(db): add user_favorites migration"
```

---

## Task 2: CIP-30 stake-signature verifier

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `functions/services/verifyStakeSignature.ts`
- Test: `functions/services/__tests__/verifyStakeSignature.test.ts`

- [ ] **Step 1: Install the verification library**

Run: `npm install @cardano-foundation/cardano-verify-datasignature@^1.0.11`
Expected: package added to `dependencies`; lockfile updated; no errors.

- [ ] **Step 2: Write the failing test**

Create `functions/services/__tests__/verifyStakeSignature.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyMock = vi.fn();
vi.mock('@cardano-foundation/cardano-verify-datasignature', () => ({
  default: (...args: unknown[]) => verifyMock(...args),
}));

import { verifyStakeSignature, favoritesDigest } from '../verifyStakeSignature';

const STAKE = 'stake1' + 'u'.repeat(40);

async function buildMessage(stake: string, assetIds: string[], iso: string) {
  const digest = await favoritesDigest(assetIds);
  return `Tosi favorites update for ${stake} at ${iso}\nfavorites: ${assetIds.length} [${digest}]`;
}

describe('verifyStakeSignature', () => {
  beforeEach(() => {
    verifyMock.mockReset();
    verifyMock.mockReturnValue(true);
  });

  it('accepts a fresh, payload-bound, validly signed message', async () => {
    const now = new Date('2026-05-29T12:00:00.000Z');
    const ids = ['b', 'a', 'c'];
    const message = await buildMessage(STAKE, ids, now.toISOString());
    const res = await verifyStakeSignature({
      stakeAddress: STAKE, favorites: ids, signature: 's', key: 'k', message, now,
    });
    expect(res.ok).toBe(true);
    expect(verifyMock).toHaveBeenCalledWith('s', 'k', message, STAKE);
  });

  it('rejects a missing signature payload', async () => {
    const res = await verifyStakeSignature({
      stakeAddress: STAKE, favorites: [], signature: undefined, key: 'k', message: 'm',
    });
    expect(res).toMatchObject({ ok: false, status: 401 });
  });

  it('rejects a stale message (>5 min)', async () => {
    const now = new Date('2026-05-29T12:10:00.000Z');
    const signedAt = '2026-05-29T12:00:00.000Z';
    const ids = ['a'];
    const message = await buildMessage(STAKE, ids, signedAt);
    const res = await verifyStakeSignature({
      stakeAddress: STAKE, favorites: ids, signature: 's', key: 'k', message, now,
    });
    expect(res).toMatchObject({ ok: false, status: 401 });
  });

  it('rejects when the signed stake address differs', async () => {
    const now = new Date('2026-05-29T12:00:00.000Z');
    const ids = ['a'];
    const message = await buildMessage(STAKE, ids, now.toISOString());
    const res = await verifyStakeSignature({
      stakeAddress: 'stake1' + 'z'.repeat(40), favorites: ids, signature: 's', key: 'k', message, now,
    });
    expect(res).toMatchObject({ ok: false, status: 401 });
  });

  it('rejects when the payload digest does not match (tampered list)', async () => {
    const now = new Date('2026-05-29T12:00:00.000Z');
    const message = await buildMessage(STAKE, ['a', 'b'], now.toISOString());
    const res = await verifyStakeSignature({
      stakeAddress: STAKE, favorites: ['a', 'b', 'c'], signature: 's', key: 'k', message, now,
    });
    expect(res).toMatchObject({ ok: false, status: 401 });
  });

  it('rejects when the cryptographic signature is invalid', async () => {
    verifyMock.mockReturnValue(false);
    const now = new Date('2026-05-29T12:00:00.000Z');
    const ids = ['a'];
    const message = await buildMessage(STAKE, ids, now.toISOString());
    const res = await verifyStakeSignature({
      stakeAddress: STAKE, favorites: ids, signature: 's', key: 'k', message, now,
    });
    expect(res).toMatchObject({ ok: false, status: 401 });
  });

  it('favoritesDigest is order-independent and 16 hex chars', async () => {
    const a = await favoritesDigest(['x', 'y', 'z']);
    const b = await favoritesDigest(['z', 'x', 'y']);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- verifyStakeSignature`
Expected: FAIL — cannot resolve `../verifyStakeSignature`.

- [ ] **Step 4: Implement the verifier**

Create `functions/services/verifyStakeSignature.ts`:

```ts
import verifySignature from '@cardano-foundation/cardano-verify-datasignature';

const MESSAGE_PREFIX = 'Tosi favorites update';
// Mirrors buildFavoritesMessage() on the client. The ISO timestamp bounds
// replay; the trailing digest binds the signature to the exact favorite set.
const MESSAGE_RE =
  /^Tosi favorites update for (stake[a-z0-9]+) at (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)\nfavorites: (\d+) \[([0-9a-f]{16})\]$/;
const FRESHNESS_WINDOW_MS = 5 * 60 * 1000;

export type VerifyResult =
  | { ok: true }
  | { ok: false; status: number; reason: string };

interface VerifyInput {
  stakeAddress: string;
  favorites: string[];
  signature?: unknown;
  key?: unknown;
  message?: unknown;
  now?: Date;
}

export async function favoritesDigest(assetIds: string[]): Promise<string> {
  const sorted = [...assetIds].sort();
  const data = new TextEncoder().encode(sorted.join(','));
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

export async function verifyStakeSignature({
  stakeAddress,
  favorites,
  signature,
  key,
  message,
  now = new Date(),
}: VerifyInput): Promise<VerifyResult> {
  if (typeof signature !== 'string' || typeof key !== 'string' || typeof message !== 'string') {
    return { ok: false, status: 401, reason: 'Missing or invalid signature payload' };
  }
  if (!message.startsWith(MESSAGE_PREFIX)) {
    return { ok: false, status: 401, reason: 'Unrecognized signing message' };
  }

  const match = MESSAGE_RE.exec(message);
  if (!match) {
    return { ok: false, status: 401, reason: 'Malformed signing message' };
  }
  const [, signedStake, signedAt, signedCount, signedDigest] = match;

  if (signedStake !== stakeAddress) {
    return { ok: false, status: 401, reason: 'Signed stake address does not match request' };
  }

  const ts = Date.parse(signedAt);
  if (Number.isNaN(ts)) {
    return { ok: false, status: 401, reason: 'Invalid timestamp in signed message' };
  }
  if (Math.abs(now.getTime() - ts) > FRESHNESS_WINDOW_MS) {
    return { ok: false, status: 401, reason: 'Signed message is stale (>5 min)' };
  }

  if (Number(signedCount) !== favorites.length) {
    return { ok: false, status: 401, reason: 'Favorite count does not match signed message' };
  }
  const expectedDigest = await favoritesDigest(favorites);
  if (expectedDigest !== signedDigest) {
    return { ok: false, status: 401, reason: 'Favorites payload does not match signed message' };
  }

  let verified: boolean;
  try {
    verified = verifySignature(signature, key, message, stakeAddress);
  } catch (err) {
    console.error('verifyStakeSignature crypto error:', err);
    return { ok: false, status: 401, reason: 'Signature verification failed' };
  }
  if (!verified) {
    return { ok: false, status: 401, reason: 'Signature does not match stake address' };
  }

  return { ok: true };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- verifyStakeSignature`
Expected: PASS (all 7 cases).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json functions/services/verifyStakeSignature.ts functions/services/__tests__/verifyStakeSignature.test.ts
git commit -m "feat(api): add payload-bound CIP-30 stake-signature verifier"
```

---

## Task 3: `/api/userFavorites` endpoint

**Files:**
- Create: `functions/api/userFavorites.ts`
- Test: `functions/api/__tests__/userFavorites.test.ts`

- [ ] **Step 1: Write the failing test**

Create `functions/api/__tests__/userFavorites.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Env } from '../../types/env';

const verifyStakeMock = vi.fn();
vi.mock('../../services/verifyStakeSignature', () => ({
  verifyStakeSignature: (...args: unknown[]) => verifyStakeMock(...args),
}));

import { onRequestGet, onRequestPost } from '../userFavorites';

type GetCtx = Parameters<typeof onRequestGet>[0];
type PostCtx = Parameters<typeof onRequestPost>[0];

function fakeDb() {
  const calls: { sql: string; binds: unknown[] }[] = [];
  let selectRows: unknown[] = [];
  const prepare = (sql: string) => {
    const stmt = {
      _binds: [] as unknown[],
      bind(...b: unknown[]) { this._binds = b; calls.push({ sql, binds: b }); return this; },
      all: async () => ({ results: selectRows }),
      run: async () => ({}),
    };
    return stmt;
  };
  const db = {
    prepare,
    batch: vi.fn(async () => []),
    __setSelect: (rows: unknown[]) => { selectRows = rows; },
    __calls: calls,
  };
  return db as unknown as D1Database & { __setSelect: (r: unknown[]) => void; __calls: typeof calls; batch: ReturnType<typeof vi.fn> };
}

function getCtx(url: string, env: Partial<Env>): GetCtx {
  return {
    request: new Request(url, { headers: { Origin: 'http://localhost:5173' } }),
    env: { VITE_VM_API_KEY: 'k', ...env } as Env,
  } as unknown as GetCtx;
}

function postCtx(body: unknown, env: Partial<Env>): PostCtx {
  return {
    request: new Request('https://example.com/api/userFavorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
      body: JSON.stringify(body),
    }),
    env: { VITE_VM_API_KEY: 'k', ...env } as Env,
  } as unknown as PostCtx;
}

const STAKE = 'stake1' + 'u'.repeat(40);

describe('GET /api/userFavorites', () => {
  it('400 when stakeAddress missing', async () => {
    const res = await onRequestGet(getCtx('https://x/api/userFavorites', {}));
    expect(res.status).toBe(400);
  });

  it('returns degraded empty list when no DB', async () => {
    const res = await onRequestGet(getCtx(`https://x/api/userFavorites?stakeAddress=${STAKE}`, {}));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ favorites: [], degraded: true });
  });

  it('maps rows to camelCase favorites ordered by query', async () => {
    const db = fakeDb();
    db.__setSelect([{ asset_id: 'a1', ticker: 'AAA', logo: 'http://l/a' }]);
    const res = await onRequestGet(getCtx(`https://x/api/userFavorites?stakeAddress=${STAKE}`, { DB: db }));
    const body = await res.json();
    expect(body).toEqual({ favorites: [{ assetId: 'a1', ticker: 'AAA', logo: 'http://l/a' }] });
  });
});

describe('POST /api/userFavorites', () => {
  beforeEach(() => {
    verifyStakeMock.mockReset();
    verifyStakeMock.mockResolvedValue({ ok: true });
  });

  it('415 when not JSON', async () => {
    const ctx = {
      request: new Request('https://x/api/userFavorites', { method: 'POST', body: 'x' }),
      env: { VITE_VM_API_KEY: 'k' } as Env,
    } as unknown as PostCtx;
    const res = await onRequestPost(ctx);
    expect(res.status).toBe(415);
  });

  it('400 when stakeAddress is not bech32', async () => {
    const res = await onRequestPost(postCtx({ stakeAddress: 'nope', favorites: [] }, {}));
    expect(res.status).toBe(400);
  });

  it('400 when favorites is not an array', async () => {
    const res = await onRequestPost(postCtx({ stakeAddress: STAKE, favorites: 'x' }, {}));
    expect(res.status).toBe(400);
  });

  it('401 when signature verification fails', async () => {
    verifyStakeMock.mockResolvedValue({ ok: false, status: 401, reason: 'bad' });
    const res = await onRequestPost(postCtx(
      { stakeAddress: STAKE, favorites: [{ assetId: 'a1', ticker: 'A', logo: '' }], signature: 's', key: 'k', message: 'm' },
      {},
    ));
    expect(res.status).toBe(401);
  });

  it('succeeds (degraded) with no DB after a valid signature', async () => {
    const res = await onRequestPost(postCtx(
      { stakeAddress: STAKE, favorites: [{ assetId: 'a1', ticker: 'A', logo: '' }], signature: 's', key: 'k', message: 'm' },
      {},
    ));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ success: true, degraded: true });
  });

  it('replaces the set via a delete + insert batch when DB present', async () => {
    const db = fakeDb();
    const res = await onRequestPost(postCtx(
      { stakeAddress: STAKE, favorites: [{ assetId: 'a1', ticker: 'A', logo: '' }, { assetId: 'a2', ticker: 'B', logo: '' }], signature: 's', key: 'k', message: 'm' },
      { DB: db },
    ));
    expect(res.status).toBe(200);
    expect(db.batch).toHaveBeenCalledTimes(1);
    const statements = db.batch.mock.calls[0][0];
    expect(statements).toHaveLength(3); // 1 delete + 2 inserts
    // verifier was given the assetId list to bind the digest
    expect(verifyStakeMock).toHaveBeenCalledWith(expect.objectContaining({ favorites: ['a1', 'a2'] }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- userFavorites`
Expected: FAIL — cannot resolve `../userFavorites`.

- [ ] **Step 3: Implement the endpoint**

Create `functions/api/userFavorites.ts`:

```ts
import type { Env } from '../types/env';
import { jsonResponse, errorResponse, optionsResponse } from '../services/vmClient';
import { verifyStakeSignature } from '../services/verifyStakeSignature';

const MAX_FAVORITES = 200;
const MAX_ASSET_ID_LEN = 120;
const MAX_TICKER_LEN = 50;
const MAX_LOGO_LEN = 600_000;

interface FavoriteRow {
  asset_id: string;
  ticker: string | null;
  logo: string | null;
}

function hasDb(env: Env): env is Env & { DB: D1Database } {
  return typeof env?.DB?.prepare === 'function';
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const stakeAddress = new URL(request.url).searchParams.get('stakeAddress');

  if (!stakeAddress) {
    return errorResponse('stakeAddress is required', 400, origin);
  }
  if (!hasDb(env)) {
    return jsonResponse({ favorites: [], degraded: true }, 200, origin);
  }

  try {
    const { results } = await env.DB.prepare(
      'SELECT asset_id, ticker, logo FROM user_favorites WHERE stake_address = ? ORDER BY position ASC',
    ).bind(stakeAddress).all<FavoriteRow>();

    const favorites = (results ?? []).map((r) => ({
      assetId: r.asset_id,
      ticker: r.ticker ?? '',
      logo: r.logo ?? '',
    }));
    return jsonResponse({ favorites }, 200, origin);
  } catch (err) {
    console.error('D1 GET favorites error:', err);
    return errorResponse('Error fetching favorites', 500, origin);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');

  if (!request.headers.get('Content-Type')?.startsWith('application/json')) {
    return errorResponse('Request body must be JSON', 415, origin);
  }

  let body: {
    stakeAddress?: string;
    favorites?: Array<{ assetId?: unknown; ticker?: unknown; logo?: unknown }>;
    signature?: string;
    key?: string;
    message?: string;
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400, origin);
  }

  if (!body.stakeAddress || !body.stakeAddress.startsWith('stake')) {
    return errorResponse('stakeAddress must be a bech32 stake address', 400, origin);
  }
  if (!Array.isArray(body.favorites)) {
    return errorResponse('favorites must be an array', 400, origin);
  }
  if (body.favorites.length > MAX_FAVORITES) {
    return errorResponse(`favorites exceeds ${MAX_FAVORITES}`, 400, origin);
  }

  const seen = new Set<string>();
  const favorites: { assetId: string; ticker: string; logo: string }[] = [];
  for (const f of body.favorites) {
    if (!f || typeof f.assetId !== 'string' || !f.assetId || f.assetId.length > MAX_ASSET_ID_LEN) {
      return errorResponse('each favorite needs a valid assetId', 400, origin);
    }
    if (seen.has(f.assetId)) continue;
    seen.add(f.assetId);
    const ticker = typeof f.ticker === 'string' ? f.ticker.slice(0, MAX_TICKER_LEN) : '';
    const logo = typeof f.logo === 'string' && f.logo.length <= MAX_LOGO_LEN ? f.logo : '';
    favorites.push({ assetId: f.assetId, ticker, logo });
  }

  const verification = await verifyStakeSignature({
    stakeAddress: body.stakeAddress,
    favorites: favorites.map((f) => f.assetId),
    signature: body.signature,
    key: body.key,
    message: body.message,
  });
  if (!verification.ok) {
    return errorResponse(verification.reason, verification.status, origin);
  }

  if (!hasDb(env)) {
    return jsonResponse({ success: true, count: favorites.length, degraded: true }, 200, origin);
  }

  try {
    const stake = body.stakeAddress;
    const statements = [
      env.DB.prepare('DELETE FROM user_favorites WHERE stake_address = ?').bind(stake),
      ...favorites.map((f, i) =>
        env.DB.prepare(
          'INSERT INTO user_favorites (stake_address, asset_id, ticker, logo, position) VALUES (?, ?, ?, ?, ?)',
        ).bind(stake, f.assetId, f.ticker, f.logo, i),
      ),
    ];
    await env.DB.batch(statements);
    return jsonResponse({ success: true, count: favorites.length }, 200, origin);
  } catch (err) {
    console.error('D1 POST favorites error:', err);
    return errorResponse('Error saving favorites', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async (context) => {
  const origin = context.request.headers.get('Origin');
  return optionsResponse(origin);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- userFavorites`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add functions/api/userFavorites.ts functions/api/__tests__/userFavorites.test.ts
git commit -m "feat(api): add /api/userFavorites GET + signed POST"
```

---

## Task 4: Favorite types + sort-favorites-first util

**Files:**
- Create: `src/features/favorites/types.ts`
- Create: `src/features/favorites/utils/sortFavoritesFirst.ts`
- Test: `src/features/favorites/__tests__/sortFavoritesFirst.test.ts`

- [ ] **Step 1: Create the types file**

Create `src/features/favorites/types.ts`:

```ts
export interface FavoriteToken {
  assetId: string;
  ticker: string;
  logo: string;
}
```

- [ ] **Step 2: Write the failing test**

Create `src/features/favorites/__tests__/sortFavoritesFirst.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { sortFavoritesFirst } from '../utils/sortFavoritesFirst';

const t = (assetId: string) => ({ assetId });

describe('sortFavoritesFirst', () => {
  it('moves favorites to the front, preserving relative order of each group', () => {
    const tokens = [t('a'), t('b'), t('c'), t('d')];
    const result = sortFavoritesFirst(tokens, new Set(['c', 'a']));
    expect(result.map((x) => x.assetId)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('accepts an array of ids', () => {
    const tokens = [t('a'), t('b')];
    const result = sortFavoritesFirst(tokens, ['b']);
    expect(result.map((x) => x.assetId)).toEqual(['b', 'a']);
  });

  it('returns a new array and does not mutate the input', () => {
    const tokens = [t('a'), t('b')];
    const result = sortFavoritesFirst(tokens, new Set<string>());
    expect(result).not.toBe(tokens);
    expect(result.map((x) => x.assetId)).toEqual(['a', 'b']);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- sortFavoritesFirst`
Expected: FAIL — cannot resolve `../utils/sortFavoritesFirst`.

- [ ] **Step 4: Implement the util**

Create `src/features/favorites/utils/sortFavoritesFirst.ts`:

```ts
export function sortFavoritesFirst<T extends { assetId: string }>(
  tokens: T[],
  favoriteIds: Set<string> | string[],
): T[] {
  const favSet = favoriteIds instanceof Set ? favoriteIds : new Set(favoriteIds);
  const favorites: T[] = [];
  const rest: T[] = [];
  for (const token of tokens) {
    (favSet.has(token.assetId) ? favorites : rest).push(token);
  }
  return [...favorites, ...rest];
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- sortFavoritesFirst`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/favorites/types.ts src/features/favorites/utils/sortFavoritesFirst.ts src/features/favorites/__tests__/sortFavoritesFirst.test.ts
git commit -m "feat(favorites): add FavoriteToken type and sort-favorites-first util"
```

---

## Task 5: Client signing helper

**Files:**
- Create: `src/features/favorites/utils/signFavoritesUpdate.ts`
- Test: `src/features/favorites/__tests__/signFavoritesUpdate.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/favorites/__tests__/signFavoritesUpdate.test.ts`. This test also guards against client/server message-format drift by feeding the produced message into the server verifier.

```ts
import { describe, it, expect, vi } from 'vitest';

const verifyMock = vi.fn(() => true);
vi.mock('@cardano-foundation/cardano-verify-datasignature', () => ({
  default: (...a: unknown[]) => verifyMock(...a),
}));

import { signFavoritesUpdateMessage } from '../utils/signFavoritesUpdate';
import { verifyStakeSignature } from '../../../../functions/services/verifyStakeSignature';

const STAKE = 'stake1' + 'u'.repeat(40);

describe('signFavoritesUpdateMessage', () => {
  it('signs with the stake address and builds a server-verifiable message', async () => {
    const signData = vi.fn(async () => ({ signature: 'sig', key: 'key' }));
    const wallet = { signData };

    const out = await signFavoritesUpdateMessage({
      wallet, stakeAddress: STAKE, assetIds: ['a2', 'a1'],
    });

    // signed with the stake/reward address, payload hex-encoded
    expect(signData).toHaveBeenCalledTimes(1);
    expect(signData.mock.calls[0][0]).toBe(STAKE);
    expect(out.signature).toBe('sig');
    expect(out.message).toMatch(/^Tosi favorites update for stake1u+ at .+\nfavorites: 2 \[[0-9a-f]{16}\]$/);

    const verified = await verifyStakeSignature({
      stakeAddress: STAKE, favorites: ['a2', 'a1'],
      signature: out.signature, key: out.key, message: out.message,
    });
    expect(verified.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- signFavoritesUpdate`
Expected: FAIL — cannot resolve `../utils/signFavoritesUpdate`.

- [ ] **Step 3: Implement the helper**

Create `src/features/favorites/utils/signFavoritesUpdate.ts`:

```ts
interface SignFavoritesPayload {
  wallet: {
    signData: (address: string, payload: string) => Promise<{ signature: string; key: string }>;
  };
  stakeAddress: string;
  assetIds: string[];
}

// Must stay byte-identical to favoritesDigest() in
// functions/services/verifyStakeSignature.ts — the server recomputes and compares.
async function favoritesDigest(assetIds: string[]): Promise<string> {
  const sorted = [...assetIds].sort();
  const data = new TextEncoder().encode(sorted.join(','));
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

function toHex(value: string): string {
  return Array.from(new TextEncoder().encode(value))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function signFavoritesUpdateMessage({
  wallet,
  stakeAddress,
  assetIds,
}: SignFavoritesPayload): Promise<{ signature: string; key: string; message: string }> {
  const digest = await favoritesDigest(assetIds);
  const message =
    `Tosi favorites update for ${stakeAddress} at ${new Date().toISOString()}\n` +
    `favorites: ${assetIds.length} [${digest}]`;

  // CIP-30: sign with the stake/reward address so the server can verify
  // stake-address ownership.
  const result = await wallet.signData(stakeAddress, toHex(message));
  return { signature: result.signature, key: result.key, message };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- signFavoritesUpdate`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/favorites/utils/signFavoritesUpdate.ts src/features/favorites/__tests__/signFavoritesUpdate.test.ts
git commit -m "feat(favorites): add CIP-30 client signing helper"
```

---

## Task 6: Favorites query/mutation + draft store

**Files:**
- Create: `src/features/favorites/api/favorites.queries.ts`
- Create: `src/features/favorites/store/favorites-draft.ts`

(No standalone test — exercised by the `useFavorites` hook test in Task 7.)

- [ ] **Step 1: Create the query + mutation module**

Create `src/features/favorites/api/favorites.queries.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { FavoriteToken } from '@/features/favorites/types';

interface FavoritesResponse {
  favorites: FavoriteToken[];
  degraded?: boolean;
}

export interface SaveFavoritesRequest {
  stakeAddress: string;
  favorites: FavoriteToken[];
  signature: string;
  key: string;
  message: string;
}

export function useFavoritesQuery(stakeAddress: string | null) {
  return useQuery<FavoriteToken[], Error>({
    queryKey: ['favorites', stakeAddress],
    queryFn: async () => {
      if (!stakeAddress) throw new Error('stakeAddress is required');
      const data = await apiClient.get<FavoritesResponse>(
        `/api/userFavorites?stakeAddress=${encodeURIComponent(stakeAddress)}`,
      );
      return data.favorites ?? [];
    },
    enabled: !!stakeAddress,
  });
}

export function useSaveFavoritesMutation() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, SaveFavoritesRequest>({
    mutationFn: (data) => apiClient.post<{ success: boolean }>('/api/userFavorites', data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['favorites', variables.stakeAddress] });
    },
  });
}
```

- [ ] **Step 2: Create the draft store**

Create `src/features/favorites/store/favorites-draft.ts`:

```ts
import { create } from 'zustand';
import type { FavoriteToken } from '@/features/favorites/types';

interface FavoritesDraftState {
  // null = in sync with the server. `owner` scopes the draft to a stake
  // address so switching wallets discards a stale draft.
  draft: FavoriteToken[] | null;
  owner: string | null;
  setDraft: (draft: FavoriteToken[] | null, owner: string | null) => void;
}

export const useFavoritesDraft = create<FavoritesDraftState>((set) => ({
  draft: null,
  owner: null,
  setDraft: (draft, owner) => set({ draft, owner }),
}));
```

- [ ] **Step 3: Commit**

```bash
git add src/features/favorites/api/favorites.queries.ts src/features/favorites/store/favorites-draft.ts
git commit -m "feat(favorites): add query/mutation hooks and draft store"
```

---

## Task 7: `useFavorites` coordinator hook

**Files:**
- Create: `src/features/favorites/hooks/useFavorites.ts`
- Test: `src/features/favorites/__tests__/useFavorites.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/favorites/__tests__/useFavorites.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const getMock = vi.fn();
const postMock = vi.fn();
vi.mock('@/api/client', () => ({
  apiClient: { get: (...a: unknown[]) => getMock(...a), post: (...a: unknown[]) => postMock(...a) },
}));

const signMock = vi.fn();
vi.mock('@/features/favorites/utils/signFavoritesUpdate', () => ({
  signFavoritesUpdateMessage: (...a: unknown[]) => signMock(...a),
}));

const walletState = { stakeAddress: 'stake1' + 'u'.repeat(40), connected: true };
vi.mock('@/store/wallet-state', () => ({
  useWalletStore: (sel: (s: typeof walletState) => unknown) => sel(walletState),
}));

vi.mock('@meshsdk/react', () => ({
  useWallet: () => ({ wallet: { signData: vi.fn() }, connected: true }),
}));

import { useFavorites } from '../hooks/useFavorites';
import { useFavoritesDraft } from '../store/favorites-draft';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useFavorites', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    signMock.mockReset();
    useFavoritesDraft.setState({ draft: null, owner: null });
  });

  it('hydrates saved favorites and reports not dirty', async () => {
    getMock.mockResolvedValue({ favorites: [{ assetId: 'a1', ticker: 'A', logo: '' }] });
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.favorites).toHaveLength(1));
    expect(result.current.isFavorite('a1')).toBe(true);
    expect(result.current.isDirty).toBe(false);
  });

  it('toggle adds to the draft and marks dirty', async () => {
    getMock.mockResolvedValue({ favorites: [] });
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.toggle({ assetId: 'a2', ticker: 'B', logo: '' }));
    expect(result.current.isFavorite('a2')).toBe(true);
    expect(result.current.isDirty).toBe(true);
  });

  it('persist signs once, posts the draft, and clears dirty on success', async () => {
    getMock.mockResolvedValue({ favorites: [] });
    signMock.mockResolvedValue({ signature: 's', key: 'k', message: 'm' });
    postMock.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.toggle({ assetId: 'a2', ticker: 'B', logo: '' }));
    await act(async () => { await result.current.persist(); });
    expect(signMock).toHaveBeenCalledTimes(1);
    expect(postMock).toHaveBeenCalledWith('/api/userFavorites', expect.objectContaining({
      stakeAddress: walletState.stakeAddress,
      favorites: [{ assetId: 'a2', ticker: 'B', logo: '' }],
      signature: 's', key: 'k', message: 'm',
    }));
    expect(result.current.isDirty).toBe(false);
  });

  it('surfaces a signing error without clearing the draft', async () => {
    getMock.mockResolvedValue({ favorites: [] });
    signMock.mockRejectedValue(new Error('user declined'));
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.toggle({ assetId: 'a2', ticker: 'B', logo: '' }));
    await act(async () => { await result.current.persist(); });
    expect(result.current.error).toBe('user declined');
    expect(result.current.isDirty).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- useFavorites`
Expected: FAIL — cannot resolve `../hooks/useFavorites`.

- [ ] **Step 3: Implement the hook**

Create `src/features/favorites/hooks/useFavorites.ts`:

```ts
import { useMemo, useState } from 'react';
import { useWallet } from '@meshsdk/react';
import { useWalletStore } from '@/store/wallet-state';
import {
  useFavoritesQuery,
  useSaveFavoritesMutation,
} from '@/features/favorites/api/favorites.queries';
import { useFavoritesDraft } from '@/features/favorites/store/favorites-draft';
import { signFavoritesUpdateMessage } from '@/features/favorites/utils/signFavoritesUpdate';
import type { FavoriteToken } from '@/features/favorites/types';

function sameSet(a: FavoriteToken[], b: FavoriteToken[]): boolean {
  if (a.length !== b.length) return false;
  const bIds = new Set(b.map((f) => f.assetId));
  return a.every((f) => bIds.has(f.assetId));
}

export function useFavorites() {
  const { wallet, connected } = useWallet();
  const stakeAddress = useWalletStore((s) => s.stakeAddress);

  const query = useFavoritesQuery(stakeAddress);
  const saved = useMemo(() => query.data ?? [], [query.data]);

  const rawDraft = useFavoritesDraft((s) => s.draft);
  const draftOwner = useFavoritesDraft((s) => s.owner);
  const setDraftState = useFavoritesDraft((s) => s.setDraft);
  const draft = draftOwner === stakeAddress ? rawDraft : null;
  const setDraft = (next: FavoriteToken[] | null) => setDraftState(next, stakeAddress);

  const save = useSaveFavoritesMutation();
  const [signError, setSignError] = useState<string | null>(null);

  const effective = draft ?? saved;
  const favoriteIds = useMemo(() => new Set(effective.map((f) => f.assetId)), [effective]);
  const isDirty = draft !== null && !sameSet(draft, saved);

  const isFavorite = (assetId: string) => favoriteIds.has(assetId);

  const toggle = (token: FavoriteToken) => {
    const base = draft ?? saved;
    const exists = base.some((f) => f.assetId === token.assetId);
    setDraft(exists ? base.filter((f) => f.assetId !== token.assetId) : [...base, token]);
  };

  const reset = () => setDraft(null);

  const persist = async () => {
    if (!wallet || !stakeAddress || !connected) return;
    setSignError(null);
    const list = draft ?? saved;
    try {
      const { signature, key, message } = await signFavoritesUpdateMessage({
        wallet,
        stakeAddress,
        assetIds: list.map((f) => f.assetId),
      });
      await save.mutateAsync({ stakeAddress, favorites: list, signature, key, message });
      setDraft(null);
    } catch (e) {
      setSignError(e instanceof Error ? e.message : 'Failed to sign or save favorites');
    }
  };

  return {
    connected,
    stakeAddress,
    favorites: effective,
    favoriteIds,
    isFavorite,
    toggle,
    reset,
    isDirty,
    persist,
    saving: save.isPending,
    error: signError ?? (save.error instanceof Error ? save.error.message : null),
    isLoading: query.isLoading,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- useFavorites`
Expected: PASS (all 4 cases).

- [ ] **Step 5: Commit**

```bash
git add src/features/favorites/hooks/useFavorites.ts src/features/favorites/__tests__/useFavorites.test.tsx
git commit -m "feat(favorites): add useFavorites coordinator hook"
```

---

## Task 8: FavoriteStarButton component

**Files:**
- Create: `src/features/favorites/components/FavoriteStarButton.tsx`

- [ ] **Step 1: Implement the component**

Create `src/features/favorites/components/FavoriteStarButton.tsx`:

```tsx
import { IconStar, IconStarFilled } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface FavoriteStarButtonProps {
  active: boolean;
  onToggle: () => void;
  className?: string;
}

export function FavoriteStarButton({ active, onToggle, className }: FavoriteStarButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        'flex h-6 w-6 items-center justify-center rounded-md border transition',
        active
          ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
          : 'border-border-default bg-surface-inset text-slate-500 hover:text-amber-300',
        className,
      )}
    >
      {active ? <IconStarFilled size={13} /> : <IconStar size={13} stroke={1.8} />}
    </button>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc -b --noEmit` (or rely on the Task 14 build).
Expected: no errors referencing this file.

- [ ] **Step 3: Commit**

```bash
git add src/features/favorites/components/FavoriteStarButton.tsx
git commit -m "feat(favorites): add FavoriteStarButton"
```

---

## Task 9: FavoritesSaveBar component

**Files:**
- Create: `src/features/favorites/components/FavoritesSaveBar.tsx`

- [ ] **Step 1: Implement the component**

Create `src/features/favorites/components/FavoritesSaveBar.tsx`:

```tsx
import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import { useFavorites } from '@/features/favorites/hooks/useFavorites';

export function FavoritesSaveBar() {
  const { isDirty, persist, reset, saving, error, connected } = useFavorites();

  if (!isDirty) return null;

  return (
    <div className="space-y-2 rounded-lg border border-amber-400/30 bg-amber-400/5 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-300">You have unsaved favorite changes.</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            disabled={saving}
            className="rounded-lg border border-border-subtle px-3 py-1.5 text-sm text-slate-300 transition hover:text-white disabled:opacity-40"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={persist}
            disabled={saving || !connected}
            className="rounded-lg bg-brand-cyan px-4 py-1.5 text-sm font-medium text-surface-base transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save favorites'}
          </button>
        </div>
      </div>
      {!connected && (
        <p className="text-xs text-slate-500">Connect your wallet to save favorites.</p>
      )}
      {error && <FeedbackBanner tone="error" message={error} />}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/favorites/components/FavoritesSaveBar.tsx
git commit -m "feat(favorites): add FavoritesSaveBar"
```

---

## Task 10: Add the star overlay to DistributionCard

**Files:**
- Modify: `src/features/rewards/components/DistributionCard.tsx`

- [ ] **Step 1: Replace the component with the star-aware version**

Replace the entire contents of `src/features/rewards/components/DistributionCard.tsx` with:

```tsx
import { useState } from 'react';
import { IconCheck } from '@tabler/icons-react';
import type { ClaimableToken } from '@/shared/rewards';
import { cn } from '@/lib/utils';
import { FavoriteStarButton } from '@/features/favorites/components/FavoriteStarButton';

interface DistributionCardProps {
  token: ClaimableToken;
  selected: boolean;
  onToggle: () => void;
  favorite?: { active: boolean; onToggle: () => void };
}

export function DistributionCard({ token, selected, onToggle, favorite }: DistributionCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const formattedAmount = token.amount.toLocaleString(undefined, {
    maximumFractionDigits: token.decimals,
  });

  return (
    <div className="relative">
      {favorite && (
        <FavoriteStarButton
          active={favorite.active}
          onToggle={favorite.onToggle}
          className="absolute left-3 top-3 z-10"
        />
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className={cn(
          'group relative flex w-full flex-col justify-between rounded-xl border p-4 text-left transition',
          selected
            ? 'border-brand-cyan/40 bg-surface-overlay'
            : token.premium
            ? 'border-purple-500/25 bg-surface-raised hover:bg-surface-overlay'
            : 'border-border-subtle bg-surface-raised hover:bg-surface-overlay',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded border transition',
            selected
              ? 'border-brand-cyan bg-brand-cyan text-surface-base'
              : 'border-border-default bg-surface-inset',
          )}
        >
          {selected && <IconCheck size={11} stroke={3} />}
        </span>

        <div className={cn('flex items-center gap-2.5', favorite && 'pl-7')}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-inset text-xs font-medium text-slate-400">
            {imgFailed || !token.logo ? (
              token.ticker.slice(0, 2)
            ) : (
              <img
                src={token.logo}
                alt={token.ticker}
                className="h-8 w-8 rounded-full"
                onError={() => setImgFailed(true)}
              />
            )}
          </div>
          <p className="text-sm font-medium text-white">{token.ticker}</p>
          {token.premium && (
            <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-400">
              Premium
            </span>
          )}
        </div>

        <div className="mt-4">
          <p className="text-lg font-semibold tabular-nums text-white truncate">
            {formattedAmount}
          </p>
          <p className="text-[11px] text-slate-500">{token.ticker}</p>
        </div>
      </button>
    </div>
  );
}
```

Notes: the root is now a `<div className="relative">`; the star is a **sibling** of the claim `<button>` (no nested-button), positioned top-left; the header row gets `pl-7` only when a star is shown so the logo clears it. The claim `<button>` gains `w-full` since it is no longer the flex root.

- [ ] **Step 2: Verify it type-checks / tests still pass**

Run: `npm run test`
Expected: PASS (no DistributionCard-specific test; nothing should regress).

- [ ] **Step 3: Commit**

```bash
git add src/features/rewards/components/DistributionCard.tsx
git commit -m "feat(rewards): add favorite star overlay to DistributionCard"
```

---

## Task 11: Wire favorites into AvailableDistributions

**Files:**
- Modify: `src/features/rewards/components/AvailableDistributions.tsx`

- [ ] **Step 1: Replace the component with the favorites-aware version**

Replace the entire contents of `src/features/rewards/components/AvailableDistributions.tsx` with:

```tsx
import { useMemo } from 'react';
import type { ClaimableToken } from '@/shared/rewards';
import { useClaimStore } from '@/store/claim-state';
import { useFavorites } from '@/features/favorites/hooks/useFavorites';
import { sortFavoritesFirst } from '@/features/favorites/utils/sortFavoritesFirst';
import { FavoritesSaveBar } from '@/features/favorites/components/FavoritesSaveBar';
import { DistributionCard } from './DistributionCard';

interface AvailableDistributionsProps {
  tokens: ClaimableToken[];
}

export function AvailableDistributions({ tokens }: AvailableDistributionsProps) {
  const selectedAssetIds = useClaimStore((s) => s.selectedAssetIds);
  const toggleAsset = useClaimStore((s) => s.toggleAsset);
  const setSelected = useClaimStore((s) => s.setSelected);

  const { connected, favoriteIds, isFavorite, toggle: toggleFavorite } = useFavorites();

  const sortedTokens = useMemo(
    () => sortFavoritesFirst(tokens, favoriteIds),
    [tokens, favoriteIds],
  );

  if (tokens.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-white">Claimable tokens</h2>
        <p className="py-6 text-center text-sm text-slate-500">
          No rewards found for this address.
        </p>
      </div>
    );
  }

  const allSelected = selectedAssetIds.length === tokens.length;

  const toggleAll = () => {
    setSelected(allSelected ? [] : tokens.map((t) => t.assetId));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-white">
          Claimable tokens
          <span className="ml-1.5 text-slate-500">{tokens.length}</span>
        </h2>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-brand-cyan transition hover:text-cyan-300"
        >
          {allSelected ? 'Clear' : 'Select all'}
        </button>
      </div>

      <FavoritesSaveBar />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sortedTokens.map((token) => (
          <DistributionCard
            key={token.assetId}
            token={token}
            selected={selectedAssetIds.includes(token.assetId)}
            onToggle={() => toggleAsset(token.assetId)}
            favorite={
              connected
                ? {
                    active: isFavorite(token.assetId),
                    onToggle: () =>
                      toggleFavorite({
                        assetId: token.assetId,
                        ticker: token.ticker,
                        logo: token.logo,
                      }),
                  }
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run the suite**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/rewards/components/AvailableDistributions.tsx
git commit -m "feat(rewards): sort favorites first and wire star toggles + save bar"
```

---

## Task 12: Profile "Favorites" tab

**Files:**
- Create: `src/features/favorites/components/FavoritesTab.tsx`
- Modify: `src/pages/ProfilePage.tsx`

- [ ] **Step 1: Create the FavoritesTab component**

Create `src/features/favorites/components/FavoritesTab.tsx`:

```tsx
import { useState } from 'react';
import { useFavorites } from '@/features/favorites/hooks/useFavorites';
import { FavoriteStarButton } from './FavoriteStarButton';
import { FavoritesSaveBar } from './FavoritesSaveBar';
import type { FavoriteToken } from '@/features/favorites/types';

function FavoriteRow({
  token,
  active,
  onToggle,
}: {
  token: FavoriteToken;
  active: boolean;
  onToggle: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-raised px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-inset text-xs font-medium text-slate-400">
        {imgFailed || !token.logo ? (
          (token.ticker || token.assetId).slice(0, 2)
        ) : (
          <img
            src={token.logo}
            alt={token.ticker}
            className="h-8 w-8 rounded-full"
            onError={() => setImgFailed(true)}
          />
        )}
      </div>
      <span className="truncate text-sm font-medium text-white">
        {token.ticker || token.assetId}
      </span>
      <span className="ml-auto">
        <FavoriteStarButton active={active} onToggle={onToggle} />
      </span>
    </li>
  );
}

export function FavoritesTab() {
  const { favorites, connected, isFavorite, toggle, isLoading } = useFavorites();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-light tracking-tight text-white">
          Favorite <span className="font-semibold">tokens</span>
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Starred tokens rise to the top of your claimable list.
        </p>
      </div>

      {!connected ? (
        <div className="card-premium px-6 py-16 text-center">
          <p className="label-eyebrow">Not connected</p>
          <p className="mx-auto mt-3 max-w-sm text-sm text-slate-400">
            Connect a wallet to manage your favorite tokens.
          </p>
        </div>
      ) : (
        <>
          <FavoritesSaveBar />
          {isLoading ? (
            <p className="text-sm text-slate-500 animate-pulse">Loading favorites…</p>
          ) : favorites.length === 0 ? (
            <div className="card-premium px-6 py-16 text-center">
              <p className="label-eyebrow">No favorites yet</p>
              <p className="mx-auto mt-3 max-w-sm text-sm text-slate-400">
                Tap the star on a token in your claimable list to add it here.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {favorites.map((token) => (
                <FavoriteRow
                  key={token.assetId}
                  token={token}
                  active={isFavorite(token.assetId)}
                  onToggle={() => toggle(token)}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add the tab to ProfilePage — imports**

In `src/pages/ProfilePage.tsx`, update the icon import (line 3) to include `IconStar`, and add the FavoritesTab import after the existing imports.

Change:

```tsx
import { IconCopy, IconCheck, IconWallet, IconChartLine, IconClock } from '@tabler/icons-react';
```

to:

```tsx
import { IconCopy, IconCheck, IconWallet, IconChartLine, IconClock, IconStar } from '@tabler/icons-react';
```

And add this import alongside the other feature imports (after the `HistoryList` import):

```tsx
import { FavoritesTab } from '@/features/favorites/components/FavoritesTab';
```

- [ ] **Step 3: Add the tab to ProfilePage — TABS array**

Change the `TABS` constant:

```tsx
const TABS = [
  { name: 'History', Icon: IconClock },
  { name: 'Analytics', Icon: IconChartLine },
  { name: 'Preferences', Icon: IconWallet },
];
```

to:

```tsx
const TABS = [
  { name: 'History', Icon: IconClock },
  { name: 'Favorites', Icon: IconStar },
  { name: 'Analytics', Icon: IconChartLine },
  { name: 'Preferences', Icon: IconWallet },
];
```

- [ ] **Step 4: Add the tab to ProfilePage — TabPanels**

Change the `<TabPanels>` block:

```tsx
        <TabPanels className="mt-7">
          <TabPanel>
            <HistoryTab />
          </TabPanel>
          <TabPanel>
            <AnalyticsTab />
          </TabPanel>
          <TabPanel>
            <PreferencesTab />
          </TabPanel>
        </TabPanels>
```

to (insert the Favorites panel second so its position matches the TABS order):

```tsx
        <TabPanels className="mt-7">
          <TabPanel>
            <HistoryTab />
          </TabPanel>
          <TabPanel>
            <FavoritesTab />
          </TabPanel>
          <TabPanel>
            <AnalyticsTab />
          </TabPanel>
          <TabPanel>
            <PreferencesTab />
          </TabPanel>
        </TabPanels>
```

- [ ] **Step 5: Run the suite**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/favorites/components/FavoritesTab.tsx src/pages/ProfilePage.tsx
git commit -m "feat(profile): add Favorites tab"
```

---

## Task 13: Operator note for the new migration

**Files:**
- Modify: `wrangler.jsonc`

- [ ] **Step 1: Extend the D1 comment to mention the favorites migration**

In `wrangler.jsonc`, update the comment block above the (commented-out) `d1_databases` so an operator applies both migrations. Change:

```jsonc
  // D1 is optional — the /api/user handler degrades gracefully if the binding
  // is missing. To enable persistence, run:
  //   wrangler d1 create tosi-users
  //   wrangler d1 execute tosi-users --remote --file=migrations/0001_create_users.sql
  // then uncomment the block below and paste the UUID from the create command.
```

to:

```jsonc
  // D1 is optional — the /api/user and /api/userFavorites handlers degrade
  // gracefully if the binding is missing. To enable persistence, run:
  //   wrangler d1 create tosi-users
  //   wrangler d1 execute tosi-users --remote --file=migrations/0001_create_users.sql
  //   wrangler d1 execute tosi-users --remote --file=migrations/0002_create_user_favorites.sql
  // then uncomment the block below and paste the UUID from the create command.
```

- [ ] **Step 2: Commit**

```bash
git add wrangler.jsonc
git commit -m "chore(wrangler): document user_favorites migration"
```

---

## Task 14: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: no errors. Fix any reported in the new files (e.g., unused imports) and re-run.

- [ ] **Step 2: Type-check + build**

Run: `npm run build`
Expected: `tsc -b` clean, `vite build` succeeds.

- [ ] **Step 3: Full test suite**

Run: `npm run test`
Expected: all suites PASS, including the four new ones.

- [ ] **Step 4: Commit any verification fixups**

```bash
git add -A
git commit -m "chore(favorites): lint/type fixups" || echo "nothing to fix up"
```

---

## Self-Review (completed against the spec)

- **Data model** → Task 1. **Endpoint (GET/POST/OPTIONS, degrade, replace)** → Task 3. **Signature verifier (format/freshness/stake/digest/crypto)** → Task 2. **Client signing with stake address** → Task 5. **Query + draft store** → Task 6. **useFavorites (toggle/dirty/save)** → Task 7. **Star button** → Task 8, **save bar** → Task 9. **DistributionCard sibling-button refactor** → Task 10. **Sort-to-top + wiring** → Task 11. **Profile Favorites tab** → Task 12. **Graceful degradation** → Tasks 3 (no DB) + 7/11 (not connected). **Testing** → Tasks 2,3,4,5,7. **Operator note** → Task 13. **Verification** → Task 14.
- **Type consistency:** `FavoriteToken {assetId,ticker,logo}` used identically across endpoint payload, queries, store, hook, components. `favoritesDigest` defined byte-identically in `verifyStakeSignature.ts` (server) and `signFavoritesUpdate.ts` (client); the Task 5 cross-check test fails if they drift. `verifyStakeSignature` is async everywhere it's awaited.
- **No placeholders:** every code/command step is concrete.
