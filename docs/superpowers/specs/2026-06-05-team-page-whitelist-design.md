# Team Page + Whitelist Endpoint — Design Spec

**Date:** 2026-06-05
**Branch:** `feat/team-image-cache` (off `feat/favorite-tokens`)
**Status:** Approved
**Completes:** issues #185 (Team page), #186 (`/api/getWhitelist`)

## Goal

A public `/team` page showing Blink Labs information and the whitelisted Tosi pools
(logo, ticker, name, link), backed by a KV-cached `/api/getWhitelist` Pages Function
joined client-side with the existing `/api/getPools`.

## Decisions (locked)

- **Endpoint pattern:** `getWhitelist.ts` clones `functions/api/getPools.ts` verbatim —
  KV cache key `__internal:whitelist_cache`, `expirationTtl: 86400` (the ticket's "daily
  refresh"), vm-sdk's already-exported `getWhitelist()` (no SDK bump), passthrough body.
- **Whitelist shape:** the VM API returns `{ [key: string]: string[] }` (map of pool-ID
  lists). The endpoint passes it through unchanged; the client flattens all values into
  one `Set<string>` of pool IDs.
- **Navigation:** the ticket's `PrimaryNavigation.tsx` does not exist — the Team link is
  added to the workspace nav in `src/layouts/components/Sidebar.tsx`.
- **Feature directory:** `src/features/team/` holds the hook; the page composes it.

## API

`GET /api/getWhitelist` (new `functions/api/getWhitelist.ts`):
KV-first (`__internal:whitelist_cache`), on miss `initVmSdk(env)` →
`sdk.getWhitelist()` → KV put with `expirationTtl: 86400` → `jsonResponse`. API-key
check and error handling identical to `getPools.ts`. Standard OPTIONS handler.

## Frontend

- `src/features/team/api/team.queries.ts`
  - `flattenWhitelist(raw: Record<string, string[]> | null | undefined): Set<string>` —
    pure, exported, unions all values; tolerates null/garbage.
  - `useWhitelistedPools()`: react-query (`['whitelisted-pools']`, `staleTime: 300_000`)
    fetching `/api/getPools` + `/api/getWhitelist` in parallel; returns pools whose
    `pool_id` (matching the existing `pools.queries.ts` field naming) is in the
    flattened set, mapped to `{ poolId, ticker, name, logo?, url? }`.
- `src/pages/TeamPage.tsx`, route `/team` in `src/App.tsx`, Team link (IconUsers) in the
  Sidebar workspace nav.
  - Hero section: Blink Labs branding/description with links (site, GitHub), using the
    existing `card-premium` / `label-eyebrow` idioms.
  - Pools grid: card per whitelisted pool (logo with initials fallback, ticker, name,
    external link). Loading skeleton, error card, and empty state mirror `HistoryList`.
- Public page — renders without a connected wallet.

## Error handling

Endpoint mirrors `getPools` (500 with logged cause; KV failures fall through to the SDK
call). Client: query error → error card; pools without metadata are skipped.

## Testing

- `functions/api/__tests__/getWhitelist.test.ts` (makeContext harness, mock KV + SDK):
  KV hit skips SDK, miss fetches + stores with TTL, API-key gate, SDK failure → 500.
- `flattenWhitelist` unit tests (multiple keys, empty, null).
- `useWhitelistedPools` hook test: join + filtering.

## Out of scope

- Pool comparison (#209) and platform statistics (#210).
- Editing/administering the whitelist (VM API owns it).
