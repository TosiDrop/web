# Reward Experience Implementation Plan

**Goal:** Deliver smarter discovery, read-only watched wallets, a reward calendar with opt-in reminders, and NFT reward galleries inside the existing TosiDrop UI.

**Spec:** `docs/superpowers/specs/2026-10-29-reward-experience-design.md`

**Architecture:** Extend the existing React/Vite app and Pages Functions. Network-scoped D1 stores announcements and push reminders; a standalone Worker sends due reminders. The connected signing wallet remains separate from local watched wallets. Existing claim selection handles explicitly identified NFTs.

**Execution:** Brian authorized the first four features and selected confirmed dates plus labelled epoch estimates. Implement the approved scope now; use independent module ownership for parallel work and root integration. Record routine implementation rulings here without requesting repeated approval.

## Global constraints

Preserve brand/components, the 25-asset limit and all existing wallet/claim behavior. Use Node 24. Keep remote systems unchanged. Never imply a reminder was saved or delivered when configuration/permission/API/storage fails. All cross-network state is isolated. Tests exercise boundary behavior, not source text.

## Review focus

- A watched wallet must never become the signing wallet or alter a pending claim.
- Stale/network-invalid addresses and storage changes must recover clearly.
- Calendar dates use local display and explicit UTC transport/export; estimates remain visible as estimates.
- Push enrollment and removal cannot forge an event, trigger SSRF or expose endpoint/key/token values in logs.
- NFT identity requires evidence; image/metadata failure must not remove a claimable asset or alter quantities/fees.

## Tasks and ownership

### 1. Calendar and reminder backend (independent implementer)

Own `src/shared/calendar/`, `functions/api/rewardCalendar.ts`, `functions/api/rewardReminders.ts`, new calendar/reminder services and tests, `migrations/0011_reward_calendar.sql`, `workers/reward-reminders/`, and setup documentation. Coordinate additions to Env/package dependencies with root; do not change shared files without sending the exact requested edit.

- [x] Write and run failing tests for network/range/event validation, source-unavailable behavior and announced/estimated separation.
- [x] Implement the frozen calendar types and read endpoint, signed owner announcements and scoped D1 migrations.
- [x] Write failing tests for reminder ownership, safe push destination validation, authoritative event scheduling, duplicate suppression, transient retry and stale subscription removal.
- [x] Implement configuration, enrollment/removal, scheduled delivery and setup instructions. Use a maintained Web Push library; do not invent encryption.
- [x] Run targeted tests/typecheck; report contracts, files, evidence and setup boundaries. No commits or external mutations.

### 2. Discovery and watched wallets (independent implementer)

Own discovery components/utilities/tests under `src/features/tokens/`, watched-wallet files under `src/features/watchlist/`, and `src/pages/WatchlistPage.tsx` with tests. Do not change App/navigation/common styles/claim state.

- [x] Write failing behavior tests for combined filters, URL restoration, missing dates, eligibility-fetch errors and resetting filters.
- [x] Implement search/pool/project/newest/currently-claimable filters with incumbent accessible controls.
- [x] Write failing tests for validated handle/stake input, network-scoped persisted wallets, duplicate/max-count handling, rename/remove and untouched signing state.
- [x] Implement the read-only watchlist with clear empty/error/refresh/connected-wallet states.
- [x] Run targeted tests and report route contract, integration edits and evidence. No commits or external mutations.

### 3. NFT identity and gallery (independent implementer)

Own `src/shared/rewards/`, `functions/api/getRewards.ts` and its new tests, new NFT utilities/components/tests, and NFT integration into `AvailableDistributions.tsx`. Do not change claim store, App/navigation, calendar/watchlist files, dependency manifests or common styles.

