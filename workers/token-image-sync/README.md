# tosidrop-token-image-sync

Nightly cron Worker (02:00 UTC) that warms the `tosidrop-token-images` R2 cache
used by the Pages `/api/tokenImage` proxy. Standalone Worker because Cloudflare
Pages cannot run cron triggers (see issue #189).

Each run fetches at most 40 new images, resuming alphabetically from a KV
cursor (`__internal:image_sync_cursor`), so the cache converges over a few
nights; the proxy lazy-fills any gaps in the meantime.

## Deploy

    cd workers/token-image-sync
    npx wrangler secret put VITE_VM_API_KEY   # once
    npx wrangler deploy

## Test locally

    npx vitest run workers
