import webpush from 'web-push';
import type { Env } from '../../../functions/types/env';
import { deploymentNetwork } from '../../../functions/services/vmClient';
import { calendarEventResolver } from '../../../functions/services/rewardCalendar';
import { remindersAvailable, reminderDeliveryLimit, validatePushSubscription, type PushSubscriptionData } from '../../../functions/services/rewardReminders';
import { calendarHash, calendarInstant, type CalendarEvent } from '../../../src/shared/calendar';

export interface ReminderNotification { title: string; body: string; url: string; tag: string }
type Send = (subscription: PushSubscriptionData, payload: ReminderNotification, topic: string) => Promise<number>;
interface ReminderRow { id: string; event_id: string; offset_minutes: number; subscription: string; subscription_hash: string; attempts: number }

/** web-push owns RFC8291 encryption and VAPID; fetch owns Workers transport. */
export async function sendWebPush(subscription: PushSubscriptionData, payload: ReminderNotification, env: Partial<Env>, topic: string, fetcher: typeof fetch = fetch): Promise<number> {
  if (!validatePushSubscription(subscription)) throw new Error('Unsupported push destination');
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) throw new Error('Push sender is unconfigured');
  const details = webpush.generateRequestDetails(subscription, JSON.stringify(payload), {
    TTL: 3600, urgency: 'normal', topic: topic.slice(0, 32), contentEncoding: 'aes128gcm',
    vapidDetails: { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY },
  });
  const response = await fetcher(subscription.endpoint, {
    method: 'POST', headers: details.headers, body: new Uint8Array(details.body ?? []),
    redirect: 'manual', signal: AbortSignal.timeout(10_000),
  });
  // Do not read provider error bodies: these can echo endpoint or subscription details.
  await response.body?.cancel();
  return response.status;
}

export async function runReminderDelivery(env: Partial<Env>, now = new Date(),
  resolve: (id: string) => Promise<CalendarEvent | null> = calendarEventResolver(env, now),
  send: Send = (subscription, payload, topic) => sendWebPush(subscription, payload, env, topic),
  monotonicNow: () => number = () => performance.now(),
): Promise<void> {
  if (!remindersAvailable(env) || !env.DB) return;
  const db = env.DB;
  const network = deploymentNetwork(env);
  const timestamp = now.toISOString();
  const maxPerRun = reminderDeliveryLimit(env);
  const deadline = monotonicNow() + 30_000;
  // Keep subscription/key storage bounded; a failed/sent row has no future purpose.
  await db.prepare("DELETE FROM reward_reminders WHERE network = ? AND ((state IN ('sent','failed') AND created_at < ?) OR scheduled_at < ?)")
    .bind(network, new Date(now.getTime() - 30 * 86400_000).toISOString(), new Date(now.getTime() - 2 * 86400_000).toISOString()).run();
  const { results } = await db.prepare(
    "SELECT id, event_id, offset_minutes, subscription, subscription_hash, attempts FROM reward_reminders WHERE network = ? AND ((state = 'pending' AND next_attempt_at <= ?) OR (state = 'sending' AND lease_until < ?)) ORDER BY next_attempt_at LIMIT ?",
  ).bind(network, timestamp, timestamp, maxPerRun).all<ReminderRow>();
  async function deliver(row: ReminderRow): Promise<void> {
    const lease = crypto.randomUUID();
    const claimed = await db.prepare(
      "UPDATE reward_reminders SET state = 'sending', lease_until = ?, lease_token = ?, attempts = attempts + 1 WHERE network = ? AND id = ? AND ((state = 'pending' AND next_attempt_at <= ?) OR (state = 'sending' AND lease_until < ?))",
    ).bind(new Date(now.getTime() + 300_000).toISOString(), lease, network, row.id, timestamp, timestamp).run();
    if (!claimed.meta.changes) return;
    const fail = async () => {
      await db.prepare("UPDATE reward_reminders SET state = 'failed', lease_until = NULL, lease_token = NULL WHERE network = ? AND id = ? AND lease_token = ?")
        .bind(network, row.id, lease).run();
    };
    const retry = async () => {
      const attempts = row.attempts + 1;
      if (attempts >= 5) { await fail(); return; }
      const delay = Math.min(3600, 60 * 2 ** (attempts - 1));
      await db.prepare("UPDATE reward_reminders SET state = 'pending', next_attempt_at = ?, lease_until = NULL, lease_token = NULL WHERE network = ? AND id = ? AND lease_token = ?")
        .bind(new Date(now.getTime() + delay * 1000).toISOString(), network, row.id, lease).run();
    };
    if (row.attempts >= 5) { await fail(); return; }
    try {
      const subscription = validatePushSubscription(JSON.parse(row.subscription) as unknown);
      if (!subscription) { await fail(); return; }
      const event = await resolve(row.event_id);
      if (!event || event.id !== row.event_id) { await fail(); return; }
      const instant = calendarInstant(event.startsAt);
      const due = instant === null ? NaN : instant - row.offset_minutes * 60_000;
      if (!Number.isFinite(due)) { await fail(); return; }
      if (due > now.getTime()) {
        const scheduledAt = new Date(due).toISOString();
        await db.prepare("UPDATE reward_reminders SET state = 'pending', scheduled_at = ?, next_attempt_at = ?, attempts = 0, lease_until = NULL, lease_token = NULL WHERE network = ? AND id = ? AND lease_token = ?")
          .bind(scheduledAt, scheduledAt, network, row.id, lease).run();
        return;
      }
      // Queue position never imposes a one-hour expiry. Respect an explicit
      // event end and otherwise retain a bounded 24-hour reminder grace period.
      const end = event.endsAt === null ? null : calendarInstant(event.endsAt);
      const expiresAt = Math.min(due + 24 * 3600_000, end ?? Infinity);
      if (now.getTime() >= expiresAt) { await fail(); return; }
      const payload: ReminderNotification = {
        title: `${event.certainty === 'estimated' ? 'Estimated: ' : ''}${event.title}`.slice(0, 140),
        body: `${event.certainty === 'estimated' ? 'Planning estimate. ' : 'Project announcement. '}${new Date(event.startsAt).toISOString()}${event.projectName ? ` · ${event.projectName}` : ''}`.slice(0, 240),
        url: `/calendar?event=${encodeURIComponent(event.id)}&date=${encodeURIComponent(event.startsAt)}`, tag: `tosidrop:${network}:${row.id}`,
      };
      const status = await send(subscription, payload, (await calendarHash(`${network}:${row.id}`)).slice(0, 32));
      if (status >= 200 && status < 300) {
        await db.prepare("UPDATE reward_reminders SET state = 'sent', delivered_at = ?, lease_until = NULL, lease_token = NULL WHERE network = ? AND id = ? AND lease_token = ?")
          .bind(timestamp, network, row.id, lease).run();
      } else if (status === 404 || status === 410) {
        await db.prepare('DELETE FROM reward_reminders WHERE network = ? AND subscription_hash = ?').bind(network, row.subscription_hash).run();
      } else if (status === 429 || status >= 500) { await retry(); }
      else { await fail(); }
    } catch { await retry(); }
  }
  let next = 0;
  const rows = results ?? [];
  await Promise.all(Array.from({length: Math.min(5, rows.length)}, async () => {
    while (monotonicNow() < deadline) {
      const row = rows[next++];
      if (!row) return;
      await deliver(row);
    }
  }));
}

export default {
  fetch(): Response { return new Response('Not found', { status: 404 }); },
  scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): void {
    ctx.waitUntil(runReminderDelivery(env));
  },
};
