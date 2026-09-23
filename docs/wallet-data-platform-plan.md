# TosiDrop wallet and data platform plan

## Product direction

TosiDrop remains a wallet, rewards, delegation, and token-distribution product.
DEX data supports those jobs; it does not turn the primary interface into a
trading terminal.

The platform has two consumers:

1. The TosiDrop web application, which presents wallet-first read models.
2. A future authenticated, metered API that sells stable DEX and market-data
   access to external customers.

Both consumers use the same indexed data platform, but they do not share UI
response contracts.

## Information architecture

The disconnected home page keeps its current onboarding and claim-oriented
purpose. The connected application uses one wallet workspace rather than
duplicating wallet destinations in the sidebar and in separate pages:

```text
Home
Your wallet
  Overview
  Holdings
  Activity
  Rewards
  Favorites
  Settings
Discover
  Token programs
  Token details
Network
  Platform analytics
  Pool comparison
Build
  My projects
Resources
  Docs
```

The sidebar exposes the workspace once as `Wallet`; the sections above are
its internal navigation. Existing routes remain compatible, including
`/profile`, `/profile?tab=history`, and `/profile?tab=analytics`, while older
aliases redirect into the corresponding wallet section.

### Home

The connected home page coordinates the existing rewards pulse,
`WalletComposition`, and `DelegationCard`, then adds compact previews of
portfolio change and recent activity. It must remain action-oriented and must
not become a global market dashboard.

### Portfolio

Portfolio is the primary wallet workspace and is initially implemented through
the existing Profile surface:

- Overview: balance, allocation, delegation, and wallet actions.
- Holdings: real quantities, metadata, market values, and freshness states.
- Activity: claims plus indexed on-chain activity.
- Rewards: existing personal claim analytics plus staking rewards.

The wallet composition display is a marked-to-market view only where an
indexed price is available. Unpriced assets remain visible with an explicit
pending state rather than being silently omitted.

### Discover

The existing Tokens page remains a TosiDrop token-program catalog. Token detail
pages may add price, liquidity, volume, holder, pool, and chart context, but the
catalog should not become a ranked trading terminal.

### Network

The existing public Analytics page remains the home for platform statistics and
pool comparison. Public DEX aggregates can be added here without mixing them
into private wallet analytics.

### Projects

The existing project dashboard remains the issuer workspace. Later additions
include distribution reach, claim completion, holder retention, and token
market context.

## Data and API architecture

```text
Configured Koios and independent market sources
        -> scheduled ingestion adapters
        -> canonical, provenance-aware facts
        -> UI read models and API read models
        -> TosiDrop web and external customers
```

The shared server-side Koios client will select:

- `KOIOS_BASE_URL_MAINNET`
- `KOIOS_BASE_URL_PREVIEW`
- optional network-specific credentials

It owns pagination, retries, timeouts, rate limiting, validation, and health
classification. Deployment network and source identity must be included in
cache keys and persisted records.

Cloudflare storage responsibilities:

- D1: normalized facts, snapshots, activity, sync cursors, API customers, and
  usage summaries.
- KV: short-lived hot response caches.
- Queues: ingestion backpressure and retry work.
- R2: raw response archives, replay fixtures, and large exports where useful.

Market prices are source-specific rows, not a single-provider cache. Scheduled
adapters populate current prices and hourly history in D1; Pages Functions
only read those tables on a wallet request. Aggregation can expose source
count, freshness, and provenance without making the browser fan out to DEX
providers or repeatedly querying any one provider.

Wallet value history is explicitly a current-holdings replay against historical
price snapshots. It is useful for showing portfolio sensitivity over time, but
it must not be described as the wallet's actual historical contents until
historical holdings snapshots are available.

The application API remains under `/api/...`. The future commercial API uses a
separate versioned namespace:

```text
/v1/tokens
/v1/tokens/{unit}/ohlcv
/v1/tokens/{unit}/trades
/v1/pools
/v1/dexes
/v1/market/overview
```

The commercial boundary needs API-key hashing, scopes, quotas, rate limits,
request IDs, usage metering, freshness, provenance, and source-redistribution
entitlements from the beginning.

Every indexed value should identify whether it is observed, derived,
estimated, provider-sourced, licensed for redistribution, or internal-only.

## Delivery order

1. Reorganize the web shell and add route-compatible wallet destinations.
2. Extract a configurable Koios client from the hard-coded delegation path.
3. Replace placeholder wallet composition with real metadata and valuation.
4. Add wallet summary, holdings, activity, and rewards read models.
5. Add scheduled market and DEX ingestion into D1.
6. Add contextual token market details and public Network analytics.
7. Expose stable `/v1` DEX-data endpoints.
8. Add API authentication, quotas, metering, documentation, and billing.

The first implementation slice now covers wallet-first navigation, a
configurable shared Koios client, real wallet balance/holdings/rewards/
delegation data, D1 wallet snapshots, and the read side of the indexed market
model. It does not fetch providers from the browser or expose commercial DEX
endpoints yet; scheduled ingestion, licensing decisions, and the authenticated
API boundary remain prerequisites.

Deployment must set `KOIOS_BASE_URL_MAINNET` and/or
`KOIOS_BASE_URL_PREVIEW` when using private or self-hosted Koios instances.
The public Koios URLs remain development-safe defaults. Network-specific API
keys are optional and are sent only from Pages Functions to Koios.
