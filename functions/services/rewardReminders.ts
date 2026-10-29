import { REMINDER_CAPACITY_ERRORS } from '../../src/shared/calendar';
import { timingSafeEqual } from 'node:crypto';
import type { CalendarEvent } from '../../src/shared/calendar';
import { calendarHash, calendarInstant } from '../../src/shared/calendar';
import type { Network } from '../../src/shared/network';
import type { Env } from '../types/env';

export interface PushSubscriptionData { endpoint: string; keys: { p256dh: string; auth: string } }
export class ReminderError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

/** Exact public push-service destinations. Redirects are prohibited at send time. */
export function validatePushSubscription(value: unknown): PushSubscriptionData | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.endpoint !== 'string' || v.endpoint.length > 2048 || !v.keys || typeof v.keys !== 'object') return null;
  let url: URL;
  try { url = new URL(v.endpoint); } catch { return null; }
  if (url.protocol !== 'https:' || url.port || url.username || url.password || url.hash || url.search) return null;
  const approved = (url.hostname === 'fcm.googleapis.com' && /^\/(?:fcm\/send|wp)\/[A-Za-z0-9_:.-]+$/.test(url.pathname)) ||
    (url.hostname === 'updates.push.services.mozilla.com' && /^\/wpush\/v2\/[A-Za-z0-9_-]+$/.test(url.pathname)) ||
    (url.hostname === 'web.push.apple.com' && /^\/[A-Za-z0-9/_-]+$/.test(url.pathname));
  if (!approved) return null;
  const keys = v.keys as Record<string, unknown>;
  if (typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string' || !/^[A-Za-z0-9_-]{87}=?$/.test(keys.p256dh) || !/^[A-Za-z0-9_-]{22}(?:==)?$/.test(keys.auth)) return null;
  try {
    const decode = (s: string) => atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    if (decode(keys.p256dh).length !== 65 || decode(keys.p256dh).charCodeAt(0) !== 4 || decode(keys.auth).length !== 16) return null;
  } catch { return null; }
  return { endpoint: url.href, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

export function remindersAvailable(env: Partial<Env>): boolean {
  return env.REWARD_REMINDERS_ENABLED === 'true' && typeof env.DB?.prepare === 'function' &&
    typeof env.VAPID_PUBLIC_KEY === 'string' && /^[A-Za-z0-9_-]{87}$/.test(env.VAPID_PUBLIC_KEY) &&
    typeof env.VAPID_PRIVATE_KEY === 'string' && /^[A-Za-z0-9_-]{43}$/.test(env.VAPID_PRIVATE_KEY) &&
    typeof env.VAPID_SUBJECT === 'string' && /^(mailto:[^\s@]+@[^\s@]+|https:\/\/[^\s]+)$/.test(env.VAPID_SUBJECT);
}

/** Shared admission and sender throughput; higher values need verified limits. */
export function reminderDeliveryLimit(env: Pick<Env, 'REWARD_REMINDERS_MAX_PER_RUN'>): number {
  const configured = Number(env.REWARD_REMINDERS_MAX_PER_RUN);
  return Number.isSafeInteger(configured) && configured > 0 ? Math.max(10, Math.min(configured, 200)) : 10;
}

export async function enrollReminder(db: D1Database, network: Network, value: unknown,
  resolve: (id: string) => Promise<CalendarEvent | null>, now = new Date(), config: Pick<Env, 'REWARD_REMINDERS_MAX_PER_RUN'> = {}): Promise<{ id: string; managementToken: string; scheduledAt: string }> {
  if (!value || typeof value !== 'object') throw new ReminderError('Reminder request is required');
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some(key => !['eventId', 'remindBeforeMinutes', 'subscription', 'managementToken'].includes(key))) throw new ReminderError('Unsupported reminder fields');
  if (typeof body.eventId !== 'string' || !/^(announcement:[A-Za-z0-9-]{1,80}|epoch:(?:mainnet|preview):\d{1,9})$/.test(body.eventId)) throw new ReminderError('Choose a valid calendar event');
  if (typeof body.remindBeforeMinutes !== 'number' || ![0, 15, 60, 1440].includes(body.remindBeforeMinutes)) throw new ReminderError('Unsupported reminder offset');
  const subscription = validatePushSubscription(body.subscription);
  if (!subscription) throw new ReminderError('This browser push subscription is unsupported or invalid');
  if (typeof body.managementToken !== 'string' || !/^[a-f0-9]{64}$/i.test(body.managementToken)) throw new ReminderError('Provide a 64-character hexadecimal management token');
  const managementToken = body.managementToken;
  const managementHash = await calendarHash(managementToken.toLowerCase());
  const subscriptionHash = await calendarHash(subscription.endpoint);
  const existingReminder = async () => {
    const existing = await db.prepare('SELECT id, management_hash, scheduled_at FROM reward_reminders WHERE network = ? AND event_id = ? AND offset_minutes = ? AND subscription_hash = ?')
      .bind(network, body.eventId as string, body.remindBeforeMinutes as number, subscriptionHash).first<{id:string;management_hash:string;scheduled_at:string}>();
    if (!existing) return null;
    const stored = new TextEncoder().encode(existing.management_hash);
    const supplied = new TextEncoder().encode(managementHash);
    if (stored.length !== supplied.length || !timingSafeEqual(stored, supplied)) throw new ReminderError('This reminder is already saved with a different browser capability', 409);
    return { id: existing.id, managementToken, scheduledAt: existing.scheduled_at };
  };
  // A client can recover a lost response even after the source disappears or
  // scheduled time passes. The same capability authorizes only this tuple.
  const existing = await existingReminder();
  if (existing) return existing;
  const event = await resolve(body.eventId);
  if (!event || event.id !== body.eventId) throw new ReminderError('Calendar event is unavailable', 404);
  const startsAt = calendarInstant(event.startsAt);
  const time = startsAt === null ? NaN : startsAt - body.remindBeforeMinutes * 60_000;
  if (!Number.isFinite(time) || time <= now.getTime()) throw new ReminderError('That reminder time is in the past');
  if (time > now.getTime() + 93 * 86400_000) throw new ReminderError('Choose an event within the next 93 days');
  const end = event.endsAt === null ? Infinity : calendarInstant(event.endsAt);
  if (end === null) throw new ReminderError('Calendar event end is unavailable', 503);
  const effectiveEnd = Math.min(time + 24 * 3600_000, end);
  // Reserve one cron minute for scheduling latency, and half the remaining
  // capacity for retries. Count older queued work conservatively as well.
  const deliveryMinutes = Math.max(0, Math.floor((effectiveEnd - time) / 60_000) - 1);
  const windowCapacity = Math.floor(deliveryMinutes * reminderDeliveryLimit(config) / 2);
  if (windowCapacity < 1) throw new ReminderError(REMINDER_CAPACITY_ERRORS.windowTooShort, 409);
  const scheduledAt = new Date(time).toISOString();
  const id = crypto.randomUUID();
  try {
    const result = await db.prepare(
      'INSERT INTO reward_reminders (id, network, event_id, offset_minutes, subscription, subscription_hash, management_hash, scheduled_at, next_attempt_at, created_at) ' +
      "SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM reward_reminders WHERE network = ? AND subscription_hash = ?) < 100 AND (SELECT COUNT(*) FROM reward_reminders WHERE network = ?) < 100000 AND (SELECT COUNT(*) FROM reward_reminders WHERE network = ? AND state IN ('pending','sending') AND scheduled_at >= ? AND scheduled_at <= ?) < 10000 AND (SELECT COUNT(*) FROM reward_reminders WHERE network = ? AND state IN ('pending','sending') AND scheduled_at >= ? AND scheduled_at < ?) < ?",
    ).bind(id, network, event.id, body.remindBeforeMinutes, JSON.stringify(subscription), subscriptionHash,
      managementHash, scheduledAt, scheduledAt, now.toISOString(), network, subscriptionHash, network, network, new Date(time - 24*3600_000).toISOString(), new Date(time + 24*3600_000).toISOString(), network, new Date(time - 24*3600_000).toISOString(), new Date(effectiveEnd).toISOString(), windowCapacity).run();
    if (!result.meta.changes) {
      const raced = await existingReminder();
      if (raced) return raced;
      throw new ReminderError(REMINDER_CAPACITY_ERRORS.windowFull, 409);
    }
  } catch (error) {
    if (error instanceof ReminderError) throw error;
    if (error instanceof Error && /unique constraint/i.test(error.message)) {
      const raced = await existingReminder();
      if (raced) return raced;
      throw new ReminderError('This reminder is already saved with a different browser capability', 409);
    }
    throw error;
  }
  return { id, managementToken, scheduledAt };
}

export async function removeReminder(db: D1Database, network: Network, id: string, managementToken: string): Promise<boolean> {
  if (!/^[A-Za-z0-9-]{1,80}$/.test(id) || !/^[a-f0-9]{64}$/i.test(managementToken)) return false;
  const result = await db.prepare('DELETE FROM reward_reminders WHERE network = ? AND id = ? AND management_hash = ?')
    .bind(network, id, await calendarHash(managementToken.toLowerCase())).run();
  if ((result.meta.changes ?? 0) > 0) return true;
  const existing = await db.prepare('SELECT id FROM reward_reminders WHERE network = ? AND id = ?').bind(network, id).first<{id:string}>();
  return existing === null;
}
