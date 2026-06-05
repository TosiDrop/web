# Favorite Tokens — Design Spec

**Date:** 2026-05-29
**Branch:** `feat/favorite-tokens` (off latest `main` / `7514e1b`)
**Status:** Approved

## Goal

Let a user mark tokens as favorites, tied to their profile (stake address). Favorites are
stored server-side, persisted with a single CIP-30 signed "Save", surface as a star on the
claim token list (sorted to the top), and appear in a dedicated "Favorites" tab on the
profile page.

## Decisions (locked)

- **Base branch:** branched off fresh `main` (not `feat/claim-flow-polish`).
- **Persistence:** server-side in D1, keyed by stake address; edited locally then persisted
  with **one** CIP-30 signed save (not per-toggle).
- **Surfaces:** both the claim token list (star + sort-to-top) and a profile Favorites tab.
- **Verification:** real server-side CIP-30 verification (adds
  `@cardano-foundation/cardano-verify-datasignature`), payload-bound and replay-resistant.

## Constraints from the existing codebase (`main`)

- D1 `users` table exists (`migrations/0001_create_users.sql`), accessed via **raw SQL**
  (no Drizzle). The `DB` binding is **optional / currently commented out** in
  `wrangler.jsonc`; handlers must **degrade gracefully** when it is missing
  (mirror `functions/api/user.ts` `hasDb()`).
- Token identity is `assetId` on `ClaimableToken`
  (`{ assetId, ticker, logo, decimals, amount, premium, native }`).
- `DistributionCard` root is a `<button>` that toggles **claim-selection** (`useClaimStore`),
  so a favorite control must be a **sibling** element, not nested inside that button.
- API client: `apiClient.get/post` (relative `/api/...`, throws `ApiError`).
- Wallet identity from `useWalletStore` (`stakeAddress`, `changeAddress`, `connected`).
- Mesh `useWallet()` exposes `wallet.signData(address, payloadHex)`.
- Functions tests use a hand-built `makeContext` harness (see
  `functions/api/claim/__tests__/create.test.ts`); vitest includes
  `functions/**/*.test.ts` and `src/**/*.test.{ts,tsx}`.

## Data model

New migration `migrations/0002_create_user_favorites.sql`:

```sql
CREATE TABLE IF NOT EXISTS user_favorites (
  stake_address TEXT NOT NULL,
  asset_id      TEXT NOT NULL,
  ticker        TEXT,
  logo          TEXT,
  position      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (stake_address, asset_id)
);
CREATE INDEX IF NOT EXISTS idx_user_favorites_stake ON user_favorites (stake_address, position);
```

`ticker`/`logo` are denormalized snapshots so the profile Favorites tab renders without a
separate token-metadata lookup. Favorites always originate from a `ClaimableToken` (which
carries them). Minor staleness is acceptable.

## API — `functions/api/userFavorites.ts`

Raw SQL + graceful degradation, matching `functions/api/user.ts`.

- **GET `/api/userFavorites?stakeAddress=`** →
  `{ favorites: [{ assetId, ticker, logo }] }` ordered by `position`.
  No DB → `{ favorites: [], degraded: true }`.
- **POST `/api/userFavorites`** body
  `{ stakeAddress, favorites: [{ assetId, ticker, logo }], signature, key, message }`:
  1. Validate content-type JSON, `stakeAddress` is bech32 `stake...`, `favorites` is an array
     within a sane cap (e.g. ≤ 200), each entry shape/length-checked.
  2. `verifyStakeSignature(...)` (below) — 401 on failure.
  3. Atomically **replace** the set via `env.DB.batch([...])`: delete all rows for the stake
     address, then insert the new list with `position` = index.
  4. No DB → `{ success: true, degraded: true }` (no-op).
- **OPTIONS** → CORS preflight via existing `optionsResponse`.

## Signature verification — `functions/services/verifyStakeSignature.ts`

New dependency: `@cardano-foundation/cardano-verify-datasignature`.

Signed message (human-readable, payload-bound):

```
Tosi favorites update for {stakeAddress} at {ISO8601}
favorites: {count} [{sha256(sortedAssetIds.join(','))[:16]}]
```

Server checks, in order:
1. `signature`/`key`/`message` are strings.
2. Message matches the expected format and the embedded stake address equals `stakeAddress`.
3. Timestamp within a **5-minute** freshness window (reject stale/replayed).
4. Recomputed digest (sorted `assetId`s from the request body) equals the digest in the
   signed message → **payload-bound / tamper-evident**.
5. `verifySignature(signature, key, message, stakeAddress)` is true (valid CIP-30 sig for the
   **stake address**).

Returns a discriminated result `{ ok: true } | { ok: false; status; reason }`.

## Client — `src/features/favorites/`

- `api/favorites.queries.ts`
  - `useFavorites(stakeAddress)` — react-query GET; the **saved** server state.
  - `useSaveFavorites()` — mutation POSTing the signed payload; invalidates the query on success.
- `store/favorites-draft.ts` — zustand draft layer shared by both surfaces:
  - `draft: FavoriteToken[] | null` (null = "in sync with saved"), `baseline` sync helpers,
    `toggle(token)`, `isFavorite(assetId)`, `isDirty`, `reset()`.
  - One Save covers edits made on either page.
- `utils/signFavoritesUpdate.ts` — builds the message (digest via Web Crypto `subtle`), signs
  with the **stake/reward address**, returns `{ signature, key, message }`.
- `utils/sortFavoritesFirst.ts` — pure, stable: favorites first (by their order), the rest in
  original order. Unit-tested.
- `types.ts` — `FavoriteToken = { assetId; ticker; logo }`.

## UI

- **`DistributionCard`**: refactor root `<button>` → relative `<div>` wrapping (a) the existing
  claim-select `<button>` (unchanged behavior) and (b) an overlaid **star `<button>`** sibling
  with `stopPropagation`, `aria-pressed`, keyboard support. Star reflects the effective
  (draft-aware) favorite state; click toggles the draft. Hidden/inert when no wallet connected.
- **`AvailableDistributions`**: run tokens through `sortFavoritesFirst` before rendering.
- **`FavoritesSaveBar`**: shown on Claim + Profile when `isDirty`; "Save favorites" signs once
  and POSTs; shows saving / success / error; "Connect wallet" hint when disconnected.
- **Profile**: add a 4th **"Favorites"** tab (`IconStar`) listing favorites with unstar control
  plus the save bar.

## Graceful degradation

- No wallet connected → stars and sorting inert (favorites are per stake address).
- No DB binding → endpoints succeed as no-ops (`degraded: true`), matching `/api/user`.
- Wallet can't sign with the stake key → clear error surfaced in the save bar.

## Testing

- `functions/services/__tests__/verifyStakeSignature.test.ts` — format, stake match,
  freshness, digest binding, mocked crypto verify (success + each failure mode).
- `functions/api/__tests__/userFavorites.test.ts` — GET shape, POST validation + replace
  semantics, degraded mode, bad-signature 401. Uses `makeContext`.
- `src/features/favorites/__tests__/useFavorites.test.tsx` — toggle → dirty → signed save flow
  with mocked `apiClient` + signer + react-query.
- `src/features/favorites/__tests__/sortFavoritesFirst.test.ts` — pure sort behavior.

## Out of scope (YAGNI)

- Searching/adding arbitrary tokens from the profile (favorites originate from the claim list).
- Drag-to-reorder favorites.
- Cross-device realtime sync beyond react-query refetch.
- Migrating the existing profile-name flow to verified signatures (separate concern).
