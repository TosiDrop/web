# Token Image Cache — Design Spec

**Date:** 2026-06-05
**Branch:** `feat/team-image-cache` (off `feat/favorite-tokens`)
**Status:** Approved
**Completes:** issues #187 (R2 binding), #188 (image proxy), #190 (cached images in
reward display), #189 (daily sync — as a separate cron Worker, see below)

## Goal

Serve token logos from an R2-backed proxy so third-party image hosts stop being a
per-pageview dependency: lazy-fill on first request, a nightly cron Worker that warms
the cache, and client components that prefer the proxy with graceful fallback.

## Decisions (locked)

- **#189 architecture:** Cloudflare **Pages cannot run cron triggers**, so the ticket's
  `functions/scheduled/` + `triggers.crons` design is impossible in this repo. Per user
  decision, the daily sync ships as a **separate Worker project** at
  `workers/token-image-sync/` with its own `wrangler.jsonc`, deployed independently.
- **Bucket:** `tosidrop-token-images` already exists on the tosidrop.me account
  (infrastructure#84 done) — #187 is config only.
- **SSRF guard:** the proxy never fetches caller-supplied URLs. The `id` parameter is
  looked up in token metadata (KV `__internal:tokens_cache`, fallback `sdk.getTokens()`),
  and only that registered `logo` URL is fetched.
- **`RewardCard` does not exist** (stale ticket file name). The real token-logo render
  sites are `DistributionCard`, `HistoryList`'s `TokenAvatar`, and `FavoritesTab`.
  `PoolInfo` (and the Team page) render **pool** logos, which are not in the tokens
  metadata map — they stay direct and are out of scope for the proxy.
- **Data-URI logos bypass the proxy** — many registry logos are inline base64; the
  client uses them directly and the proxy only handles http(s) sources.

## #187 — Binding

`wrangler.jsonc` gains:

```jsonc
"r2_buckets": [
  { "binding": "TOKEN_IMAGES", "bucket_name": "tosidrop-token-images" }
]
```

`functions/types/env.ts` gains `TOKEN_IMAGES?: R2Bucket` (optional — feature-detected
like `DB`, so local dev and previews without R2 still boot).

## #188 — Proxy: `GET /api/tokenImage?id={assetId}`

New `functions/api/tokenImage.ts`:

1. Validate `id` (required, ≤ 120 chars — matches the preferences assetId cap).
2. Resolve the token's `logo` from KV tokens cache (fallback: `initVmSdk` →
   `sdk.getTokens()`, also re-priming KV is NOT this endpoint's job — read only).
   Unknown id or no http(s) logo → 404.
3. No `TOKEN_IMAGES` binding → `302` redirect to the source URL (degraded mode).
4. R2 `get(assetId)` hit → serve body with stored `httpMetadata.contentType` and
   `Cache-Control: public, max-age=31536000, immutable`.
5. Miss → `fetch(logo)` with a 10 s timeout; require `Content-Type: image/*` and
   `Content-Length ≤ 2 MB` (or measured body ≤ 2 MB when length is absent); store in R2
   keyed by the raw assetId with the content type; serve. Upstream failure → `302` to
   the source URL (client still gets its image; no negative-caching).

## #190 — Client integration

- New `src/shared/tokenImage.ts`:

  ```ts
  export function tokenImageSrc(assetId: string, logo?: string): string | undefined {
    if (!logo) return undefined;
    if (!/^https?:\/\//i.test(logo)) return logo;       // data: URIs etc. pass through
    return `/api/tokenImage?id=${encodeURIComponent(assetId)}`;
  }
  ```

- `DistributionCard`, `HistoryList`'s `TokenAvatar`, and `FavoritesTab`'s row avatar
  switch their `<img src>` to `tokenImageSrc(...)`. Their existing
  `imgFailed` state machines become a two-step fallback: proxy failed → try the original
  `logo` URL → initials placeholder. (`TokenAvatar` and the favorites row need the
  assetId passed down where it isn't already.)

## #189 — Cron Worker: `workers/token-image-sync/`

- `wrangler.jsonc`: `name: "tosidrop-token-image-sync"`, `main: "src/index.ts"`,
  `triggers: { crons: ["0 2 * * *"] }`, bindings for the same R2 bucket
  (`TOKEN_IMAGES`) and KV namespace (`VM_WEB_PROFILES`, id
  `7a6e9597aa6d4e708c3e100c63ab2881`), plus a `VITE_VM_API_KEY` secret.
- `src/index.ts` `scheduled` handler delegates to a pure, testable
  `syncTokenImages({ kv, bucket, fetchTokens, fetchImage, limit })`:
  1. Token map from KV `__internal:tokens_cache`; on miss, fetch from the VM API
     (`get_tokens` action with `X-API-Token`) without writing KV (the Pages function
     owns that cache).
  2. Iterate tokens with http(s) logos in stable (sorted-key) order starting after the
     KV cursor `__internal:image_sync_cursor`; skip keys already in R2 (`head`).
  3. Fetch + validate (image/*, ≤ 2 MB) + `put` up to **40 new images per run** (stays
     under Workers subrequest limits), then store the cursor; wrap to the start when the
     end is reached. The cache converges over a few nights; lazy-fill covers gaps.
  4. Per-image failures are logged and skipped — never abort the run.
- Deploy: `cd workers/token-image-sync && npx wrangler deploy` (+
  `wrangler secret put VITE_VM_API_KEY`). Documented in the worker's README.
- The root `tsconfig`/`eslint`/`vitest` configs cover the new directory; the worker has
  no UI dependencies.

## Error handling

Proxy: 400 missing/oversized id, 404 unknown token, 302 degraded/upstream-failure, 500
only for unexpected R2 errors (logged). Worker: skip-and-log per image; cursor still
advances past failures so one bad image can't wedge the rotation.

## Testing

- `functions/api/__tests__/tokenImage.test.ts` (makeContext, fake KV/R2/fetch): id
  validation, 404 unknown, R2 hit serves cached, miss fetches/validates/stores/serves,
  non-image and oversized rejected (302), no-binding 302, immutable cache headers.
- `tokenImageSrc` unit tests (http, data URI, empty).
- `workers/token-image-sync` unit tests for `syncTokenImages` (pure function over fake
  KV/R2): skips existing, honors limit + cursor wrap, survives fetch failures.
- Component fallback covered by existing tests still passing (proxy → original → initials
  exercised via `onError` in one DistributionCard test).

## Out of scope

- Image resizing/optimization (serve bytes as fetched).
- Negative caching of dead logo URLs.
- Cache invalidation when a token changes its logo (immutable per assetId; a manual R2
  delete refreshes).
