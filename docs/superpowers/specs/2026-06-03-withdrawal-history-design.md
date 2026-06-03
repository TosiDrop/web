# Withdrawal History — Design Spec

**Date:** 2026-06-03
**Branch:** `feat/withdrawal-history` (stacked on `feat/favorite-tokens`)
**Status:** Approved
**Completes:** issues #179 (component), #180 (`/api/history`), #181 (sync mechanism)

## Goal

Let withdrawal history accumulate beyond the VM API's 100-token window by syncing
delivered rewards into D1, expose it through a paginated `/api/history` endpoint, and
upgrade the existing `HistoryList` to server-driven pagination and date sorting — with
full graceful degradation when the D1 binding is absent.

## Decisions (locked)

- **Upgrade `HistoryList` in place** (`src/features/history/`), not a new
  `WithdrawalHistory.tsx` — the ticket's file names predate this component existing.
- **Sync on read:** `/api/getDeliveredRewards` upserts fetched rows into D1 as a side
  effect (issue #181's design). No scheduled worker in this scope.
- **Append-only:** withdrawals are immutable; upserts use `ON CONFLICT DO NOTHING`.
- **No signature for reads:** `/api/history` is unauthenticated like
  `/api/getDeliveredRewards` (same data, same keying by stake address).

## Data model

New `migrations/0003_create_withdrawals.sql`:

```sql
CREATE TABLE IF NOT EXISTS withdrawals (
  stake_address      TEXT NOT NULL,
  reward_id          TEXT NOT NULL,            -- VM row `id`
  token              TEXT NOT NULL,            -- e.g. 'lovelace' or policy.assetHex
  amount             TEXT NOT NULL,            -- raw integer string from VM
  epoch              INTEGER,
  delivered_on       TEXT NOT NULL,            -- raw VM value (unix secs or ISO)
  delivered_at       INTEGER,                  -- parsed unix seconds (nullable; sort key)
  withdrawal_request TEXT,
  synced_at          TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (stake_address, reward_id)
);
CREATE INDEX IF NOT EXISTS idx_withdrawals_stake_time
  ON withdrawals (stake_address, delivered_at DESC);
```

`delivered_at` is parsed server-side at sync time with the same heuristic the client uses
today (`history.queries.ts` `parseDeliveredOn`: numeric 10-digit → unix seconds, else
`Date.parse`); unparsable values store `NULL` and sort last.

## Sync mechanism (#181 — `functions/api/getDeliveredRewards.ts`)

Inside the existing `withCache` fetch callback, after the SDK call succeeds:

- If the `DB` binding is present (`hasDb`, shared helper moved to
  `functions/services/d1.ts`), build `INSERT ... ON CONFLICT(stake_address, reward_id)
  DO NOTHING` statements from the response rows and run one `env.DB.batch`, scheduled via
  `context.waitUntil` so the response is not delayed.
- Sync failures are logged and swallowed — a D1 hiccup must never break the read path.
- Upserts only fire on cache misses (TTL 300 s). Accumulation is incremental by design;
  each fresh fetch persists whatever window the VM returns.

## `/api/history` endpoint (#180 — new `functions/api/history.ts`)

`GET /api/history?staking_address=...&page=1&limit=50&token=...&from=...&to=...&order=desc`

- Validates: `staking_address` required; `page ≥ 1` (default 1); `1 ≤ limit ≤ 100`
  (default 50); `order` `asc|desc` (default `desc`); `token` optional exact match;
  `from`/`to` optional (unix seconds or ISO date, converted to unix seconds, compared
  against `delivered_at`).
- Reads D1 with `WHERE` filters, `ORDER BY delivered_at {order} NULLS LAST`, fetches
  `limit + 1` rows to derive `hasMore` without a COUNT scan, plus one
  `SELECT COUNT(*)` with the same filters for `total`.
- Response: `{ items, page, limit, total, hasMore }` where each item is
  `{ rewardId, token, amount, epoch, deliveredOn, deliveredAt, withdrawalRequest }`.
- No `DB` binding → `{ items: [], page, limit, total: 0, hasMore: false, degraded: true }`.
- Standard CORS/OPTIONS handlers via `vmClient` helpers; no API key needed (D1-only read).

## Frontend (#179 — `src/features/history/`)

- New `hooks/useWithdrawalHistory.ts`: react-query over `/api/history` keyed
  `['history', stakeAddress, page, order]`, joined with `/api/getTokens` for
  ticker/logo/decimals (reusing the existing mapping helpers, which are exported from
  `history.queries.ts` rather than duplicated).
- `HistoryList` keeps `useDeliveredRewards` as the *primary* data source (it also triggers
  the server-side sync) and adds `useWithdrawalHistory`:
  - **Server mode** when `/api/history` succeeds, is not `degraded`, and has
    `total > 0`: server pagination (Prev/Next + page indicator) replaces the client-side
    "Show more", plus a date-sort toggle (asc/desc).
  - **Fallback mode** (request failed, `degraded`, or `total === 0`): current behavior
    unchanged.
  - After the delivered-rewards query settles, the history query is invalidated once so
    the first visit picks up freshly synced rows.
- Visual language unchanged: same rows, skeleton, empty/error states.

## Error handling

- Endpoint: 400 for invalid params, 500 with logged cause for D1 errors, `degraded` for
  missing binding.
- Client: server-mode fetch errors fall back to the existing VM-API rendering path before
  surfacing an error card (only if both sources fail).

## Testing

- `functions/api/__tests__/history.test.ts` (makeContext harness, mock D1): param
  validation, pagination math (`hasMore`, `total`), token/date filters, order, degraded.
- `getDeliveredRewards` sync tests: upsert batch issued on fetch, conflict rows ignored,
  no DB → no batch, D1 failure swallowed, `waitUntil` used.
- `useWithdrawalHistory` hook test: query keys, token join, page changes.
- `HistoryList` mode-selection test: server mode vs fallback.

## Out of scope

- CSV export (button stays disabled — separate ticket).
- Scheduled/cron backfill worker.
- Cross-stake aggregation or admin views.
