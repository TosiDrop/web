import { describe, expect, it } from 'vitest';
import { validatePushSubscription, enrollReminder, removeReminder, remindersAvailable } from '../rewardReminders';
import { calendarDb } from './calendarDb';
import type { CalendarEvent } from '../../../src/shared/calendar';
const now = new Date('2026-10-29T12:00:00.000Z');
const event: CalendarEvent = { id:'announcement:1',title:'Reward day',startsAt:'2026-10-30T12:00:00.000Z',endsAt:null,certainty:'confirmed',kind:'distribution',projectId:'p1',projectName:'Project',tokenId:null,description:'Reward',url:'/calendar' };
const sub = {endpoint:'https://fcm.googleapis.com/fcm/send/abc',keys:{p256dh:'BA'+ 'a'.repeat(85),auth:'a'.repeat(22)}};

describe('Web Push reminder enrollment', () => {
  it('only allows HTTPS approved push endpoints and bounded subscription keys', () => {
    expect(validatePushSubscription(sub)).toBeTruthy();
    for (const endpoint of ['http://fcm.googleapis.com/fcm/send/abc','https://localhost/a','https://fcm.googleapis.com.evil.example/a','https://fcm.googleapis.com:444/fcm/send/a','https://user@fcm.googleapis.com/fcm/send/a','https://fcm.googleapis.com/other']) expect(validatePushSubscription({...sub,endpoint})).toBeNull();
    expect(validatePushSubscription({...sub,keys:{...sub.keys,auth:'bad'}})).toBeNull();
  });
  it('stays unavailable until the sender is explicitly enabled and configured', () => {
    expect(remindersAvailable({})).toBe(false);
    expect(remindersAvailable({DB:{} as D1Database,VAPID_PUBLIC_KEY:'key'})).toBe(false);
  });
  it('resolves authoritative event time, hashes management tokens, suppresses duplicates and verifies removal ownership', async () => {
    const {db,sqlite} = calendarDb();
    const resolver = async () => event;
    const saved = await enrollReminder(db,'preview',{eventId:event.id,remindBeforeMinutes:60,subscription:sub,managementToken:'a'.repeat(64)},resolver,now);
    expect(saved.scheduledAt).toBe('2026-10-30T11:00:00.000Z');
    const row = sqlite.prepare('SELECT * FROM reward_reminders').get()!;
    expect(row.management_hash).not.toBe(saved.managementToken);
    expect(String(row.management_hash)).toHaveLength(64);
    expect(await enrollReminder(db,'preview',{eventId:event.id,remindBeforeMinutes:60,subscription:sub,managementToken:'a'.repeat(64)},resolver,now)).toEqual(saved);
    await expect(enrollReminder(db,'preview',{eventId:event.id,remindBeforeMinutes:60,subscription:sub,managementToken:'b'.repeat(64)},resolver,now)).rejects.toThrow(/already/i);
    expect(await removeReminder(db,'mainnet',saved.id,saved.managementToken)).toBe(true);
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM reward_reminders').get()?.count).toBe(1);
    expect(await removeReminder(db,'preview',saved.id,'forged-token')).toBe(false);
    expect(await removeReminder(db,'preview',saved.id,'b'.repeat(64))).toBe(false);
    expect(await removeReminder(db,'preview',saved.id,saved.managementToken)).toBe(true);
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM reward_reminders').get()?.count).toBe(0);
    expect(await removeReminder(db,'preview',saved.id,saved.managementToken)).toBe(true);
  });
  it('recovers a response-lost enrollment with its client capability after its event time passes', async () => {
    const {db,sqlite}=calendarDb();
    const body={eventId:event.id,remindBeforeMinutes:60,subscription:sub,managementToken:'c'.repeat(64)};
    const saved=await enrollReminder(db,'preview',body,async()=>event,now);
    const retry=await enrollReminder(db,'preview',body,async()=>{throw new Error('Source is offline');},new Date('2026-11-02T00:00:00Z'));
    expect(retry).toEqual(saved);
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM reward_reminders').get()?.count).toBe(1);
    const row=sqlite.prepare('SELECT * FROM reward_reminders').get()!;
    expect(JSON.stringify(row)).not.toContain(body.managementToken);
    await expect(enrollReminder(db,'preview',{...body,managementToken:'d'.repeat(64)},async()=>null,new Date('2026-11-02T00:00:00Z'))).rejects.toMatchObject({status:409});
    expect(await removeReminder(db,'preview',saved.id,body.managementToken)).toBe(true);
  });
  it('requires a bounded client capability before storing a reminder', async () => {
    const {db,sqlite}=calendarDb();
    for (const managementToken of [undefined,'short','x'.repeat(64),'a'.repeat(65)]) {
      await expect(enrollReminder(db,'preview',{eventId:event.id,remindBeforeMinutes:60,subscription:sub,managementToken},async()=>event,now)).rejects.toMatchObject({status:400});
    }
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM reward_reminders').get()?.count).toBe(0);
  });
  it('rejects fanout beyond the default sender capacity before accepting another reminder', async () => {
    const {db,sqlite}=calendarDb();
    sqlite.exec("WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<10000) INSERT INTO reward_reminders(id,network,event_id,offset_minutes,subscription,subscription_hash,management_hash,scheduled_at,next_attempt_at,created_at) SELECT 'bulk-'||x,'preview','announcement:bulk-'||x,0,'{}','sub-'||x,'hash','2026-10-30T11:00:00.000Z','2026-10-30T11:00:00.000Z','2026-10-29T00:00:00.000Z' FROM n");
    await expect(enrollReminder(db,'preview',{eventId:event.id,remindBeforeMinutes:60,subscription:sub,managementToken:'a'.repeat(64)},async()=>event,now)).rejects.toMatchObject({status:409,message:expect.stringContaining('capacity')});
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM reward_reminders').get()?.count).toBe(10000);
  });
  it('atomically bounds a short event window and accepts an earlier reminder offset', async () => {
    const {db,sqlite}=calendarDb();
    const shortEvent={...event,endsAt:'2026-10-30T13:00:00.000Z'};
    // One cron-minute latency margin, then 50% retry headroom: 59*10/2=295.
    sqlite.exec("WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<295) INSERT INTO reward_reminders(id,network,event_id,offset_minutes,subscription,subscription_hash,management_hash,scheduled_at,next_attempt_at,created_at) SELECT 'short-'||x,'preview','announcement:short-'||x,0,'{}','shortsub-'||x,'hash','2026-10-30T12:00:00.000Z','2026-10-30T12:00:00.000Z','2026-10-29T00:00:00.000Z' FROM n");
    const body={eventId:event.id,remindBeforeMinutes:0,subscription:sub,managementToken:'a'.repeat(64)};
    await expect(enrollReminder(db,'preview',body,async()=>shortEvent,now)).rejects.toMatchObject({status:409,message:expect.stringContaining('earlier reminder time')});
    const earlier=await enrollReminder(db,'preview',{...body,remindBeforeMinutes:15},async()=>shortEvent,now);
    expect(earlier.scheduledAt).toBe('2026-10-30T11:45:00.000Z');
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM reward_reminders').get()?.count).toBe(296);
  });
  it('admits only one concurrent enrollment for the last short-window slot', async () => {
    const {db,sqlite}=calendarDb();
    sqlite.exec("WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<294) INSERT INTO reward_reminders(id,network,event_id,offset_minutes,subscription,subscription_hash,management_hash,scheduled_at,next_attempt_at,created_at) SELECT 'race-'||x,'preview','announcement:race-'||x,0,'{}','racesub-'||x,'hash','2026-10-30T12:00:00.000Z','2026-10-30T12:00:00.000Z','2026-10-29T00:00:00.000Z' FROM n");
    const body={eventId:event.id,remindBeforeMinutes:0,subscription:sub,managementToken:'a'.repeat(64)};
    const resolve=async()=>({...event,endsAt:'2026-10-30T13:00:00.000Z'});
    const results=await Promise.allSettled([enrollReminder(db,'preview',body,resolve,now),enrollReminder(db,'preview',{...body,subscription:{...sub,endpoint:'https://fcm.googleapis.com/fcm/send/other'},managementToken:'b'.repeat(64)},resolve,now)]);
    expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1);
    expect(results.filter(result=>result.status==='rejected')).toHaveLength(1);
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM reward_reminders').get()?.count).toBe(295);
  });
  it('rejects forged events, arbitrary scheduling fields, past events and unsupported offsets', async () => {
    const {db} = calendarDb();
    const body = {eventId:event.id,remindBeforeMinutes:15,subscription:sub,managementToken:'a'.repeat(64)};
    await expect(enrollReminder(db,'preview',body,async()=>null,now)).rejects.toThrow(/event/i);
    await expect(enrollReminder(db,'preview',{...body,remindBeforeMinutes:10},async()=>event,now)).rejects.toThrow(/offset/i);
    await expect(enrollReminder(db,'preview',{...body,title:'Forged'},async()=>event,now)).rejects.toThrow(/fields/i);
    await expect(enrollReminder(db,'preview',body,async()=>({...event,startsAt:'2026-10-28T12:00:00Z'}),now)).rejects.toThrow(/past/i);
  });
});
