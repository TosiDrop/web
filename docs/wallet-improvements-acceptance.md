# Wallet improvements: acceptance status

Audited against the original feedback, `wallet-data-platform-plan.md`, and the analytics/network/claim-state design. This is the UI and read-model scope of PR #287; the commercial API roadmap is separate.

## Implemented in the branch

| Request | Implementation |
| --- | --- |
| Wallet metrics at the top | Estimated value, wallet ADA and staking rewards. Price movement/source information lives under About these estimates; average token value is in More detail. |
| Reward notifications | Wallet reward-ready notice, header bell, 60-second eligibility checks, alerts for newly available amounts, optional browser alerts for hidden tabs. First fetch establishes a silent baseline. |
| 25-token claim limit | Selection and claim batches capped at 25 distinct assets, with a path to the next batch. |
| Claim-page redundancy | Clear batch/status copy and grouped claim details. |
| Favorites | Wallet-scoped draft persistence, signed server save, visible saved-token feedback and controls. |
| Chopped strings and alignment | Wrapping token names and IDs, full stake address, container-responsive holdings rows/table, readable metric spacing. |
| Claimed-page polling | Claim status and delivered history refresh while open. |
| Token links | Claim, history, and wallet holdings link to token details using the catalog's policy/name ID; token-page favorites match claim filtering. Cached wallet metadata supplies names when catalog metadata is absent. |
| Analytics UI | Personal claim charts inside the wallet plus a separate public platform view. Missing data gets an unavailable state. |
| Blink Labs logo | Official brand asset on the team page. |
| Markdown | Safe Markdown rendering for token program descriptions. |
| Charts and allocation | One chart at a time: 7/30-day price replay or USD allocation. Staking charts and personal claim analytics expand on demand. |
| Wallet-data accuracy | Source availability, fetched/quote times, partial value coverage, explicit unknown decimals, 24-hour current-quote cutoff. Raw quantities remain visible and exportable. |
| Platform user analytics | Indexed claiming-wallet, returning-wallet and claim counts, monthly trends. These describe claimants in the synced archive. |
| Cost per claim | Mean recorded cost over complete claim-fee records; coverage displayed. |
| Average token value | Mean USD value of priced native-token holdings, excluding ADA. |
| Unique pricing information | Per-asset unit price, 24h change, estimated holding value, allocation share, source names and observation time. |
| Price at receipt | Latest indexed USD quote preceding receipt by at most 24 hours; explicitly an estimate. Missing quotes/decimals remain unknown. |
| CSV extracts | Holdings, staking rewards, claim history, personal trends and public platform trends. Holdings and staking exports include exact raw quantities; reward CSVs identify raw units when metadata is missing. |

## Data and state safeguards

- Use Koios `policy_id` for assets/metadata, policy/name pairs for bulk metadata, and `account_reward_history` with `pool_id_bech32` for earned rewards.
- Preserve token quantities when metadata is incomplete; reject malformed quantities and reward amounts.
- Accept validated registry decimals only; Koios's synthesized zero from account assets leaves precision unknown. Batch bulk metadata below the public payload limit.
- Paginate reward and asset lists with stable ordering; later-page failures or the 10,000-row safety cap make the source unavailable rather than expose incomplete totals.
- Resolve catalog IDs and concatenated wallet units to the same market quotes/history, counting each contributing source once. Retry wallet section navigation when asynchronous chart content mounts.
- Exclude stale/invalid current quotes; report the oldest contributing quote time for an aggregate.
- Read large asset lists through a JSON SQL parameter to stay within D1's 100-bound-parameter limit.
- Historical replay requires known decimals and price coverage for every indexed holding; charts omit incomplete buckets.
- Sum reward types within an earned epoch before computing staking chart values.
- Derive the combined 24h move from prior/current prices for current quantities, with explicit partial coverage.

- Preserve later claim batches when rewards refresh or favorites reorder; hidden tokens remain excluded.
- Keep edits made while a favorites save is pending, and preserve the active wallet's draft after account switches. Wait for saved preferences before accepting edits.
- Keep deposit status checks and cache refreshes tied to the wallet that started the claim.
- Display exact raw quantities when token decimals are unknown, in both archived and fallback history.
- Reject nonpositive and nonfinite receipt quotes; normalize blank request IDs when counting claims.

## Verification

- Rebased onto `main` at `71c736b`, preserving the wallet, claim, and pool fixes from PR #288.
- Node 24: all 400 tests pass, including regression cases reproduced before the fixes. Production build and type-aware lint pass; the build retains existing large-bundle warnings.
- Populated local browser review covers profile, analytics, and claim screens at 1440, 390, and 320 CSS pixels. Spacing follows existing 4px increments, with 16px mobile panel padding and 24px section gaps.

## Integration work and verification boundaries

- Market readers and migrations exist, but this repository has no scheduled market-price ingestion job. Current valuations, allocation, replay and receipt estimates need populated, network-correct market tables. Preview tokens may have no market price.
- Public platform counts require the network-scoped withdrawals schema and a populated archive. Remote schema and data population were not verified in this review.
- Closed-site push notifications require subscriptions and a server delivery flow. Existing browser alerts require the site to remain open.
- Wallet value history is a price replay of current indexed quantities. Actual historical balances, general on-chain transaction history, cost basis and realized returns remain future work in the platform plan.
- Visitor and connected-wallet usage tracking is separate from indexed claimant analytics and is not implemented.
- A real wallet signing, claim delivery, favorites save and browser notification check remains necessary before release. Automated tests exercise these contracts and states; populated layout checks used synthetic wallet data.
- Browser interactions cover holdings search, sort, expanded details, chart selection, staking ranges, token navigation, and a downloaded holdings CSV. Populated screens use the local synthetic-data fixture.
- No shared database migration, production release, wallet signature or claim transaction was performed.

## References

- [Koios asset and account contracts](https://github.com/cardano-community/koios-artifacts/tree/main/files/grest/rpc)
- [Cloudflare D1 limits](https://developers.cloudflare.com/d1/platform/limits/)
