import { describe, expect, it } from 'vitest';
import { calendarIcs, groupCalendarEvents, monthDays, monthRange } from '../utils/calendar';
import type { CalendarEvent } from '@/shared/calendar';

const event: CalendarEvent = {
  id: 'event-1', title: 'TOSI rewards', startsAt: '2026-11-01T00:30:00Z', endsAt: null,
  certainty: 'confirmed', kind: 'distribution', projectId: 'p1', projectName: 'TosiDrop',
  tokenId: 'tosi', description: 'A reward announcement.', url: '/tokens/tosi',
};

describe('calendar dates', () => {
  it('groups by the viewing timezone across a UTC month boundary', () => {
    expect(groupCalendarEvents([event], 'America/Los_Angeles').map((group) => group.key)).toEqual(['2026-10-31']);
    expect(groupCalendarEvents([event], 'Asia/Tokyo').map((group) => group.key)).toEqual(['2026-11-01']);
  });

  it('sorts events and excludes malformed dates', () => {
    const earlier = { ...event, id: 'earlier', startsAt: '2026-10-30T15:00:00Z' };
    expect(groupCalendarEvents([event, { ...event, startsAt: 'invalid' }, earlier], 'UTC')
      .flatMap((group) => group.events.map((item) => item.id))).toEqual(['earlier', 'event-1']);
  });

  it('covers the month with Monday-first dates across year boundaries', () => {
    const days = monthDays(new Date(2027, 0, 15));
    expect(days).toHaveLength(42);
    expect(days[0]?.getDay()).toBe(1);
    expect(days[0]?.getFullYear()).toBe(2026);
    expect(days.filter((day) => day.getMonth() === 0)).toHaveLength(31);
  });

  it('requests a complete local month with adjacent display days', () => {
    const range = monthRange(new Date(2026, 10, 15));
    expect(Date.parse(range.from)).toBeLessThan(new Date(2026, 10, 1).getTime());
    expect(Date.parse(range.to)).toBeGreaterThan(new Date(2026, 11, 1).getTime());
    expect(Date.parse(range.to) - Date.parse(range.from)).toBeLessThan(93 * 86400_000);
  });
});

describe('calendar exports', () => {
  it('exports UTC instants and escaped content without injecting events', () => {
    const ics = calendarIcs([{ ...event, title: 'TOSI, rewards; next', description: 'First\nBEGIN:VEVENT\nSecond\\line' }], 'https://tosidrop.me', new Date('2026-10-29T00:00:00Z'));
    expect(ics).toContain('DTSTART:20261101T003000Z\r\n');
    expect(ics).toContain('SUMMARY:TOSI\\, rewards\\; next\r\n');
    expect(ics).toContain('DESCRIPTION:First\\nBEGIN:VEVENT\\nSecond\\\\line\r\n');
    expect(ics.match(/^BEGIN:VEVENT$/gm)).toHaveLength(1);
    expect(ics).toContain('URL:https://tosidrop.me/tokens/tosi');
  });

  it('marks epoch estimates in exports and preserves an end time', () => {
    const ics = calendarIcs([{ ...event, certainty: 'estimated', kind: 'epoch', endsAt: '2026-11-01T01:30:00Z' }], 'https://tosidrop.me');
    expect(ics).toContain('SUMMARY:TOSI rewards (estimated)');
    expect(ics).toContain('DTEND:20261101T013000Z');
    expect(ics).toContain('Estimated epoch timing');
  });

  it('folds long UTF-8 content into lines at most 75 bytes', () => {
    const ics = calendarIcs([{ ...event, description: '☂️ reward '.repeat(30) }], 'https://tosidrop.me');
    expect(ics.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75)).toBe(true);
  });

  it('omits invalid events and unsafe external destinations', () => {
    const ics = calendarIcs([{ ...event, startsAt: 'bad' }, { ...event, url: 'https://evil.example' }], 'https://tosidrop.me');
    expect(ics).not.toContain('DTSTART:bad');
    expect(ics).not.toContain('evil.example');
    expect(ics).toContain('BEGIN:VCALENDAR');
  });
});
