import { describe, expect, it, vi } from 'vitest';
import { buildEpochEvents, calendarRange, loadCalendar } from '../rewardCalendar';
import { buildCalendarAnnouncementMessage, validateAnnouncement } from '../../../src/shared/calendar';
import { verifyCalendarSignature } from '../verifyCalendarSignature';
import { calendarDb } from './calendarDb';
const now = new Date('2026-10-29T12:00:00Z');
const announcement = { title: 'Reward opens', startsAt: '2026-10-30T12:00:00.000Z', endsAt: null, description: 'Owner announcement' };

describe('reward calendar boundaries', () => {
  it('accepts at most 93 days and explicit UTC instants', () => {
    expect(calendarRange('2026-10-01T00:00:00Z', '2027-01-02T00:00:00Z')).toBeTruthy();
    expect(() => calendarRange('2026-10-01', '2026-11-01')).toThrow();
    expect(() => calendarRange('2026-10-01T00:00:00Z', '2027-01-03T00:00:00Z')).toThrow();
    expect(() => calendarRange('2026-11-01T00:00:00Z', '2026-10-01T00:00:00Z')).toThrow();
  });
  it('rejects invalid announcements and excessive text', () => {
    expect(validateAnnouncement(announcement)).toBeNull();
    expect(validateAnnouncement({ ...announcement, startsAt: 'tomorrow' })).toBeTruthy();
    expect(validateAnnouncement({ ...announcement, endsAt: '2026-10-29T12:00:00Z' })).toBeTruthy();
    expect(validateAnnouncement({ ...announcement, title: 'x'.repeat(121) })).toBeTruthy();
  });
  it('uses the source epoch duration and deterministic network-scoped estimate ids', () => {
    const events = buildEpochEvents('preview', { epoch_no: 100, start_time: now.getTime()/1000 - 3600, end_time: now.getTime()/1000 + 7200 }, { from: now.getTime(), to: now.getTime() + 7*3600_000 }, now);
    expect(events.map(e => e.id)).toEqual(['epoch:preview:101', 'epoch:preview:102']);
    expect(events.every(e => e.certainty === 'estimated' && e.kind === 'epoch')).toBe(true);
    expect(events[0].startsAt).toBe('2026-10-29T14:00:00.000Z');
  });
  it('reports each unavailable source without inventing events', async () => {
    const response = await loadCalendar({ VITE_NETWORK: 'mainnet' }, { from: now.getTime(), to: now.getTime()+3600_000 }, now, vi.fn().mockRejectedValue(new Error('offline')));
    expect(response).toMatchObject({ network: 'mainnet', events: [], sources: { announcements:'unavailable', epochs:'unavailable' } });
  });
  it('keeps confirmed announcements separate from source-derived estimates and isolates networks', async () => {
    const {db,sqlite}=calendarDb();
    sqlite.exec("INSERT INTO projects VALUES('preview-project','preview','owner','approved','Preview project','token'); INSERT INTO projects VALUES('mainnet-project','mainnet','owner','approved','Mainnet project','token')");
    const insert=sqlite.prepare("INSERT INTO reward_announcements(id,network,project_id,owner_address,title,starts_at,description,signature_hash,signed_at) VALUES(?,?,?,?,?,?,?,?,?)");
    insert.run('announcement:preview','preview','preview-project','owner','Preview reward','2026-10-29T13:00:00.000Z','Owner date','sig1',now.toISOString());
    insert.run('announcement:mainnet','mainnet','mainnet-project','owner','Mainnet reward','2026-10-29T13:00:00.000Z','Owner date','sig2',now.toISOString());
    const fetcher=vi.fn<typeof fetch>(async input=>Response.json((typeof input === 'string' && input.endsWith('/tip'))?[{epoch_no:100}]:[{epoch_no:100,start_time:now.getTime()/1000-3600,end_time:now.getTime()/1000+3600}]));
    const response=await loadCalendar({DB:db,VITE_NETWORK:'preview'},{from:now.getTime(),to:now.getTime()+7200_000},now,fetcher);
    expect(response.sources).toEqual({announcements:'available',epochs:'available'});
    expect(response.events.map(event=>[event.id,event.certainty])).toEqual([['announcement:preview','confirmed'],['epoch:preview:101','estimated']]);
    const partial=await loadCalendar({DB:db,VITE_NETWORK:'preview'},{from:now.getTime(),to:now.getTime()+7200_000},now,vi.fn().mockRejectedValue(new Error('offline')));
    expect(partial.sources).toEqual({announcements:'available',epochs:'unavailable'});
    expect(partial.events.map(event=>event.id)).toEqual(['announcement:preview']);
  });
  it('keeps the just-started current epoch resolvable for due reminders', () => {
    const events = buildEpochEvents('preview', {epoch_no:100,start_time:now.getTime()/1000-10,end_time:now.getTime()/1000+1000},{from:now.getTime()-60000,to:now.getTime()+60000},now);
    expect(events.map(event=>event.id)).toEqual(['epoch:preview:100']);
  });
  it('rejects impossible calendar dates rather than normalizing them', () => {
    expect(validateAnnouncement({...announcement,startsAt:'2026-02-30T12:00:00Z'})).toBeTruthy();
  });
  it('rejects stale source epoch timing', () => {
    expect(() => buildEpochEvents('preview', {epoch_no:1,start_time:1,end_time:10},{from:now.getTime(),to:now.getTime()+3600_000},now)).toThrow();
  });
});

describe('announcement signature binding', () => {
  const base = { network:'preview' as const, origin:'https://preview.tosidrop.io', ownerAddress:'stake_test1owner', projectId:'p1', eventId:null, announcement, signedAt:now.toISOString() };
  it('binds domain, network, owner, project, event and payload before checking CIP30 signature', async () => {
    const message = await buildCalendarAnnouncementMessage(base);
    for (const change of [ { origin:'https://evil.example' }, {network:'mainnet' as const}, {ownerAddress:'stake_test1other'}, {projectId:'p2'}, {eventId:'announcement:other'}, {announcement:{...announcement,title:'Changed'}} ]) {
      expect(await verifyCalendarSignature({ ...base, ...change, message, signature:'00', key:'00', now })).toMatchObject({ok:false,status:401});
    }
  });
  it('rejects stale signatures', async () => {
    const message = await buildCalendarAnnouncementMessage({...base,signedAt:'2026-10-28T12:00:00.000Z'});
    expect(await verifyCalendarSignature({...base,message,signature:'00',key:'00',now})).toMatchObject({ok:false, reason:expect.stringContaining('stale')});
  });
});
