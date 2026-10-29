# Calendar announcements and browser reminders

The calendar read endpoint works with independently available sources. D1 supplies announcements from approved projects; Koios `tip` and `epoch_info` supply current epoch timing. Future epoch boundaries extrapolate that source duration and always carry `certainty: "estimated"`. No epoch duration is hardcoded. Missing/stale timing and missing/unmigrated D1 report explicit source unavailability. All reads/writes and event IDs are network scoped.

This feature remains **unconfigured by default**. This branch does not deploy a Worker, apply remote migrations, generate operational credentials, enroll real subscriptions or send external notifications.

## Operational activation

1. Review/apply `migrations/0011_reward_calendar.sql` to the intended deployment D1 database through the existing infrastructure workflow. The existing `projects` table must also exist. Keep preview and mainnet deployment bindings correctly scoped.
2. Replace the placeholder D1 database binding in this Worker's `wrangler.jsonc` with the **same deployment database** used by Pages. Set `VITE_NETWORK` consistently in Pages and Worker. Deploy a separate Worker per network. The committed all-zero database ID cannot connect to an operational database.
3. Generate an operational VAPID keypair with the maintained library (`web-push generate-vapid-keys`) in an appropriate secret-management workflow. Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` (a support `mailto:` address or HTTPS URL) in both Pages and this Worker. Store the private key as a secret. Never commit it or paste it into logs. Public/private keys must belong to the same pair.
4. Deploy the Worker with `nodejs_compat`, a current supported compatibility date and its once-per-minute cron. Verify the D1 binding and a controlled test browser's service worker, push receipt and notification click while the site is closed. Sender encryption uses `web-push.generateRequestDetails` and Workers `fetch`; no Node HTTP transport is used.
5. After the configured sender is deployed and verified, set `REWARD_REMINDERS_ENABLED=true` on both services. This explicit operator switch asserts the cron is ready; Pages cannot independently prove another Worker is deployed. `GET /api/rewardReminders` stays unavailable when binding, migration, switch or VAPID configuration is absent. Removing a saved reminder remains available while sending is disabled.

Activation and a real browser delivery test require separate authorization. A successful local suite, dry-run bundle or encryption test proves neither deployed configuration nor external delivery.

## API contracts

`GET /api/rewardCalendar?from=<ISO instant>&to=<ISO instant>` uses a half-open `[from,to)` range of at most 93 days. Both instants require an explicit timezone. It returns the shared `CalendarResponse` contract. Responses use `Cache-Control: no-store`. Sources fail independently. A response with an unavailable source is partial, and must never be described as an empty confirmed calendar.

`POST /api/rewardCalendar` creates/updates a project-owner announcement:

```ts
{
  ownerAddress: string;
  projectId: string;
  eventId: string | null; // null creates; announcement:<deterministic digest> updates
  announcement: {
    title: string;       // 1–120 characters, single line
    startsAt: string;    // explicit ISO instant
    endsAt: string|null; // follows start when set
    description: string; // at most 2,000 characters, plain text
  };
  signature: string;
  key: string;
  message: string;
}
```

Returns `{id}` with 201 for create or 200 for update/idempotent retry. Dates are normalized to UTC for storage. Only the approved project's actual signing owner may publish. Project name, token identity, certainty, kind and app URL come from authoritative server data. The maximum is 100 announcements per project. Create IDs derive deterministically from the verified signature digest and deployment network. Retrying the original create after a later update returns that original ID instead of inserting a second announcement. Updates require a newer signed timestamp; replaying an older update cannot roll back newer content. Updates atomically reschedule pending reminders for all four offsets. The sender also resolves event times again before delivery and cancels unavailable/unapproved/deleted events.

Build the wallet signing message with the shared helper:

```ts
const message = await buildCalendarAnnouncementMessage({
  network, origin: window.location.origin, ownerAddress, projectId, eventId,
  announcement, signedAt: new Date().toISOString(),
});
// Pass exact UTF-8 bytes as hexadecimal to CIP-30 signData using the owner's
// reward address. Submit returned signature/key plus this exact message.
```

The message is prefixed `TosiDrop calendar announcement v1\n` followed by canonical JSON containing origin, network, owner, project, nullable event ID, SHA-256 of the canonical four announcement fields and signedAt. Server validation requires the same request origin, deployment network, owner, project, event and payload, plus a timestamp within five minutes. CIP-30 verification uses the existing maintained Cardano signature library. Fields must remain byte-for-byte identical between signing and submission.

`GET /api/rewardReminders` returns `{available:boolean,publicKey:string|null}`. It exposes no subscriptions, private keys or management tokens.

`POST /api/rewardReminders` enrollment accepts exactly:

```ts
{ eventId: string, remindBeforeMinutes: 0|15|60|1440, subscription: PushSubscriptionJSON, managementToken: string }
```

Returns `{id,managementToken,scheduledAt}` with 201. The server resolves the event and time; caller-supplied notification content, URLs or schedules are rejected. The reminder must be in the future and within 93 days. Before permission or enrollment, the browser generates a 32-byte random management token, encodes it as 64 hexadecimal characters and persists it by deployment network/event/offset. It submits and reuses that same token across transport failures and remounts. A repeated event/offset/endpoint enrollment with the matching capability returns the existing `{id,managementToken,scheduledAt}` without another record or notification. A different capability returns 409. The existing capability is checked in constant time before event availability, elapsed scheduling or quota checks, so an accepted request can be recovered after its original response is lost. Concurrent matching requests recover through the same unique tuple. Tokens are stored only as SHA-256 hashes server-side; response tokens come from the matching request, never stored plaintext. Each endpoint allows at most 100 retained reminders, and each network at most 100,000 retained records. Enrollment atomically limits pending/sending reminders in a ±24-hour neighborhood of the requested schedule to 10,000. This reserves headroom beneath the default sender capacity of 14,400 records/day and rejects excess fanout with a clear capacity error plus calendar-export fallback. Higher throughput does not increase this safety cap. A second atomic admission bound uses the effective delivery window from the requested reminder time to the earlier of the explicit event end or 24 hours later. Its capacity is `floor((floor(windowMinutes) - 1) × configuredDeliveriesPerMinute / 2)`: one cron-minute latency margin plus 50% retry headroom. It counts queued network work within that window and the preceding 24 hours conservatively. A one-hour at-time reminder window therefore allows 295 queued records at the default rate; a 15-minute-earlier reminder gains a 75-minute window with capacity 370. A full/too-short window returns a friendly 409 asking for an earlier reminder time or calendar export. Pages and Worker share the same delivery-limit helper and must use the same optional throughput configuration.

Removal accepts exactly `{action:"remove",id,managementToken}` and returns `{removed:true}`; an already absent row in the requested network also returns `{removed:true}`, including after cleanup or provider expiration. An existing row with the wrong capability returns 404. A different-network row stays untouched. Lost local capabilities cannot be recovered through a public listing. Subscription endpoints/keys remain in D1 only to perform delivery and must be treated as sensitive capability data.

Both POST endpoints require JSON, bound the streamed request to 24 KiB, reject unexpected fields, and reject a supplied cross-origin Origin header. Same-origin browser JSON requests are supported; cross-origin CORS is intentionally absent.

## Delivery and limits

- Approved destinations are exact HTTPS hosts: `fcm.googleapis.com` under `/fcm/send/` or `/wp/`, `updates.push.services.mozilla.com` under `/wpush/v2/`, and `web.push.apple.com`. Userinfo, nonstandard ports, queries, fragments and redirects are rejected. Other providers produce a clear unsupported-subscription response. New provider support requires a reviewed allowlist change.
- Each cron defaults to at most 10 due rows, with concurrency 5 and a 30-second monotonic budget for starting additional work. Unclaimed rows stay pending for future cron runs. One source snapshot is reused for the batch. Overlapping cron executions skip leased rows; sent rows stay sent. Leases expire after five minutes so interrupted work can recover.
- Each delivery derives title/body/relative `/calendar?event=<id>&date=<UTC instant>` link from the authoritative event. The date selects the correct local calendar month when a reminder precedes a month boundary. Estimated events are explicitly labelled. Topic and notification tag are stable per reminder to replace duplicate queued/displayed notifications.
- Transient errors (network, 429 and 5xx) retry with exponential backoff, up to five attempts. Provider 404/410 removes every reminder for that network/endpoint. Other provider errors fail that reminder. No provider error body, endpoint, subscription key or management token is logged.
- Reminders expire at an explicit event end or 24 hours after the authoritative reminder time, whichever is earlier. Queue position alone does not impose a one-hour cutoff. Sent/failed records are retained for at most 30 days; records with schedules older than two days are removed. A failed/removal record can disappear through that cleanup. Delivery payload TTL is one hour; fetch timeout is ten seconds.
- The transport is **at least once**: a provider acceptance followed by a lost acknowledgment/process termination can cause a retry. Leases, stable topic/tag and recorded delivery suppress normal duplicates; they cannot make an external push provider transactional with D1. Browser/OS permission and push-provider delivery remain external boundaries.
- Pages returns the enrollment-time `scheduledAt`; an owner can later change the authoritative date. Display the current event date alongside saved reminders and explain that project updates can move reminders.

## Invocation budget and optional higher throughput

The default bounds D1 queries and subrequests within the documented Workers Free limits. CPU usage must also be verified on the intended deployment before enabling reminders; local wall time does not establish deployed CPU usage. A full ordinary run uses three D1 queries (cleanup, selection, shared announcement snapshot), two Koios HTTP requests, and at most ten times two D1 queries plus one push HTTP request: **23 D1 queries and 35 total subrequests**. Invalid/deferred/permanently failed rows use fewer HTTP requests. A failed final D1 update can add one retry query per row, leaving default headroom under 50. The shared snapshot avoids multiplying Koios reads. Five concurrent deliveries stay below the platform's six simultaneous outbound connections; each response body is cancelled before finishing.

`REWARD_REMINDERS_MAX_PER_RUN` is an optional **operator throughput setting**, absent from the committed default configuration. Valid positive integers are clamped between the baseline 10 and 200; absent/invalid values use 10. Raising it requires matching configuration in Pages and Worker, separately verified Workers/D1 invocation budgets, CPU limits and backlog monitoring. At 200, normal work uses 403 D1 queries and 605 total subrequests, below the documented Workers Paid D1 allowance of 1,000 queries; Free limits are insufficient. The 30-second start budget remains in force, and up to five already-started deliveries may finish afterward. This feature performs no plan upgrade or provisioning.

Capacity arithmetic bounds accepted work under a healthy once-per-minute cron; it does not guarantee delivery through provider outages, disabled cron, exhausted account quotas or revoked browser permission. Operators should monitor pending backlog age and expired/failed counts without logging subscription capability data.

Current primary references: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) and [D1 invocation limits](https://developers.cloudflare.com/d1/platform/limits/).

## Local verification

Use Node 24. Run:

```sh
npm test -- functions/services/__tests__/rewardCalendar.test.ts functions/services/__tests__/rewardReminders.test.ts functions/api/__tests__/rewardCalendar.test.ts functions/api/__tests__/rewardReminders.test.ts workers/reward-reminders/src/index.test.ts
npx wrangler deploy --dry-run --config workers/reward-reminders/wrangler.jsonc
```

Tests use an in-memory SQLite adapter with the real migration, real web-push encryption/VAPID with generated test keys and a mocked transport. They exercise source/range validation, owner binding, replay resistance, reminder ownership, unsupported destinations, edited event schedules, atomic overlap, retries and expired subscriptions. No production database or personal subscription is used.

Primary references: [Cloudflare Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/), [Workers Node crypto compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/), [web-push maintained API](https://github.com/web-push-libs/web-push), [Koios API](https://api.koios.rest/).
