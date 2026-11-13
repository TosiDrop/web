import type { Network } from '../network';

/** Shared rejection vocabulary lets the browser safely unlock an unaccepted reminder. */
export const REMINDER_CAPACITY_ERRORS = {
  windowFull: 'Reminder capacity for this event window is full. Choose an earlier reminder time or export this event.',
  windowTooShort: 'This event has too little reminder time left. Choose an earlier reminder time or export this event.',
} as const;

export interface CalendarEvent {
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
  url: string;
}
export interface CalendarResponse {
  network: Network;
  events: CalendarEvent[];
  sources: { announcements: 'available' | 'unavailable'; epochs: 'available' | 'unavailable' };
  generatedAt: string;
}
export interface CalendarAnnouncement {
  title: string;
  startsAt: string;
  endsAt: string | null;
  description: string;
}
export interface CalendarAnnouncementSigningInput {
  network: Network;
  origin: string;
  ownerAddress: string;
  projectId: string;
  eventId: string | null;
  announcement: CalendarAnnouncement;
  signedAt: string;
}

/** Require a transport instant with an explicit timezone, rather than a local date. */
export function calendarInstant(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const parts = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(?:\.\d{1,3})?(?:Z|([+-])(\d\d):(\d\d))$/.exec(value);
  if (!parts) return null;
  const [,year,month,day,hour,minute,second,,offsetHour,offsetMinute] = parts;
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth()+1 !== Number(month) || date.getUTCDate() !== Number(day) || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59 || Number(offsetHour ?? 0) > 23 || Number(offsetMinute ?? 0) > 59) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

export function validateAnnouncement(value: unknown): string | null {
  if (!value || typeof value !== 'object') return 'Announcement is required';
  const v = value as Record<string, unknown>;
  if (typeof v.title !== 'string' || !v.title.trim() || v.title.length > 120 || Array.from(v.title).some(character => character.charCodeAt(0) < 32)) return 'Use a title between 1 and 120 characters';
  if (typeof v.description !== 'string' || v.description.length > 2000 || v.description.includes('\0')) return 'Description must be at most 2000 characters';
  const start = calendarInstant(v.startsAt);
  const end = v.endsAt === null ? null : calendarInstant(v.endsAt);
  if (start === null || (v.endsAt !== null && end === null)) return 'Use dates with an explicit timezone';
  if (end !== null && end <= start) return 'End must follow start';
  return null;
}

export async function calendarHash(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}

/** Sign the exact UTF-8 text using CIP-30 signData, encoded as hexadecimal. */
export async function buildCalendarAnnouncementMessage(input: CalendarAnnouncementSigningInput): Promise<string> {
  const { title, startsAt, endsAt, description } = input.announcement;
  const payloadHash = await calendarHash(JSON.stringify({ title, startsAt, endsAt, description }));
  return 'TosiDrop calendar announcement v1\n' + JSON.stringify({
    origin: input.origin,
    network: input.network,
    ownerAddress: input.ownerAddress,
    projectId: input.projectId,
    eventId: input.eventId,
    payloadHash,
    signedAt: input.signedAt,
  });
}
