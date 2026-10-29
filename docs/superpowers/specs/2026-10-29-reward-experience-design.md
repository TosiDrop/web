# Reward discovery, calendar, watched wallets, and NFT rewards

## Authorized direction

Brian requested the first four proposed features, prioritized the reward calendar and alerts, and asked for polished, friendly UI/UX. He selected confirmed dates plus clearly labelled epoch estimates. Extend TosiDrop's existing navy surfaces, cream identity, cyan actions, Geist typography, and component vocabulary.

## User experience

- Discovery: search and filters by pool, project, recently added, and rewards currently available to the connected wallet. Preserve URL filters, provide clear/reset controls and a useful zero-results state. Use actual approved/created dates; absent dates remain unknown. Do not invent popularity without a data source.
- Watched wallets: a separate read-only `/watchlist` surface. Save a name and validated network-correct stake address or resolved `$handle`, show current rewards, rename/remove and refresh. Store locally with network isolation and a bounded list. Watching never changes the connected wallet or claim state. Connect the matching wallet to sign claims.
- Calendar: `/calendar` with an upcoming agenda as its default; month view on desktop and an accessible agenda on small screens. Show timezone, today/next-event context, clear date navigation, project filters, and distinct announced/estimated badges. Epoch estimates are planning aids and never promises of eligibility, reward amount, or payout timing. Include one-event and filtered-calendar ICS downloads with proper escaping and UTC timestamps.
- Alerts: event-level reminders with an explicit opt-in. Existing in-app reward alerts remain. Add standards-based Web Push for closed-site reminders, with a service worker, server subscription endpoint, scheduled sender, duplicate prevention, expired-subscription removal and clear permission/unsupported/unconfigured/error states. Never request notification permission on page load. Calendar reminders and wallet reward polling are separately named.
- Announcements: approved project owners can publish dated announcements using a wallet signature bound to network, owner, project, payload and freshness. Dates from storage are authoritative announcements; epoch boundaries use source-provided timings and an estimated badge. Unavailable storage or timing sources produce partial/unavailable states rather than invented events.
- NFT rewards: preserve explicit NFT identity and metadata in the reward API. Show artwork, name, collection, asset identity, selection and fallback states in a gallery integrated into the current claim selection flow. Zero decimals or a wallet balance of one alone never establish NFT identity. Preserve the existing 25-distinct-asset ceiling, hidden-token filtering, favorites and signing behavior.

## Calendar contracts

Shared module `src/shared/calendar/index.ts` exports `CalendarEvent` and `CalendarResponse`:

```ts
interface CalendarEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  certainty: 'confirmed' | 'estimated';
  kind: 'distribution' | 'epoch';
  projectId: string | null;
  projectName: string | null;
  tokenId: string | null;
  description: string;
  url: string; // own-origin relative app route
}
interface CalendarResponse {
  network: 'mainnet' | 'preview';
  events: CalendarEvent[];
  sources: { announcements: 'available' | 'unavailable'; epochs: 'available' | 'unavailable' };
  generatedAt: string;
}
```

`GET /api/rewardCalendar?from=<ISO>&to=<ISO>` returns that contract, limits ranges to 93 days, scopes all storage/cache to deployment network, and provides deterministic epoch-event IDs. Use current Koios epoch timings rather than hardcoding an epoch duration or relying on a browser clock alone.

`GET /api/rewardReminders` returns `{available:boolean,publicKey:string|null}`. `POST` with `{eventId,remindBeforeMinutes,subscription,managementToken}` creates a reminder and returns `{id,managementToken,scheduledAt}`. Supported offsets are 0, 15, 60 and 1440 minutes; the server resolves the event and time. `POST` with `{action:'remove',id,managementToken}` removes one reminder. Capability tokens are 32 random bytes generated and durably persisted by the client before submission, stored hashed server-side, and never logged. Persist a submitted flag before POST; unsent drafts remain editable, while uncertain submitted requests recover with the same capability. Admission uses the effective event-end/24-hour delivery window and the same configured sender limit as the Worker. Reject arbitrary notification text/URLs and non-approved push destinations.

The backend implementer owns the exact signed announcement create/update contract and must document it before frontend integration.

## Implementation boundaries

- Base: updated wallet PR #287 at `ad1d7aa`; preserve existing PR #301 separately.
- Worktree: `/tmp/tosidrop-pr287-ready.da3phH`, branch `feat/reward-discovery-calendar`. Keep the user's dirty main checkout untouched.
- No production deployment, remote database migration, personal push subscription, paid service, merge or notification to other people.
- Remote push activation requires a VAPID key pair, a configured Pages binding and a separately deployed cron Worker. Prepare and document those requirements; the UI reports availability truthfully.
- No new market-price provider, trading UI, performance claims, made-up schedules, or auto-claim signing.
- Local demo/QA data must be explicit and stay outside shipped runtime behavior.

## Acceptance

Run meaningful regression tests, the whole suite, production build, type-aware lint and whitespace checks. Browser-check discovery, watchlist, calendar and NFT selection on desktop and at 390/320px, including loading, empty, unavailable, denied-permission and recovery states; verify keyboard focus, labels, touch targets and no horizontal overflow. Capture one batched desktop/mobile review, fix findings together, confirm once, then obtain an independent UI and whole-branch code review.
