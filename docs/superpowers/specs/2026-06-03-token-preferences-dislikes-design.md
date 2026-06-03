# Token Preferences (Dislikes) — Design Spec

**Date:** 2026-06-03
**Branch:** `feat/favorite-tokens` (continues PR #216)
**Status:** Approved
**Completes:** issue #183 (the dislikes half; favorites already shipped on this branch)

## Goal

Extend the unmerged favorites feature into the unified "token preferences" model issue
#183 originally asked for: a single `token_preferences` D1 table holding both favorites
and dislikes, one signed save covering both lists, dislike controls in the rewards grid,
and disliked tokens demoted into a collapsed "Hidden tokens" section.

## Decisions (locked)

- **Unified schema:** replace `user_favorites` with one `token_preferences` table with a
  `kind` column (`'favorite' | 'dislike'`). No D1 database exists anywhere yet (binding
  commented out in `wrangler.jsonc`), so migration `0002` is rewritten in place — there is
  no data to migrate and the favorites branch is unmerged.
- **Dislike UX:** demote + collapse. Disliked tokens drop out of the main grid into a
  collapsed "Hidden tokens (N)" section at the bottom; expanding it shows normal cards so
  the user can un-dislike. Tokens are never silently lost.
- **Mutual exclusion:** a token is favorite OR disliked, never both (enforced by the
  `(stake_address, asset_id)` primary key plus client/server validation). Toggling one
  state clears the other.
- **One save flow:** the existing draft → CIP-30 sign → full-replace POST flow covers both
  lists in a single signature and a single D1 batch.

## Data model

`migrations/0002_create_user_favorites.sql` is **replaced** by
`migrations/0002_create_token_preferences.sql`:

```sql
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

`ticker`/`logo` stay denormalized (same rationale as favorites). `position` orders
favorites; dislikes keep insertion order but order is not meaningful for them.

## API

`functions/api/userFavorites.ts` → renamed `functions/api/tokenPreferences.ts` (matches
ticket #183). No alias kept: the old endpoint never shipped (branch unmerged).

- `GET /api/tokenPreferences?stakeAddress=...` →
  `{ favorites: TokenRef[], dislikes: TokenRef[], degraded?: true }`
  (single `SELECT ... ORDER BY kind, position`, partitioned in code).
- `POST /api/tokenPreferences` body
  `{ stakeAddress, favorites: TokenRef[], dislikes: TokenRef[], signature, key, message }`
  — validates both lists with the existing per-item rules (caps: 200 favorites, 200
  dislikes), rejects any assetId appearing in both lists (400), verifies signature, then
  full-replaces all rows for the stake address in one `DB.batch`
  (DELETE + INSERT favorites with `kind='favorite'`, `position=i` + INSERT dislikes with
  `kind='dislike'`).
- Graceful degradation unchanged: no `DB` binding → GET returns empty lists with
  `degraded: true`; POST returns success with `degraded: true`.

## Signature scheme

Message format generalizes from favorites-only to both lists (server regex in
`functions/services/verifyStakeSignature.ts` and client builder must stay byte-identical):

```
Tosi preferences update for {stakeAddress} at {ISO timestamp}
favorites: {n} [{digest16(favoriteAssetIds)}]
dislikes: {m} [{digest16(dislikedAssetIds)}]
```

Same SHA-256/sorted/16-hex-char digest helper, same 5-minute freshness window, same
CIP-30 verification via `@cardano-foundation/cardano-verify-datasignature`. The verify
input gains a `dislikes: string[]` field; count and digest are checked per list.

## Frontend

All inside `src/features/favorites/` (directory name kept; it is the preferences feature):

- `types.ts`: `FavoriteToken` → `TokenRef` (same shape `{ assetId, ticker, logo }`);
  export `TokenPreferences = { favorites: TokenRef[], dislikes: TokenRef[] }`.
- `store/favorites-draft.ts` → `store/preferences-draft.ts`: draft becomes
  `TokenPreferences | null`, still owner-scoped to the stake address.
- `api/favorites.queries.ts` → `api/preferences.queries.ts`:
  `usePreferencesQuery` (returns both lists), `useSavePreferencesMutation` (posts both,
  invalidates `['preferences', stakeAddress]`).
- `hooks/useFavorites.ts` → `hooks/usePreferences.ts`. Returned API:
  `{ favorites, dislikes, favoriteIds, dislikedIds, isFavorite, isDisliked,
  toggleFavorite, toggleDislike, reset, isDirty, persist, saving, error, isLoading,
  connected, stakeAddress }`. `toggleFavorite` removes the token from dislikes if present
  (and vice versa). Dirty check compares both sets.
- `utils/signFavoritesUpdate.ts` → `utils/signPreferencesUpdate.ts` (new message format).
- `utils/sortFavoritesFirst.ts` stays; add `utils/partitionPreferences.ts`:
  `partitionPreferences(tokens, favoriteIds, dislikedIds)` →
  `{ visible: T[] /* favorites first */, hidden: T[] /* disliked */ }`.
- New `components/DislikeButton.tsx`: thumbs-down twin of `FavoriteStarButton`
  (`IconThumbDown`/`IconThumbDownFilled`, rose accent when active, `aria-pressed`,
  `stopPropagation`).
- `DistributionCard`: gains optional `dislike?: { active, onToggle }` prop; thumb renders
  as a sibling overlay next to the star (star `left-3 top-3`, dislike `left-10 top-3`;
  header padding widens to clear both).
- `AvailableDistributions`: partitions via `partitionPreferences`. Main grid renders
  `visible`; below it a collapsed disclosure "Hidden tokens (N)" renders `hidden` with the
  same cards. "Select all" targets only visible tokens; disliking a selected token
  deselects it (`useClaimStore.toggleAsset`/`setSelected`).
- `FavoritesTab` (Profile): below the favorites list, a "Hidden tokens" section lists
  dislikes with an un-dislike control. Save bar copy becomes "unsaved preference changes".

## Error handling

Unchanged from favorites: sign/save errors surface in the save bar via `FeedbackBanner`;
endpoint validation errors are 400/401/415/500 through `errorResponse`. The both-lists
conflict (`assetId` in favorites *and* dislikes) is a 400 server-side and prevented
client-side by the toggle semantics.

## Testing

- `functions/api/__tests__/userFavorites.test.ts` → `tokenPreferences.test.ts`: existing
  cases ported plus — dislikes round-trip, both-lists conflict 400, batch writes both
  kinds, degraded mode includes `dislikes: []`.
- `verifyStakeSignature` cases for the two-line message (stale, count mismatch per list,
  digest mismatch per list).
- `signPreferencesUpdate` unit test (message format, digest stability).
- `usePreferences` hook test: toggle mutual exclusion, dirty across both lists, persist
  payload shape.
- `partitionPreferences` unit test.
- Existing favorites component/integration tests updated to the renamed exports.

## Out of scope

- Per-user custom ordering UI (drag to reorder favorites).
- Any data migration (no live D1 data exists).
- D1 bring-up itself (operational; tracked separately — create `tosi-users`, apply
  migrations 0001 + 0002, uncomment the `d1_databases` block with the real UUID).
