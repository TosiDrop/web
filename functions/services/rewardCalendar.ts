import type { Network } from '../../src/shared/network';
import { calendarInstant, type CalendarEvent, type CalendarResponse } from '../../src/shared/calendar';
import { readResponseBodyWithLimit } from '../../src/shared/readLimitedBody';
import type { Env } from '../types/env';
import { deploymentNetwork } from './vmClient';
import { koiosConfig } from './koiosClient';

export interface CalendarRange { from: number; to: number }
const DAY = 86400_000;
export function calendarRange(from: string | null, to: string | null): CalendarRange {
  const start = calendarInstant(from), end = calendarInstant(to);
  if (start === null || end === null || end <= start || end - start > 93 * DAY) throw new Error('Use explicit ISO dates with a range from 1 instant to 93 days');
  return { from: start, to: end };
}

export function buildEpochEvents(network: Network, timing: unknown, range: CalendarRange, now: Date): CalendarEvent[] {
  if (!timing || typeof timing !== 'object') throw new Error('Epoch timing unavailable');
  const row = timing as Record<string, unknown>;
  const { epoch_no: epoch, start_time: start, end_time: end } = row;
  if (typeof epoch !== 'number' || !Number.isSafeInteger(epoch) || epoch < 0 || typeof start !== 'number' || typeof end !== 'number' || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= end || start * 1000 > now.getTime() || end * 1000 <= now.getTime()) throw new Error('Current epoch timing unavailable');
  const duration = (end - start) * 1000;
  const first = Math.max(0, Math.ceil((range.from - start * 1000) / duration));
  const count = Math.ceil((range.to - (start * 1000 + first * duration)) / duration);
  if (count > 200) throw new Error('Invalid epoch duration');
  const events: CalendarEvent[] = [];
  for (let offset = first; start * 1000 + offset * duration < range.to; offset++) {
    events.push({
      id: `epoch:${network}:${epoch + offset}`, title: `Epoch ${epoch + offset} begins`,
      startsAt: new Date(start * 1000 + offset * duration).toISOString(), endsAt: null,
      certainty: 'estimated', kind: 'epoch', projectId: null, projectName: null, tokenId: null,
      description: 'Estimated epoch boundary based on current Koios epoch timing. This is a planning aid; reward eligibility and distribution times vary by project.',
      url: '/calendar',
    });
  }
  return events;
}

interface AnnouncementRow { id: string; title: string; starts_at: string; ends_at: string | null; description: string; project_id: string; project_name: string; token_id: string }
export function announcementEvent(row: AnnouncementRow): CalendarEvent {
  return { id: row.id, title: row.title, startsAt: row.starts_at, endsAt: row.ends_at, description: row.description,
    certainty: 'confirmed', kind: 'distribution', projectId: row.project_id, projectName: row.project_name, tokenId: row.token_id,
    url: `/calendar?event=${encodeURIComponent(row.id)}` };
}

async function epochTiming(env: Partial<Env>, fetcher: typeof fetch): Promise<unknown> {
  const config = koiosConfig(env);
  const headers = { Accept: 'application/json', ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}) };
  async function read(path: string): Promise<unknown> {
    const response = await fetcher(`${config.baseUrl}/${path}`, { headers, signal: AbortSignal.timeout(8000), redirect: 'error' });
    if (!response.ok) throw new Error('Epoch source unavailable');
    const body = await readResponseBodyWithLimit(response, 32_768);
    if (!body) throw new Error('Epoch response exceeded limit');
    return JSON.parse(new TextDecoder().decode(body)) as unknown;
  }
  const tip = await read('tip');
  if (!Array.isArray(tip) || typeof (tip[0] as Record<string, unknown> | undefined)?.epoch_no !== 'number') throw new Error('Current epoch unavailable');
  const epoch = (tip[0] as { epoch_no: number }).epoch_no;
  if (!Number.isSafeInteger(epoch) || epoch < 0) throw new Error('Current epoch unavailable');
  const rows = await read(`epoch_info?_epoch_no=${epoch}&limit=1`);
  if (!Array.isArray(rows) || (rows[0] as Record<string, unknown> | undefined)?.epoch_no !== epoch) throw new Error('Epoch mismatch');
  return rows[0] as unknown;
}

export async function loadCalendar(env: Partial<Env>, range: CalendarRange, now = new Date(), fetcher: typeof fetch = fetch): Promise<CalendarResponse> {
  const network = deploymentNetwork(env);
  const result: CalendarResponse = { network, events: [], sources: { announcements: 'unavailable', epochs: 'unavailable' }, generatedAt: now.toISOString() };
  await Promise.all([
    (async () => {
      if (!env.DB) return;
      try {
        const { results } = await env.DB.prepare(
          "SELECT a.id, a.title, a.starts_at, a.ends_at, a.description, a.project_id, p.name AS project_name, p.token_id FROM reward_announcements a JOIN projects p ON p.id = a.project_id AND p.network = a.network WHERE a.network = ? AND p.status = 'approved' AND a.starts_at >= ? AND a.starts_at < ? ORDER BY a.starts_at LIMIT 2001",
        ).bind(network, new Date(range.from).toISOString(), new Date(range.to).toISOString()).all<AnnouncementRow>();
        if ((results?.length ?? 0) > 2000) return;
        const events = (results ?? []).map(announcementEvent);
        if (events.some(event => calendarInstant(event.startsAt) === null)) return;
        result.events.push(...events);
        result.sources.announcements = 'available';
      } catch { /* Unavailable is represented explicitly; no database details enter logs. */ }
    })(),
    (async () => {
      try {
        result.events.push(...buildEpochEvents(network, await epochTiming(env, fetcher), range, now));
        result.sources.epochs = 'available';
      } catch { /* Preserve announcements when Koios is unavailable. */ }
    })(),
  ]);
  result.events.sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id));
  return result;
}

/** Reuse one authoritative source snapshot for a bounded cron batch. */
export function calendarEventResolver(env: Partial<Env>, now = new Date()): (id: string) => Promise<CalendarEvent | null> {
  let snapshot: Promise<CalendarResponse> | undefined;
  return async id => {
    snapshot ??= loadCalendar(env, { from: now.getTime() - DAY, to: now.getTime() + 92 * DAY }, now);
    const calendar = await snapshot;
    const event = calendar.events.find(event => event.id === id);
    if (!event && ((id.startsWith('announcement:') && calendar.sources.announcements === 'unavailable') || (id.startsWith('epoch:') && calendar.sources.epochs === 'unavailable'))) throw new Error('Event source unavailable');
    return event ?? null;
  };
}

export async function resolveCalendarEvent(env: Partial<Env>, id: string, now = new Date()): Promise<CalendarEvent | null> {
  return calendarEventResolver(env, now)(id);
}
