# Design: Personal analytics, network switching, claim-state sharing, pool comparison

**Date:** 2026-07-10
**Issues:** #193 (personal analytics), #175 (network switching), #177 (claim-store integration), #209 (pool comparison), #211 (analytics placement decision), #195 (connect Analytics tab — closed by #193's UI PR)
**Base:** stacked on `feat/quiet-dark-redesign` (PR #221)

## Decisions made

- **#211 resolved:** pool comparison (and later #210 platform stats) live on a **public `/analytics` page**; personal analytics stays in Profile → Analytics.
- **Fees metric (#193):** persist real fees at claim time (new D1 table) rather than estimating; the metric accrues data going forward.
- **#177 shape:** lean version — share `lookupAddress` via the claim store; do **not** copy TanStack Query server state into Zustand.
- **Sequencing:** stack on PR #221's branch; five small PRs, each branched off the previous, squash-merged in order, stack rebased with `git rebase --onto` after each merge.

## Constraints discovered

- The mainnet VM API (`vm.adaseal.eu`) exists and responds, but the current API key only authenticates against `vmprev.adaseal.eu`. Mainnet routing ships gated behind env config (`VM_BASE_URL_MAINNET` / `VM_API_KEY_MAINNET`) to be provisioned later.
- vm-sdk hardcodes its base URL (`GET_FROM_VM` defaults to `VM_URL`; exported functions never pass one) and holds the API token in module-global state — unusable for per-request network routing with distinct keys. vm-sdk 1.1.0 (#144) is unpublished.
- Functions' KV caches use fixed keys (`__internal:pools_cache` etc.) — not network-aware today.
- `withdrawals` D1 table stores no fee data; fee components are only known at claim time via the VM fees call.
- `recharts` is already a dependency (currently unused).
- Network store, preferences NetworkSelector, NetworkMismatchBanner (mounted in MainLayout), and network-aware explorer links already exist from earlier work.

## PR 1 — `feat/claim-store-lookup` (#177)

`src/store/claim-state.ts` gains:

- `lookupAddress: string | null` + `setLookupAddress(address)`
- `initSelectionFor(address, assetIds)` — initializes `selectedAssetIds` once per address, replacing ClaimPage's `initializedFor` ref (store records which address selections were initialized for)

ClaimPage drops its local `useState(lookupAddress)` / `useRef(initializedFor)` and reads the store. `useRewards(lookupAddress)` stays a pure TanStack Query hook; consumers share results through Query's cache keyed on the same address. Close #177 noting the adjusted approach.

## PR 2 — `feat/network-switching` (#175)

**Frontend**

- `apiClient` appends `network=<selectedNetwork>` (from `useNetworkStore.getState()`) to every GET/POST — single choke point, no per-query edits.
- A store subscription on network change runs `queryClient.clear()` and claim-store `reset()` — no cross-network cache bleed, no half-finished claims surviving a switch.
- NetworkMismatchBanner remains the mismatch surface; ClaimPage explicitly guards claim creation when `networkFromId(wallet.networkId) !== selectedNetwork`.
- NetworkSelector disables networks the backend reports unconfigured ("not yet available"). Store default remains `mainnet`, falling back to the first available network once settings load.

**Backend**

- `functions/services/vmClient.ts`: extend the existing `vmApiGet` shim into the single VM client — `vmFetch(env, network, action, params)` — resolving `VM_BASE_URL_MAINNET`/`VM_BASE_URL_PREVIEW` and `VM_API_KEY_MAINNET`/`VM_API_KEY_PREVIEW`. Preview falls back to existing `VM_BASE_URL`/`VITE_VM_API_KEY`. Per-request key: no module-global token mutation.
- Migrate the ~20 `initVmSdk` call sites to `vmFetch`; keep vm-sdk imports only for response types.
- Requests naming an unconfigured network return 503 with a stable error code (`network_unavailable`).
- KV cache keys gain a `:{network}` suffix; `caches.default` entries split naturally once `?network=` is part of the URL.
- `getSettings` response gains `networks: { mainnet: boolean, preview: boolean }` derived from env configuration.

## PR 3 — `feat/claim-fee-persistence` (#193 backend)

- Migration `migrations/0004_create_claim_requests.sql`:

  ```sql
  CREATE TABLE IF NOT EXISTS claim_requests (
    request_id     TEXT PRIMARY KEY,
    stake_address  TEXT NOT NULL,
    network        TEXT NOT NULL,
    token_count    INTEGER NOT NULL,
    deposit        TEXT NOT NULL,
    withdrawal_fee TEXT,
    tokens_fee     TEXT,
    tx_fee         TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_claim_requests_stake
    ON claim_requests (stake_address, created_at DESC);
  ```

- `getCustomRewards` fetches the fee breakdown server-side (same VM call `estimateFees` uses) and inserts the row after the VM accepts the request. Fees are recorded **as quoted at creation**. A D1 insert failure logs and never fails the claim.
- "Fees paid" = `claim_requests` rows whose `request_id` matches a delivered `withdrawals.withdrawal_request`. **Verify during implementation that these share an ID space** (inspect real rows in dev). Fallback: mark paid via the claim-status endpoint's processed state.
- New `GET /api/claimFees?stake=` returns per-claim fee rows + totals (delivered-only and all-quoted).

## PR 4 — `feat/personal-analytics` (#193 UI, closes #195)

`src/features/profile/components/PersonalAnalytics.tsx`, rendered above RewardBreakdown in Profile → Analytics. Fed by the already-cached history query + `claimFees`. Content:

- Stat tiles: total claims, distinct tokens, total fees paid (ADA), active-since
- Claims-per-month bar/line (claim frequency)
- Cumulative rewards over time for one token at a time (dropdown, defaults to most-claimed) — token amounts are not unit-comparable, so no mixed-unit aggregation
- Token-mix donut by reward count

Recharts, Quiet Dark styling, follow the dataviz skill. Empty state for addresses with no history.

## PR 5 — `feat/analytics-page` (#209, closes #211)

- Public route `/analytics` + nav link; no wallet required; sectioned so #210's platform stats slots in later.
- `src/features/analytics/hooks/usePoolData.ts`: joins pools + whitelist + distributions + statistics queries (reuse the team feature's `useWhitelistedPools` join approach).
- `src/features/analytics/components/PoolComparison.tsx`: sortable table — pool name/ticker/logo, whitelist status, tokens distributed, delegation size, per-token reward rates where distributions expose them.

## Error handling

- Unconfigured network: stable 503 `network_unavailable` → UI banner, selector option disabled.
- Fee insert failures: log, never block claim creation.
- Analytics with no data: explicit empty states, no zero-filled charts.
- Cross-network races: `queryClient.clear()` on switch; in-flight responses for the old network are discarded with the cache.

## Testing

- Vitest per PR: store actions (#177), `vmFetch` routing/fallback/503 (#175), fee-row insertion + join/aggregation (#193 backend), `usePoolData` join (#209), plus the existing suite (125 tests) green throughout.
- Local D1 via `wrangler d1 execute --local` with migrations applied for fee-capture verification.
- Visual verification of charts and the /analytics page via the run skill before each UI PR.