- [x] Write failing tests for explicit NFT identity, false-positive fungible assets, metadata/image validation and API preservation.
- [x] Extend optional reward metadata without changing existing fungible/native reward behavior.
- [x] Write failing gallery/selection tests, including mixed rewards, hidden tokens, missing art and cap enforcement.
- [x] Implement the image-focused gallery in the existing selection path; preserve favorites, token details and exact amounts.
- [x] Run focused tests; report evidence, current provider limitations and files. No commits or external mutations.

### 4. Calendar UI, integration and validation (root)

Own `src/pages/CalendarPage.tsx`, frontend calendar features, App/navigation/TopBar integration, Env/package edits requested by backend, service worker coordination, QA fixtures and design documentation.

- [x] Write failing calendar utility tests for local-day grouping, month boundaries, invalid dates, ICS escaping and timezone-independent event instants.
- [x] Build calendar query/hooks, agenda/month/event detail, filters, reminder controls and owner announcement form against frozen shared contracts.
- [x] Add routes/navigation, watchlist links, calendar links from token details and existing alerts; avoid duplicated information and accidental permission requests.
- [x] Run the full suite/build/lint, inspect merged diff and verify all error/edge states.
- [ ] Start a persistent local QA preview with explicitly synthetic fixtures; perform a bounded desktop/mobile interaction and screenshot review.
- [ ] Obtain independent code/UI reviews, fix material findings, rerun affected/full checks as justified, and leave a reviewable feature branch with accurate setup/verification notes.

## Progress and rulings

- Baseline: `ad1d7aa`; existing clean dependency install, 414 tests/build/lint passed in the preceding PR-maintenance task. Rerun the baseline before accepting a feature completion claim.
- Ruling: keep all four features in an isolated feature branch based on #287; no existing PR head is updated by this work.
- Ruling: preserve the incumbent visual system; Impeccable launcher returned permission denied, so read existing tokens/components directly. New UI is code-led and judged against real browser captures.
- Ruling: confirmed announcements plus explicitly labelled epoch estimates were selected by Brian through the structured question.

- Integration progress: discovery/watchlist/NFT/publisher/calendar UI/backend/SW implemented; initial build and full type-aware lint pass. Calendar utility tests8 and page/navigation tests6 passed; SW8combinedpassed. Independent security reviewer identified3 reminderrecovery/fanout defects, assigned to calendar_backend and discovery_watchlist for regression fixes.
- UI QA: actual Vite server at http://127.0.0.1:5186, exec session29333; .preview/reward-experience-vite.config.ts provides explicit synthetic API responses and local wallet state. No remote traffic/signatures/notification sends. QA fixtures stay uncommitted.
- Provider boundary: SDK nfts[] is any[]; publicSDK/legacyfrontend offer no verified recordcontract. Gallery covers consolidated reward assets with explicitproviderNFTidentity/CIP68 NFTlabel. Do not inventarray normalization; report this liveprovider limitation.

- Source code review: all reported reminder response-loss, expired-record removal, fan-out/short-window capacity, pre-POST draft recovery, and shared error-contract issues resolved with regressions; final scoped independent verdict ready.
- Browser evidence: desktop discovery project-filter/no-results/reset, handle watch add/remove, NFT selection count, calendar month/agenda/detail and actual ICS download verified. Download file had17 CRLF lines and1event with UTCstart/end.
- Browser blocker: Chrome CDP timedout/kernelreset during viewportcalibration; subsequent nativeapp access returned cgWindowNotFound. Userasked through asyncquestion toopen/unlockChrome. Mobile320/390captures and final independentUIreview remain open; do not claim perfect/mobile-verified. Desktopwatchlistfullpagecapture hasstickyheaderartifact and needsrecapture.

- Final automated verification: Node24.22.1, 103 testfiles /546 tests pass; productionbuild/type-awarelint/whitespace pass. LivepublicKoios tip+epoch_info contracts verified on Preview(epoch1465) andMainnet(epoch664) at reviewtime. FullUIapproval remains pending actualmobilecaptures; do not treat source-readiness as operationalactivation.
