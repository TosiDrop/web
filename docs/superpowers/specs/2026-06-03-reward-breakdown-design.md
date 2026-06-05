# Reward Breakdown — Design Spec

**Date:** 2026-06-03
**Branch:** `feat/reward-breakdown` (stacked after withdrawal-history)
**Status:** Approved
**Completes:** issues #191 (component), #192 (endpoint); first real content for the
Profile Analytics tab (advances #195)

## Goal

Show users where their rewards came from — which distribution rule, pool, and epoch —
per token, backed by vm-sdk's already-exported `getRewardBreakdown()` behind a cached
Pages Function, rendered in the Profile page's Analytics tab (replacing the
"ships with M7" placeholder).

## Decisions (locked)

- **Placement:** Profile → Analytics tab (its milestone, M7). The placeholder
  `AnalyticsTab` body in `ProfilePage.tsx` is replaced by `<RewardBreakdown />`.
- **No SDK upgrade:** vm-sdk `1.0.5` already exports `getRewardBreakdown(staking_address:
  string)` returning `{ rewards: any[], promises: any[], vending_address,
  withdrawal_fee }` — #144 (v1.1.0 bump) stays untouched.
- **Defensive normalization:** the SDK types the payload as `any[]`; the client
  normalizes tolerantly and skips rows it cannot interpret rather than crashing.

## `/api/getRewardBreakdown` endpoint (#192 — new `functions/api/getRewardBreakdown.ts`)

Clones the `getDeliveredRewards.ts` pattern exactly:

- `GET /api/getRewardBreakdown?staking_address=...`
- `staking_address` required (400), `requireApiKey`, `initVmSdk`,
  `withCache(request, 300, ...)` (5-min TTL per issue #192), standard CORS/OPTIONS,
  errors logged and mapped to 500.
- Body passthrough of the SDK response — normalization happens client-side where the
  token-metadata join already lives.

## Frontend (#191)

Ticket paths used as specified (the profile feature directory exists):

- `src/features/profile/hooks/useRewardBreakdown.ts`
  - react-query keyed `['reward-breakdown', stakeAddress]`, `enabled: !!stakeAddress`,
    `staleTime: 60_000`.
  - Fetches `/api/getRewardBreakdown` and `/api/getTokens` in parallel (same join pattern
    as `history.queries.ts`), normalizes rows into:

    ```ts
    interface BreakdownEntry {
      token: string;        // raw id
      ticker: string;       // via token map / hex fallback (reuses exported helpers)
      logo?: string;
      amount: number;       // scaled by decimals
      epoch: number | null;
      pool: string | null;  // pool id/ticker when present
      rule: string | null;  // distribution rule/source when present
      kind: 'reward' | 'promise';
    }
    ```

  - Normalizer (`normalizeBreakdown(raw, tokenMap)`) is a pure exported function: accepts
    both `rewards` and `promises` arrays, tolerates unknown field names by probing common
    keys (`token`/`token_id`/`asset`, `amount`/`quantity`, `pool`/`pool_id`/`ticker`,
    `epoch`, `rule`/`source`/`distribution`), and drops rows lacking a token or amount.
- `src/features/profile/components/RewardBreakdown.tsx`
  - States mirror `HistoryList`: not-connected message, skeleton, error card, empty state
    ("No breakdown data yet").
  - Rows grouped by token: header row (avatar, ticker, total amount) expanding to detail
    rows (epoch · pool · rule · amount), `card-premium` styling, promises badged
    distinctly from delivered rewards.
- `ProfilePage.tsx`: `AnalyticsTab` renders heading + `<RewardBreakdown />`; the
  `EmptyTab` placeholder usage goes away.

## Error handling

- Endpoint: same contract as sibling VM proxies (400 missing param, 500 logged).
- Client: query error → error card; rows that fail normalization are skipped silently
  (logged via `console.warn` in dev) so one malformed entry never blanks the tab.

## Testing

- `functions/api/__tests__/getRewardBreakdown.test.ts` (makeContext harness, mocked
  `initVmSdk`): param validation, API-key gate, cache wrapper call, SDK passthrough,
  error mapping.
- `normalizeBreakdown` unit tests: canonical shape, alternate key names, promise rows,
  garbage rows dropped, decimals scaling, lovelace/ADA special case.
- `useRewardBreakdown` hook test: join + grouping output.
- `RewardBreakdown` component test: state rendering (loading/empty/error/data).

## Out of scope

- Charts/visualizations and the charting library (#194) — this is the tabular foundation.
- Personal analytics dashboard (#193) and full Analytics-tab wiring ticket (#195).
- Pool comparison (#209) or platform statistics (#210).
