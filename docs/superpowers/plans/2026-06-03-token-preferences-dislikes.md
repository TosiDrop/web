# Token Preferences (Dislikes) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the unmerged favorites feature into the unified `token_preferences` model from issue #183: one D1 table with a `kind` column, one signed save for favorites + dislikes, dislike controls on reward cards, and disliked tokens demoted into a collapsed "Hidden tokens" section.

**Architecture:** Rewrite migration 0002 in place (no D1 data exists anywhere), rename the `userFavorites` endpoint to `tokenPreferences` carrying both lists, generalize the CIP-30 message to a three-line format, and extend the client feature (`src/features/favorites/`) so the draft/sign/save flow covers both lists. `partitionPreferences` replaces `sortFavoritesFirst` in the rewards grid.

**Tech Stack:** Cloudflare Pages Functions, D1 (raw SQL), vitest, React 18 + TanStack Query + zustand, Mesh SDK (CIP-30), Tailwind.

**Branch:** `feat/favorite-tokens` (continues PR #216). Spec: `docs/superpowers/specs/2026-06-03-token-preferences-dislikes-design.md`.

**Spec amendment (apply in Task 5):** `sortFavoritesFirst` is absorbed by `partitionPreferences` (favorites-first ordering of the visible list) and deleted — no consumer remains. Note this in the spec doc.

---

### Task 1: Replace migration 0002 with `token_preferences`

**Files:**
- Delete: `migrations/0002_create_user_favorites.sql`
- Create: `migrations/0002_create_token_preferences.sql`
- Modify: `wrangler.jsonc` (comment block references the old file name)

- [ ] **Step 1: Swap the migration file**

```bash
git rm migrations/0002_create_user_favorites.sql
```

Create `migrations/0002_create_token_preferences.sql`:

```sql
-- Migration: Create token_preferences table for per-user favorite/disliked tokens.
-- Keyed by stake address (matches users.stake_address). ticker/logo are
-- denormalized snapshots so the profile views are self-contained. `kind`
-- makes favorite-vs-dislike mutually exclusive via the primary key.
CREATE TABLE IF NOT EXISTS token_preferences (
  stake_address TEXT NOT NULL,
  asset_id      TEXT NOT NULL,
  ticker        TEXT,
  logo          TEXT,
  kind          TEXT NOT NULL CHECK (kind IN ('favorite', 'dislike')),
  position      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (stake_address, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_token_preferences_stake
  ON token_preferences (stake_address, kind, position);
```

- [ ] **Step 2: Update the wrangler.jsonc comment**

In `wrangler.jsonc`, replace the line

```
  //   wrangler d1 execute tosi-users --remote --file=migrations/0002_create_user_favorites.sql
```

with

```
  //   wrangler d1 execute tosi-users --remote --file=migrations/0002_create_token_preferences.sql
```

and replace `/api/userFavorites` with `/api/tokenPreferences` in the comment above it.

- [ ] **Step 3: Commit**

```bash
git add -A migrations wrangler.jsonc
git commit -m "feat(preferences): replace user_favorites migration with token_preferences"
```

---

### Task 2: Generalize `verifyStakeSignature` to the two-list message

**Files:**
- Modify: `functions/services/verifyStakeSignature.ts`
- Modify: `functions/services/__tests__/verifyStakeSignature.test.ts`

The signed message becomes three lines (client builder in Task 4 must stay byte-identical):

```
Tosi preferences update for {stakeAddress} at {ISO}
favorites: {n} [{digest16}]
dislikes: {m} [{digest16}]
```

- [ ] **Step 1: Update the test file to the new format (failing tests)**

Replace the `buildMessage` helper and add dislike cases in `functions/services/__tests__/verifyStakeSignature.test.ts`. The full updated helper + new/changed cases:

```ts
async function buildMessage(
  stake: string,
  favoriteIds: string[],
  dislikedIds: string[],
  iso: string,
) {
  const f = await favoritesDigest(favoriteIds);
  const d = await favoritesDigest(dislikedIds);
  return (
    `Tosi preferences update for ${stake} at ${iso}\n` +
    `favorites: ${favoriteIds.length} [${f}]\n` +
    `dislikes: ${dislikedIds.length} [${d}]`
  );
}
```

Every existing call site of `buildMessage(STAKE, ids, iso)` becomes
`buildMessage(STAKE, ids, [], iso)` and every `verifyStakeSignature({...})` call gains
`dislikes: []` (or the test's disliked ids). Add these cases:

```ts
it('accepts a message binding both favorites and dislikes', async () => {
  const now = new Date('2026-06-03T12:00:00.000Z');
  const favs = ['a1'];
  const dislikes = ['z9', 'z1'];
  const message = await buildMessage(STAKE, favs, dislikes, now.toISOString());
  const res = await verifyStakeSignature({
    stakeAddress: STAKE, favorites: favs, dislikes, signature: 's', key: 'k', message, now,
  });
  expect(res.ok).toBe(true);
});

it('rejects when the dislike count does not match', async () => {
  const now = new Date('2026-06-03T12:00:00.000Z');
  const message = await buildMessage(STAKE, [], ['z9'], now.toISOString());
  const res = await verifyStakeSignature({
    stakeAddress: STAKE, favorites: [], dislikes: ['z9', 'z2'], signature: 's', key: 'k', message, now,
  });
  expect(res).toMatchObject({ ok: false, status: 401 });
});

it('rejects when the dislike digest does not match', async () => {
  const now = new Date('2026-06-03T12:00:00.000Z');
  const message = await buildMessage(STAKE, [], ['z9'], now.toISOString());
  const res = await verifyStakeSignature({
    stakeAddress: STAKE, favorites: [], dislikes: ['DIFFERENT'], signature: 's', key: 'k', message, now,
  });
  expect(res).toMatchObject({ ok: false, status: 401 });
});

it('rejects the legacy favorites-only message format', async () => {
  const digest = await favoritesDigest(['a1']);
  const message =
    `Tosi favorites update for ${STAKE} at 2026-06-03T12:00:00.000Z\nfavorites: 1 [${digest}]`;
  const res = await verifyStakeSignature({
    stakeAddress: STAKE, favorites: ['a1'], dislikes: [], signature: 's', key: 'k', message,
    now: new Date('2026-06-03T12:00:00.000Z'),
  });
  expect(res).toMatchObject({ ok: false, status: 401 });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run functions/services/__tests__/verifyStakeSignature.test.ts`
Expected: FAIL (new format not recognized, `dislikes` not part of `VerifyInput`).

- [ ] **Step 3: Implement the new verification**

In `functions/services/verifyStakeSignature.ts` replace the prefix, regex, input type, and
count/digest checks (digest helper unchanged):

```ts
const MESSAGE_PREFIX = 'Tosi preferences update';
// Mirrors signPreferencesUpdateMessage() on the client. The ISO timestamp bounds
// replay; the trailing digests bind the signature to the exact preference sets.
const MESSAGE_RE =
  /^Tosi preferences update for (stake[a-z0-9]+) at (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)\nfavorites: (\d+) \[([0-9a-f]{16})\]\ndislikes: (\d+) \[([0-9a-f]{16})\]$/;
```

```ts
interface VerifyInput {
  stakeAddress: string;
  favorites: string[];
  dislikes: string[];
  signature?: unknown;
  key?: unknown;
  message?: unknown;
  now?: Date;
}
```

Destructure the new groups and check both lists (replaces the single count/digest block):

```ts
  const [, signedStake, signedAt, favCount, favDigest, disCount, disDigest] = match;
```

```ts
  if (Number(favCount) !== favorites.length) {
    return { ok: false, status: 401, reason: 'Favorite count does not match signed message' };
  }
  if ((await favoritesDigest(favorites)) !== favDigest) {
    return { ok: false, status: 401, reason: 'Favorites payload does not match signed message' };
  }
  if (Number(disCount) !== dislikes.length) {
    return { ok: false, status: 401, reason: 'Dislike count does not match signed message' };
  }
  if ((await favoritesDigest(dislikes)) !== disDigest) {
    return { ok: false, status: 401, reason: 'Dislikes payload does not match signed message' };
  }
```

The function signature gains `dislikes` in its destructuring. Everything else
(freshness window, stake match, CIP-30 verify) is unchanged.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run functions/services/__tests__/verifyStakeSignature.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/services/verifyStakeSignature.ts functions/services/__tests__/verifyStakeSignature.test.ts
git commit -m "feat(preferences): bind dislikes into the signed preferences message"
```

---

### Task 3: Rename the endpoint to `tokenPreferences` and carry both lists

**Files:**
- Rename: `functions/api/userFavorites.ts` → `functions/api/tokenPreferences.ts`
- Rename: `functions/api/__tests__/userFavorites.test.ts` → `functions/api/__tests__/tokenPreferences.test.ts`

- [ ] **Step 1: Rename and update the test file (failing tests)**

```bash
git mv functions/api/userFavorites.ts functions/api/tokenPreferences.ts
git mv functions/api/__tests__/userFavorites.test.ts functions/api/__tests__/tokenPreferences.test.ts
```

In the test file: import from `'../tokenPreferences'`, point URLs at
`/api/tokenPreferences`, extend `fakeDb` select rows with `kind`, and update the cases.
Key changed/new cases (POST bodies now always include `dislikes`):

```ts
it('returns degraded empty lists when no DB', async () => {
  const res = await onRequestGet(getCtx(`https://x/api/tokenPreferences?stakeAddress=${STAKE}`, {}));
  const body = await res.json();
  expect(res.status).toBe(200);
  expect(body).toEqual({ favorites: [], dislikes: [], degraded: true });
});

it('partitions rows into favorites and dislikes', async () => {
  const db = fakeDb();
  db.__setSelect([
    { asset_id: 'a1', ticker: 'AAA', logo: '', kind: 'favorite' },
    { asset_id: 'z1', ticker: 'ZZZ', logo: '', kind: 'dislike' },
  ]);
  const res = await onRequestGet(getCtx(`https://x/api/tokenPreferences?stakeAddress=${STAKE}`, { DB: db }));
  const body = await res.json();
  expect(body).toEqual({
    favorites: [{ assetId: 'a1', ticker: 'AAA', logo: '' }],
    dislikes: [{ assetId: 'z1', ticker: 'ZZZ', logo: '' }],
  });
});

it('400 when an assetId appears in both lists', async () => {
  const res = await onRequestPost(postCtx({
    stakeAddress: STAKE,
    favorites: [{ assetId: 'a1', ticker: 'A', logo: '' }],
    dislikes: [{ assetId: 'a1', ticker: 'A', logo: '' }],
    signature: 's', key: 'k', message: 'm',
  }, {}));
  expect(res.status).toBe(400);
});

it('writes both kinds in one delete + insert batch', async () => {
  const db = fakeDb();
  const res = await onRequestPost(postCtx({
    stakeAddress: STAKE,
    favorites: [{ assetId: 'a1', ticker: 'A', logo: '' }],
    dislikes: [{ assetId: 'z1', ticker: 'Z', logo: '' }, { assetId: 'z2', ticker: 'Y', logo: '' }],
    signature: 's', key: 'k', message: 'm',
  }, { DB: db }));
  expect(res.status).toBe(200);
  expect(db.batch).toHaveBeenCalledTimes(1);
  const statements = db.batch.mock.calls[0][0];
  expect(statements).toHaveLength(4); // 1 delete + 1 favorite + 2 dislikes
  expect(verifyStakeMock).toHaveBeenCalledWith(
    expect.objectContaining({ favorites: ['a1'], dislikes: ['z1', 'z2'] }),
  );
});
```

Also update: `400 when favorites is not an array` gets a sibling
`400 when dislikes is not an array` (body `{ stakeAddress: STAKE, favorites: [], dislikes: 'x' }`),
and the degraded-POST case asserts `{ success: true, degraded: true }` with a body that
includes `dislikes: []`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run functions/api/__tests__/tokenPreferences.test.ts`
Expected: FAIL (module shape unchanged so far).

- [ ] **Step 3: Implement `functions/api/tokenPreferences.ts`**

Full replacement of the file's logic (validation helper added; GET/POST reworked;
`onRequestOptions` unchanged):

```ts
import type { Env } from '../types/env';
import { jsonResponse, errorResponse, optionsResponse } from '../services/vmClient';
import { verifyStakeSignature } from '../services/verifyStakeSignature';

const MAX_PER_LIST = 200;
const MAX_ASSET_ID_LEN = 120;
const MAX_TICKER_LEN = 50;
const MAX_LOGO_LEN = 600_000;

interface PreferenceRow {
  asset_id: string;
  ticker: string | null;
  logo: string | null;
  kind: 'favorite' | 'dislike';
}

interface TokenRefInput {
  assetId?: unknown;
  ticker?: unknown;
  logo?: unknown;
}

interface TokenRef {
  assetId: string;
  ticker: string;
  logo: string;
}

function hasDb(env: Env): env is Env & { DB: D1Database } {
  return typeof env?.DB?.prepare === 'function';
}

// Returns the sanitized list, or an error string.
function sanitizeList(raw: unknown, label: string): TokenRef[] | string {
  if (!Array.isArray(raw)) return `${label} must be an array`;
  if (raw.length > MAX_PER_LIST) return `${label} exceeds ${MAX_PER_LIST}`;
  const seen = new Set<string>();
  const out: TokenRef[] = [];
  for (const f of raw as TokenRefInput[]) {
    if (!f || typeof f.assetId !== 'string' || !f.assetId || f.assetId.length > MAX_ASSET_ID_LEN) {
      return `each ${label} entry needs a valid assetId`;
    }
    if (seen.has(f.assetId)) continue;
    seen.add(f.assetId);
    const ticker = typeof f.ticker === 'string' ? f.ticker.slice(0, MAX_TICKER_LEN) : '';
    const logo = typeof f.logo === 'string' && f.logo.length <= MAX_LOGO_LEN ? f.logo : '';
    out.push({ assetId: f.assetId, ticker, logo });
  }
  return out;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const stakeAddress = new URL(request.url).searchParams.get('stakeAddress');

  if (!stakeAddress) {
    return errorResponse('stakeAddress is required', 400, origin);
  }
  if (!hasDb(env)) {
    return jsonResponse({ favorites: [], dislikes: [], degraded: true }, 200, origin);
  }

  try {
    const { results } = await env.DB.prepare(
      'SELECT asset_id, ticker, logo, kind FROM token_preferences WHERE stake_address = ? ORDER BY kind ASC, position ASC',
    ).bind(stakeAddress).all<PreferenceRow>();

    const favorites: { assetId: string; ticker: string; logo: string }[] = [];
    const dislikes: typeof favorites = [];
    for (const r of results ?? []) {
      const ref = { assetId: r.asset_id, ticker: r.ticker ?? '', logo: r.logo ?? '' };
      (r.kind === 'dislike' ? dislikes : favorites).push(ref);
    }
    return jsonResponse({ favorites, dislikes }, 200, origin);
  } catch (err) {
    console.error('D1 GET token preferences error:', err);
    return errorResponse('Error fetching token preferences', 500, origin);
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
    favorites?: unknown;
    dislikes?: unknown;
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

  const favorites = sanitizeList(body.favorites, 'favorites');
  if (typeof favorites === 'string') return errorResponse(favorites, 400, origin);
  const dislikes = sanitizeList(body.dislikes, 'dislikes');
  if (typeof dislikes === 'string') return errorResponse(dislikes, 400, origin);

  const favoriteIds = new Set(favorites.map((f) => f.assetId));
  if (dislikes.some((d) => favoriteIds.has(d.assetId))) {
    return errorResponse('a token cannot be both favorite and disliked', 400, origin);
  }

  const verification = await verifyStakeSignature({
    stakeAddress: body.stakeAddress,
    favorites: favorites.map((f) => f.assetId),
    dislikes: dislikes.map((d) => d.assetId),
    signature: body.signature,
    key: body.key,
    message: body.message,
  });
  if (!verification.ok) {
    return errorResponse(verification.reason, verification.status, origin);
  }

  if (!hasDb(env)) {
    return jsonResponse(
      { success: true, count: favorites.length + dislikes.length, degraded: true },
      200,
      origin,
    );
  }

  try {
    const stake = body.stakeAddress;
    const insert = (ref: TokenRef, kind: 'favorite' | 'dislike', i: number) =>
      env.DB.prepare(
        'INSERT INTO token_preferences (stake_address, asset_id, ticker, logo, kind, position) VALUES (?, ?, ?, ?, ?, ?)',
      ).bind(stake, ref.assetId, ref.ticker, ref.logo, kind, i);

    await env.DB.batch([
      env.DB.prepare('DELETE FROM token_preferences WHERE stake_address = ?').bind(stake),
      ...favorites.map((f, i) => insert(f, 'favorite', i)),
      ...dislikes.map((d, i) => insert(d, 'dislike', i)),
    ]);
    return jsonResponse({ success: true, count: favorites.length + dislikes.length }, 200, origin);
  } catch (err) {
    console.error('D1 POST token preferences error:', err);
    return errorResponse('Error saving token preferences', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async (context) => {
  const origin = context.request.headers.get('Origin');
  return optionsResponse(origin);
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run functions/api/__tests__/tokenPreferences.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A functions/api
git commit -m "feat(preferences): tokenPreferences endpoint carries favorites and dislikes"
```

---

### Task 4: Client types, store, queries, sign util

**Files:**
- Modify: `src/features/favorites/types.ts`
- Rename: `src/features/favorites/store/favorites-draft.ts` → `store/preferences-draft.ts`
- Rename: `src/features/favorites/api/favorites.queries.ts` → `api/preferences.queries.ts`
- Rename: `src/features/favorites/utils/signFavoritesUpdate.ts` → `utils/signPreferencesUpdate.ts`
- Rename: `src/features/favorites/__tests__/signFavoritesUpdate.test.ts` → `__tests__/signPreferencesUpdate.test.ts`

- [ ] **Step 1: Update the sign-util test (failing)**

```bash
git mv src/features/favorites/utils/signFavoritesUpdate.ts src/features/favorites/utils/signPreferencesUpdate.ts
git mv src/features/favorites/__tests__/signFavoritesUpdate.test.ts src/features/favorites/__tests__/signPreferencesUpdate.test.ts
git mv src/features/favorites/store/favorites-draft.ts src/features/favorites/store/preferences-draft.ts
git mv src/features/favorites/api/favorites.queries.ts src/features/favorites/api/preferences.queries.ts
```

In `signPreferencesUpdate.test.ts`, import `signPreferencesUpdateMessage` from
`'../utils/signPreferencesUpdate'`; calls now pass
`{ wallet, stakeAddress, favoriteIds, dislikedIds }` and assertions expect the
three-line message:

```ts
expect(message).toMatch(
  /^Tosi preferences update for stake1\w+ at \d{4}-\d{2}-\d{2}T[\d:.]+Z\nfavorites: 2 \[[0-9a-f]{16}\]\ndislikes: 1 \[[0-9a-f]{16}\]$/,
);
```

(Keep the existing digest-stability assertion — same ids in different order produce the
same message.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/features/favorites/__tests__/signPreferencesUpdate.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement types, sign util, store, queries**

`src/features/favorites/types.ts`:

```ts
export interface TokenRef {
  assetId: string;
  ticker: string;
  logo: string;
}

export interface TokenPreferences {
  favorites: TokenRef[];
  dislikes: TokenRef[];
}

export const EMPTY_PREFERENCES: TokenPreferences = { favorites: [], dislikes: [] };
```

`utils/signPreferencesUpdate.ts` (digest + toHex helpers unchanged from the old file):

```ts
interface SignPreferencesPayload {
  wallet: {
    signData: (address: string, payload: string) => Promise<{ signature: string; key: string }>;
  };
  stakeAddress: string;
  favoriteIds: string[];
  dislikedIds: string[];
}

// Must stay byte-identical to the digest in
// functions/services/verifyStakeSignature.ts — the server recomputes and compares.
async function preferencesDigest(assetIds: string[]): Promise<string> {
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

export async function signPreferencesUpdateMessage({
  wallet,
  stakeAddress,
  favoriteIds,
  dislikedIds,
}: SignPreferencesPayload): Promise<{ signature: string; key: string; message: string }> {
  const favDigest = await preferencesDigest(favoriteIds);
  const disDigest = await preferencesDigest(dislikedIds);
  const message =
    `Tosi preferences update for ${stakeAddress} at ${new Date().toISOString()}\n` +
    `favorites: ${favoriteIds.length} [${favDigest}]\n` +
    `dislikes: ${dislikedIds.length} [${disDigest}]`;

  // CIP-30: sign with the stake/reward address so the server can verify
  // stake-address ownership.
  const result = await wallet.signData(stakeAddress, toHex(message));
  return { signature: result.signature, key: result.key, message };
}
```

`store/preferences-draft.ts`:

```ts
import { create } from 'zustand';
import type { TokenPreferences } from '@/features/favorites/types';

interface PreferencesDraftState {
  // null = in sync with the server. `owner` scopes the draft to a stake
  // address so switching wallets discards a stale draft.
  draft: TokenPreferences | null;
  owner: string | null;
  setDraft: (draft: TokenPreferences | null, owner: string | null) => void;
}

export const usePreferencesDraft = create<PreferencesDraftState>((set) => ({
  draft: null,
  owner: null,
  setDraft: (draft, owner) => set({ draft, owner }),
}));
```

`api/preferences.queries.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { TokenPreferences, TokenRef } from '@/features/favorites/types';

interface PreferencesResponse {
  favorites: TokenRef[];
  dislikes: TokenRef[];
  degraded?: boolean;
}

export interface SavePreferencesRequest {
  stakeAddress: string;
  favorites: TokenRef[];
  dislikes: TokenRef[];
  signature: string;
  key: string;
  message: string;
}

export function usePreferencesQuery(stakeAddress: string | null) {
  return useQuery<TokenPreferences, Error>({
    queryKey: ['preferences', stakeAddress],
    queryFn: async () => {
      if (!stakeAddress) throw new Error('stakeAddress is required');
      const data = await apiClient.get<PreferencesResponse>(
        `/api/tokenPreferences?stakeAddress=${encodeURIComponent(stakeAddress)}`,
      );
      return { favorites: data.favorites ?? [], dislikes: data.dislikes ?? [] };
    },
    enabled: !!stakeAddress,
  });
}

export function useSavePreferencesMutation() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, SavePreferencesRequest>({
    mutationFn: (data) => apiClient.post<{ success: boolean }>('/api/tokenPreferences', data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['preferences', variables.stakeAddress] });
    },
  });
}
```

(`hooks/useFavorites.ts` still imports the old names at this point — it is rewritten in
Task 5; the suite stays red only on that file's imports until then, which is why Tasks 4
and 5 land as one commit if you prefer. Preferred: proceed to Task 5 before committing.)

- [ ] **Step 4: Run the sign test to verify it passes**

Run: `npx vitest run src/features/favorites/__tests__/signPreferencesUpdate.test.ts`
Expected: PASS.

---

### Task 5: `usePreferences` hook + `partitionPreferences` util

**Files:**
- Rename: `src/features/favorites/hooks/useFavorites.ts` → `hooks/usePreferences.ts`
- Rename: `src/features/favorites/__tests__/useFavorites.test.tsx` → `__tests__/usePreferences.test.tsx`
- Create: `src/features/favorites/utils/partitionPreferences.ts`
- Create: `src/features/favorites/__tests__/partitionPreferences.test.ts`
- Delete: `src/features/favorites/utils/sortFavoritesFirst.ts` + `__tests__/sortFavoritesFirst.test.ts`
- Modify: `docs/superpowers/specs/2026-06-03-token-preferences-dislikes-design.md` (spec amendment)

- [ ] **Step 1: Write the partition test (failing)**

`src/features/favorites/__tests__/partitionPreferences.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { partitionPreferences } from '../utils/partitionPreferences';

const t = (assetId: string) => ({ assetId });

describe('partitionPreferences', () => {
  it('puts favorites first, keeps the rest, and extracts disliked into hidden', () => {
    const tokens = [t('plain'), t('fav'), t('bad'), t('fav2')];
    const { visible, hidden } = partitionPreferences(
      tokens,
      new Set(['fav', 'fav2']),
      new Set(['bad']),
    );
    expect(visible.map((x) => x.assetId)).toEqual(['fav', 'fav2', 'plain']);
    expect(hidden.map((x) => x.assetId)).toEqual(['bad']);
  });

  it('dislike wins if an id is somehow in both sets', () => {
    const { visible, hidden } = partitionPreferences([t('x')], new Set(['x']), new Set(['x']));
    expect(visible).toEqual([]);
    expect(hidden.map((h) => h.assetId)).toEqual(['x']);
  });

  it('handles empty sets', () => {
    const { visible, hidden } = partitionPreferences([t('a')], new Set(), new Set());
    expect(visible.map((x) => x.assetId)).toEqual(['a']);
    expect(hidden).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure, then implement**

Run: `npx vitest run src/features/favorites/__tests__/partitionPreferences.test.ts` → FAIL.

`src/features/favorites/utils/partitionPreferences.ts`:

```ts
export function partitionPreferences<T extends { assetId: string }>(
  tokens: T[],
  favoriteIds: Set<string>,
  dislikedIds: Set<string>,
): { visible: T[]; hidden: T[] } {
  const favorites: T[] = [];
  const rest: T[] = [];
  const hidden: T[] = [];
  for (const token of tokens) {
    if (dislikedIds.has(token.assetId)) hidden.push(token);
    else if (favoriteIds.has(token.assetId)) favorites.push(token);
    else rest.push(token);
  }
  return { visible: [...favorites, ...rest], hidden };
}
```

Re-run → PASS. Then delete the superseded util and note the amendment:

```bash
git rm src/features/favorites/utils/sortFavoritesFirst.ts src/features/favorites/__tests__/sortFavoritesFirst.test.ts
```

In the spec's Frontend section replace the `sortFavoritesFirst.ts stays` sentence with:
"`utils/sortFavoritesFirst.ts` is absorbed by `partitionPreferences` (visible list is
favorites-first) and removed."

- [ ] **Step 3: Update the hook test (failing)**

```bash
git mv src/features/favorites/hooks/useFavorites.ts src/features/favorites/hooks/usePreferences.ts
git mv src/features/favorites/__tests__/useFavorites.test.tsx src/features/favorites/__tests__/usePreferences.test.tsx
```

In `usePreferences.test.tsx`: mock `'@/features/favorites/utils/signPreferencesUpdate'`
exporting `signPreferencesUpdateMessage`; import `usePreferences` from
`'../hooks/usePreferences'` and `usePreferencesDraft` from `'../store/preferences-draft'`;
GET mocks resolve `{ favorites: [...], dislikes: [...] }`; draft reset becomes
`usePreferencesDraft.setState({ draft: null, owner: null })`. Updated/new cases:

```ts
it('hydrates both lists and reports not dirty', async () => {
  getMock.mockResolvedValue({
    favorites: [{ assetId: 'a1', ticker: 'A', logo: '' }],
    dislikes: [{ assetId: 'z1', ticker: 'Z', logo: '' }],
  });
  const { result } = renderHook(() => usePreferences(), { wrapper });
  await waitFor(() => expect(result.current.favorites).toHaveLength(1));
  expect(result.current.isFavorite('a1')).toBe(true);
  expect(result.current.isDisliked('z1')).toBe(true);
  expect(result.current.isDirty).toBe(false);
});

it('toggleDislike moves a favorited token into dislikes', async () => {
  getMock.mockResolvedValue({
    favorites: [{ assetId: 'a1', ticker: 'A', logo: '' }],
    dislikes: [],
  });
  const { result } = renderHook(() => usePreferences(), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  act(() => result.current.toggleDislike({ assetId: 'a1', ticker: 'A', logo: '' }));
  expect(result.current.isFavorite('a1')).toBe(false);
  expect(result.current.isDisliked('a1')).toBe(true);
  expect(result.current.isDirty).toBe(true);
});

it('toggleFavorite moves a disliked token into favorites', async () => {
  getMock.mockResolvedValue({
    favorites: [],
    dislikes: [{ assetId: 'z1', ticker: 'Z', logo: '' }],
  });
  const { result } = renderHook(() => usePreferences(), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  act(() => result.current.toggleFavorite({ assetId: 'z1', ticker: 'Z', logo: '' }));
  expect(result.current.isDisliked('z1')).toBe(false);
  expect(result.current.isFavorite('z1')).toBe(true);
});

it('persist signs both lists and posts them', async () => {
  getMock.mockResolvedValue({ favorites: [], dislikes: [] });
  postMock.mockResolvedValue({ success: true });
  signMock.mockResolvedValue({ signature: 'sig', key: 'key', message: 'msg' });
  const { result } = renderHook(() => usePreferences(), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  act(() => result.current.toggleFavorite({ assetId: 'a1', ticker: 'A', logo: '' }));
  act(() => result.current.toggleDislike({ assetId: 'z1', ticker: 'Z', logo: '' }));
  await act(() => result.current.persist());
  expect(signMock).toHaveBeenCalledWith(
    expect.objectContaining({ favoriteIds: ['a1'], dislikedIds: ['z1'] }),
  );
  expect(postMock).toHaveBeenCalledWith('/api/tokenPreferences', expect.objectContaining({
    favorites: [{ assetId: 'a1', ticker: 'A', logo: '' }],
    dislikes: [{ assetId: 'z1', ticker: 'Z', logo: '' }],
    signature: 'sig',
  }));
  await waitFor(() => expect(result.current.isDirty).toBe(false));
});
```

Keep the existing surviving cases (sign-failure surfaces error, wallet-switch discards
draft) updated to the new shapes.

- [ ] **Step 4: Run to verify failure, then implement the hook**

Run: `npx vitest run src/features/favorites/__tests__/usePreferences.test.tsx` → FAIL.

`src/features/favorites/hooks/usePreferences.ts`:

```ts
import { useMemo, useState } from 'react';
import { useWallet } from '@meshsdk/react';
import { useWalletStore } from '@/store/wallet-state';
import {
  usePreferencesQuery,
  useSavePreferencesMutation,
} from '@/features/favorites/api/preferences.queries';
import { usePreferencesDraft } from '@/features/favorites/store/preferences-draft';
import { signPreferencesUpdateMessage } from '@/features/favorites/utils/signPreferencesUpdate';
import { EMPTY_PREFERENCES, type TokenPreferences, type TokenRef } from '@/features/favorites/types';

function sameIds(a: TokenRef[], b: TokenRef[]): boolean {
  if (a.length !== b.length) return false;
  const bIds = new Set(b.map((f) => f.assetId));
  return a.every((f) => bIds.has(f.assetId));
}

function samePreferences(a: TokenPreferences, b: TokenPreferences): boolean {
  return sameIds(a.favorites, b.favorites) && sameIds(a.dislikes, b.dislikes);
}

const without = (list: TokenRef[], assetId: string) =>
  list.filter((f) => f.assetId !== assetId);

export function usePreferences() {
  const { wallet, connected } = useWallet();
  const stakeAddress = useWalletStore((s) => s.stakeAddress);

  const query = usePreferencesQuery(stakeAddress);
  const saved = useMemo(() => query.data ?? EMPTY_PREFERENCES, [query.data]);

  const rawDraft = usePreferencesDraft((s) => s.draft);
  const draftOwner = usePreferencesDraft((s) => s.owner);
  const setDraftState = usePreferencesDraft((s) => s.setDraft);
  const draft = draftOwner === stakeAddress ? rawDraft : null;
  const setDraft = (next: TokenPreferences | null) => setDraftState(next, stakeAddress);

  const save = useSavePreferencesMutation();
  const [signError, setSignError] = useState<string | null>(null);

  const effective = draft ?? saved;
  const favoriteIds = useMemo(
    () => new Set(effective.favorites.map((f) => f.assetId)),
    [effective],
  );
  const dislikedIds = useMemo(
    () => new Set(effective.dislikes.map((f) => f.assetId)),
    [effective],
  );
  const isDirty = draft !== null && !samePreferences(draft, saved);

  const isFavorite = (assetId: string) => favoriteIds.has(assetId);
  const isDisliked = (assetId: string) => dislikedIds.has(assetId);

  const toggleFavorite = (token: TokenRef) => {
    const base = draft ?? saved;
    const exists = base.favorites.some((f) => f.assetId === token.assetId);
    setDraft({
      favorites: exists
        ? without(base.favorites, token.assetId)
        : [...base.favorites, token],
      dislikes: without(base.dislikes, token.assetId),
    });
  };

  const toggleDislike = (token: TokenRef) => {
    const base = draft ?? saved;
    const exists = base.dislikes.some((f) => f.assetId === token.assetId);
    setDraft({
      favorites: without(base.favorites, token.assetId),
      dislikes: exists
        ? without(base.dislikes, token.assetId)
        : [...base.dislikes, token],
    });
  };

  const reset = () => setDraft(null);

  const persist = async () => {
    if (!wallet || !stakeAddress || !connected) return;
    setSignError(null);
    const current = draft ?? saved;
    try {
      const { signature, key, message } = await signPreferencesUpdateMessage({
        wallet,
        stakeAddress,
        favoriteIds: current.favorites.map((f) => f.assetId),
        dislikedIds: current.dislikes.map((f) => f.assetId),
      });
      await save.mutateAsync({
        stakeAddress,
        favorites: current.favorites,
        dislikes: current.dislikes,
        signature,
        key,
        message,
      });
      setDraft(null);
    } catch (e) {
      setSignError(e instanceof Error ? e.message : 'Failed to sign or save preferences');
    }
  };

  return {
    connected,
    stakeAddress,
    favorites: effective.favorites,
    dislikes: effective.dislikes,
    favoriteIds,
    dislikedIds,
    isFavorite,
    isDisliked,
    toggleFavorite,
    toggleDislike,
    reset,
    isDirty,
    persist,
    saving: save.isPending,
    error: signError ?? (save.error instanceof Error ? save.error.message : null),
    isLoading: query.isLoading,
  };
}
```

- [ ] **Step 5: Run, then commit Tasks 4+5 together**

Run: `npx vitest run src/features/favorites` → component tests still fail (Task 6 fixes
consumers); hook/util/sign tests PASS.

```bash
git add -A src/features/favorites docs/superpowers/specs/2026-06-03-token-preferences-dislikes-design.md
git commit -m "feat(preferences): client model, signed save, and partition for dislikes"
```

---

### Task 6: UI — DislikeButton, DistributionCard, AvailableDistributions, FavoritesTab, save bar

**Files:**
- Create: `src/features/favorites/components/DislikeButton.tsx`
- Modify: `src/features/rewards/components/DistributionCard.tsx`
- Modify: `src/features/rewards/components/AvailableDistributions.tsx`
- Modify: `src/features/favorites/components/FavoritesTab.tsx`
- Modify: `src/features/favorites/components/FavoritesSaveBar.tsx`

- [ ] **Step 1: DislikeButton**

`src/features/favorites/components/DislikeButton.tsx`:

```tsx
import { IconThumbDown, IconThumbDownFilled } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface DislikeButtonProps {
  active: boolean;
  onToggle: () => void;
  className?: string;
}

export function DislikeButton({ active, onToggle, className }: DislikeButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? 'Remove dislike' : 'Hide this token'}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        'flex h-6 w-6 items-center justify-center rounded-md border transition',
        active
          ? 'border-rose-400/40 bg-rose-400/10 text-rose-300'
          : 'border-border-default bg-surface-inset text-slate-500 hover:text-rose-300',
        className,
      )}
    >
      {active ? <IconThumbDownFilled size={13} /> : <IconThumbDown size={13} stroke={1.8} />}
    </button>
  );
}
```

- [ ] **Step 2: DistributionCard gains the dislike overlay**

In `src/features/rewards/components/DistributionCard.tsx`:

```tsx
import { DislikeButton } from '@/features/favorites/components/DislikeButton';

interface DistributionCardProps {
  token: ClaimableToken;
  selected: boolean;
  onToggle: () => void;
  favorite?: { active: boolean; onToggle: () => void };
  dislike?: { active: boolean; onToggle: () => void };
}
```

Render the thumb as a second sibling overlay and widen the header padding:

```tsx
      {favorite && (
        <FavoriteStarButton
          active={favorite.active}
          onToggle={favorite.onToggle}
          className="absolute left-3 top-3 z-10"
        />
      )}
      {dislike && (
        <DislikeButton
          active={dislike.active}
          onToggle={dislike.onToggle}
          className={cn('absolute top-3 z-10', favorite ? 'left-10' : 'left-3')}
        />
      )}
```

and the header row class becomes:

```tsx
        <div
          className={cn(
            'flex items-center gap-2.5',
            favorite && dislike ? 'pl-14' : (favorite || dislike) && 'pl-7',
          )}
        >
```

- [ ] **Step 3: AvailableDistributions — partition, hidden section, selection semantics**

Full replacement of `src/features/rewards/components/AvailableDistributions.tsx`:

```tsx
import { useMemo, useState } from 'react';
import type { ClaimableToken } from '@/shared/rewards';
import { useClaimStore } from '@/store/claim-state';
import { usePreferences } from '@/features/favorites/hooks/usePreferences';
import { partitionPreferences } from '@/features/favorites/utils/partitionPreferences';
import { FavoritesSaveBar } from '@/features/favorites/components/FavoritesSaveBar';
import { DistributionCard } from './DistributionCard';

interface AvailableDistributionsProps {
  tokens: ClaimableToken[];
}

export function AvailableDistributions({ tokens }: AvailableDistributionsProps) {
  const selectedAssetIds = useClaimStore((s) => s.selectedAssetIds);
  const toggleAsset = useClaimStore((s) => s.toggleAsset);
  const setSelected = useClaimStore((s) => s.setSelected);

  const {
    connected,
    favoriteIds,
    dislikedIds,
    isFavorite,
    isDisliked,
    toggleFavorite,
    toggleDislike,
  } = usePreferences();

  const [showHidden, setShowHidden] = useState(false);

  const { visible, hidden } = useMemo(
    () => partitionPreferences(tokens, favoriteIds, dislikedIds),
    [tokens, favoriteIds, dislikedIds],
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

  const allSelected =
    visible.length > 0 && visible.every((t) => selectedAssetIds.includes(t.assetId));

  const toggleAll = () => {
    setSelected(allSelected ? [] : visible.map((t) => t.assetId));
  };

  // Disliking a selected token also deselects it so hidden tokens can't ride
  // along into a claim unnoticed.
  const handleDislike = (token: ClaimableToken) => {
    if (!isDisliked(token.assetId) && selectedAssetIds.includes(token.assetId)) {
      toggleAsset(token.assetId);
    }
    toggleDislike({ assetId: token.assetId, ticker: token.ticker, logo: token.logo });
  };

  const renderCard = (token: ClaimableToken) => (
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
      dislike={
        connected
          ? { active: isDisliked(token.assetId), onToggle: () => handleDislike(token) }
          : undefined
      }
    />
  );

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-white">
          Claimable tokens
          <span className="ml-1.5 text-slate-500">{visible.length}</span>
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
        {visible.map(renderCard)}
      </div>

      {hidden.length > 0 && (
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={() => setShowHidden((v) => !v)}
            className="font-mono text-[10px] uppercase tracking-wider text-slate-500 transition hover:text-slate-300"
          >
            {showHidden ? '▾' : '▸'} Hidden tokens ({hidden.length})
          </button>
          {showHidden && (
            <div className="grid grid-cols-1 gap-3 opacity-70 sm:grid-cols-2 xl:grid-cols-3">
              {hidden.map(renderCard)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: FavoritesTab — hidden tokens section; save bar copy**

`FavoritesSaveBar.tsx`: import `usePreferences` from
`'@/features/favorites/hooks/usePreferences'`; copy changes to
"You have unsaved preference changes." / "Connect your wallet to save preferences." /
button label stays "Save" semantics: `{saving ? 'Saving…' : 'Save changes'}`.

`FavoritesTab.tsx`: switch to `usePreferences`; rows for dislikes reuse `FavoriteRow`'s
layout with a `DislikeButton`. Replace the component body after the favorites list with:

```tsx
export function FavoritesTab() {
  const {
    favorites,
    dislikes,
    connected,
    isFavorite,
    isDisliked,
    toggleFavorite,
    toggleDislike,
    isLoading,
  } = usePreferences();
  // ... unchanged heading + not-connected branch ...
```

and after the favorites `<ul>` (inside the connected branch):

```tsx
          <div className="pt-4">
            <h3 className="text-sm font-medium text-white">Hidden tokens</h3>
            <p className="mt-1 text-xs text-slate-500">
              Disliked tokens are tucked into a collapsed section on the claim page.
            </p>
            {dislikes.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Nothing hidden.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {dislikes.map((token) => (
                  <li
                    key={token.assetId}
                    className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-raised px-4 py-3"
                  >
                    <span className="truncate text-sm font-medium text-white">
                      {token.ticker || token.assetId}
                    </span>
                    <span className="ml-auto">
                      <DislikeButton
                        active={isDisliked(token.assetId)}
                        onToggle={() => toggleDislike(token)}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
```

(`FavoriteRow` keeps using `FavoriteStarButton` with `toggleFavorite`; update its
`onToggle` prop wiring accordingly: `onToggle={() => toggleFavorite(token)}`.)

- [ ] **Step 5: Run the full suite, typecheck, commit**

```bash
npx vitest run
npx tsc -b
npx eslint src functions --max-warnings 0
git add -A src
git commit -m "feat(preferences): dislike controls, hidden-tokens section, save bar copy"
```

Expected: all green. If `IconThumbDownFilled` is missing from the installed
`@tabler/icons-react`, fall back to `IconThumbDown` with a filled style via the active
class (keep `aria-pressed` semantics).

---

### Task 7: Full verification

- [ ] **Step 1: Whole-repo gates**

```bash
npx vitest run
npx tsc -b
npx eslint src functions --max-warnings 0
npm run build
```

Expected: all pass; build completes.

- [ ] **Step 2: Grep for leftovers**

```bash
grep -rn "userFavorites\|user_favorites\|FavoriteToken\|signFavoritesUpdate\|favorites-draft\|useFavorites\b\|sortFavoritesFirst" src functions migrations wrangler.jsonc || echo CLEAN
```

Expected: `CLEAN` (docs/ may still mention old names historically — that's fine).

- [ ] **Step 3: Commit any stragglers and push**

```bash
git push origin feat/favorite-tokens
```
