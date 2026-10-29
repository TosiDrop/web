import type { CalendarEvent } from '@/shared/calendar';

export function dayKey(date: Date, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone): string {
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function groupCalendarEvents(events: CalendarEvent[], timeZone: string) {
  const groups = new Map<string, CalendarEvent[]>();
  for (const event of [...events].filter((item) => Number.isFinite(Date.parse(item.startsAt)))
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.id.localeCompare(b.id))) {
    const key = dayKey(new Date(event.startsAt), timeZone);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return Array.from(groups, ([key, items]) => ({ key, events: items }));
}

export function monthDays(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => new Date(first.getFullYear(), first.getMonth(), index - offset + 1));
}

export function monthRange(month: Date) {
  const days = monthDays(month);
  return { from: days[0]!.toISOString(), to: new Date(days[41]!.getFullYear(), days[41]!.getMonth(), days[41]!.getDate() + 1).toISOString() };
}

const escapeIcs = (value: string) => Array.from(value)
  .filter((character) => character.charCodeAt(0) >= 32 || ['\t', '\r', '\n'].includes(character)).join('')
  .replaceAll('\\', '\\\\').replace(/\r\n|\r|\n/g, '\\n').replaceAll(';', '\\;').replaceAll(',', '\\,');
const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  let part = '';
  let length = 0;
  for (const character of line) {
    const bytes = encoder.encode(character).length;
    if (length + bytes > 75) { lines.push(part); part = ' '; length = 1; }
    part += character; length += bytes;
  }
  lines.push(part);
  return lines.join('\r\n');
}

export function calendarIcs(events: CalendarEvent[], origin: string, now = new Date()): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TosiDrop//Reward Calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const event of events) {
    if (!Number.isFinite(Date.parse(event.startsAt))) continue;
    const url = new URL(event.url, origin);
    const title = `${event.title}${event.certainty === 'estimated' ? ' (estimated)' : ''}`;
    const description = `${event.description}${event.certainty === 'estimated' ? '\nEstimated epoch timing. Reward availability depends on the project.' : ''}`;
    lines.push('BEGIN:VEVENT', `UID:${escapeIcs(event.id)}@tosidrop`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(new Date(event.startsAt))}`);
    if (event.endsAt && Number.isFinite(Date.parse(event.endsAt)) && Date.parse(event.endsAt) > Date.parse(event.startsAt)) lines.push(`DTEND:${stamp(new Date(event.endsAt))}`);
    lines.push(`SUMMARY:${escapeIcs(title)}`, `DESCRIPTION:${escapeIcs(description)}`);
    if (url.origin === new URL(origin).origin && /^https?:$/.test(url.protocol)) lines.push(`URL:${url.href}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

export function downloadCalendar(events: CalendarEvent[]) {
  const url = URL.createObjectURL(new Blob([calendarIcs(events, window.location.origin)], { type: 'text/calendar;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = 'tosidrop-rewards.ics';
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
