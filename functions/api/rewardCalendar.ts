import type { Env } from '../types/env';
import { deploymentNetwork } from '../services/vmClient';
import { calendarRange, loadCalendar } from '../services/rewardCalendar';
import { calendarHash, validateAnnouncement, type CalendarAnnouncement } from '../../src/shared/calendar';
import { verifyCalendarSignature } from '../services/verifyCalendarSignature';
import { calendarBody, calendarFailure, calendarJson } from '../services/calendarHttp';
import { ReminderError } from '../services/rewardReminders';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  let range;
  try { range = calendarRange(url.searchParams.get('from'), url.searchParams.get('to')); }
  catch (error) { return calendarJson({ error: error instanceof Error ? error.message : 'Invalid calendar range' }, 400); }
  return calendarJson(await loadCalendar(env, range));
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await calendarBody(request);
    if (Object.keys(body).some(key => !['ownerAddress','projectId','eventId','announcement','signature','key','message'].includes(key))) throw new ReminderError('Unsupported announcement fields');
    if (typeof body.ownerAddress !== 'string' || body.ownerAddress.length > 200 || typeof body.projectId !== 'string' || !/^[A-Za-z0-9-]{1,80}$/.test(body.projectId) || (body.eventId !== null && (typeof body.eventId !== 'string' || !/^announcement:[A-Za-z0-9-]{1,80}$/.test(body.eventId)))) throw new ReminderError('Provide ownerAddress, projectId and a nullable eventId');
    const problem = validateAnnouncement(body.announcement);
    if (problem) throw new ReminderError(problem);
    const announcement = body.announcement as CalendarAnnouncement;
    const network = deploymentNetwork(env);
    const verification = await verifyCalendarSignature({
      network, origin: new URL(request.url).origin, ownerAddress: body.ownerAddress, projectId: body.projectId,
      eventId: body.eventId as string | null, announcement, signature: body.signature, key: body.key, message: body.message, now: new Date(),
    });
    if (!verification.ok) return calendarJson({ error: verification.reason }, verification.status);
    if (!env.DB) throw new ReminderError('Announcement storage is unavailable', 503);
    const owner = await env.DB.prepare("SELECT owner_address FROM projects WHERE network = ? AND id = ? AND status = 'approved'")
      .bind(network, body.projectId).first<{ owner_address: string }>();
    if (!owner || owner.owner_address !== body.ownerAddress) throw new ReminderError('Only the approved project owner can publish announcements', 403);
    const signedAt = new Date((JSON.parse((body.message as string).slice('TosiDrop calendar announcement v1\n'.length)) as { signedAt: string }).signedAt).toISOString();
    const signatureHash = await calendarHash(body.signature as string);
    const existing = await env.DB.prepare('SELECT id FROM reward_announcements WHERE network = ? AND signature_hash = ?')
      .bind(network, signatureHash).first<{ id: string }>();
    if (existing) return calendarJson({ id: existing.id });
    const id = typeof body.eventId === 'string' ? body.eventId : `announcement:${await calendarHash(`${network}:${signatureHash}`)}`;
    if (body.eventId !== null) {
      const update = env.DB.prepare(
        'UPDATE reward_announcements SET title = ?, starts_at = ?, ends_at = ?, description = ?, signature_hash = ?, signed_at = ? WHERE network = ? AND id = ? AND project_id = ? AND owner_address = ? AND signed_at < ? AND EXISTS (SELECT 1 FROM projects WHERE network = ? AND id = ? AND owner_address = ? AND status = \'approved\')',
      ).bind(announcement.title, new Date(announcement.startsAt).toISOString(), announcement.endsAt ? new Date(announcement.endsAt).toISOString() : null,
        announcement.description, signatureHash, signedAt, network, id, body.projectId, body.ownerAddress, signedAt, network, body.projectId, body.ownerAddress);
      const reminderUpdates = [0,15,60,1440].map(offset => {
        const time = new Date(Date.parse(announcement.startsAt) - offset * 60_000).toISOString();
        return env.DB!.prepare(
          "UPDATE reward_reminders SET scheduled_at = ?, next_attempt_at = ?, attempts = 0 WHERE network = ? AND event_id = ? AND offset_minutes = ? AND state = 'pending' AND EXISTS (SELECT 1 FROM reward_announcements WHERE network = ? AND id = ? AND signature_hash = ?)",
        ).bind(time, time, network, id, offset, network, id, signatureHash);
      });
      const [result] = await env.DB.batch([update, ...reminderUpdates]);
      if (!result.meta.changes) throw new ReminderError('Announcement changed, is missing, or belongs to another project. Refresh and sign again.', 409);
      return calendarJson({ id });
    }
    const result = await env.DB.prepare(
      'INSERT OR IGNORE INTO reward_announcements (id, network, project_id, owner_address, title, starts_at, ends_at, description, signature_hash, signed_at) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM reward_announcements WHERE network = ? AND project_id = ?) < 100 AND EXISTS (SELECT 1 FROM projects WHERE network = ? AND id = ? AND owner_address = ? AND status = \'approved\')',
    ).bind(id, network, body.projectId, body.ownerAddress, announcement.title, new Date(announcement.startsAt).toISOString(),
      announcement.endsAt ? new Date(announcement.endsAt).toISOString() : null, announcement.description, signatureHash, signedAt,
      network, body.projectId, network, body.projectId, body.ownerAddress).run();
    if (!result.meta.changes) {
      // A create signature keeps its deterministic ID after later edits replace
      // signature_hash. Old create retries can never insert a second event.
      const prior = await env.DB.prepare('SELECT id FROM reward_announcements WHERE network = ? AND id = ? AND project_id = ? AND owner_address = ?')
        .bind(network, id, body.projectId, body.ownerAddress).first<{id:string}>();
      if (prior) return calendarJson({id:prior.id});
      throw new ReminderError('Project announcement limit reached or approval changed', 409);
    }
    return calendarJson({ id }, 201);
  } catch (error) { return calendarFailure(error); }
};
