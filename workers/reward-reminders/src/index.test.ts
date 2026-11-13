import { describe, expect, it, vi } from 'vitest';
import { Buffer } from 'node:buffer';
import { createECDH } from 'node:crypto';
import webpush from 'web-push';
import { runReminderDelivery, sendWebPush } from './index';
import { calendarDb } from '../../../functions/services/__tests__/calendarDb';
import { enrollReminder } from '../../../functions/services/rewardReminders';
import type { CalendarEvent } from '../../../src/shared/calendar';
const now = new Date('2026-10-29T12:00:00.000Z');
const key = createECDH('prime256v1');key.generateKeys();
const subscription = {endpoint:'https://fcm.googleapis.com/fcm/send/example',keys:{p256dh:Buffer.from(key.getPublicKey()).toString('base64url'),auth:Buffer.alloc(16,1).toString('base64url')}};
const vapid = webpush.generateVAPIDKeys();
const event:CalendarEvent={id:'announcement:1',title:'Reward opens',startsAt:'2026-10-29T12:00:00.000Z',endsAt:null,certainty:'confirmed',kind:'distribution',projectId:'p1',projectName:'Project',tokenId:null,description:'',url:'/calendar?event=announcement%3A1'};
function config(db:D1Database) {return {DB:db,VITE_NETWORK:'preview',REWARD_REMINDERS_ENABLED:'true',VAPID_PUBLIC_KEY:vapid.publicKey,VAPID_PRIVATE_KEY:vapid.privateKey,VAPID_SUBJECT:'mailto:ops@example.com'};}
async function fixture() {
  const {db,sqlite}=calendarDb();
  const saved=await enrollReminder(db,'preview',{eventId:event.id,remindBeforeMinutes:0,subscription,managementToken:'a'.repeat(64)},async()=>event,new Date(now.getTime()-3600_000));
  return {db,sqlite,saved};
}
async function fanout(count:number) {
  const data=await fixture();
  const insert=data.sqlite.prepare("INSERT INTO reward_reminders(id,network,event_id,offset_minutes,subscription,subscription_hash,management_hash,scheduled_at,next_attempt_at,created_at) VALUES(?,'preview',?,0,?,?,?, ?,?,?)");
  for(let i=1;i<count;i++) insert.run(`copy-${i}`,event.id,JSON.stringify({...subscription,endpoint:`https://fcm.googleapis.com/fcm/send/example-${i}`}),`sub-${i}`,'a'.repeat(64),now.toISOString(),now.toISOString(),now.toISOString());
  return data;
}
describe('scheduled reminder delivery',()=>{
  it('encrypts with maintained web-push and uses fetch without redirecting',async()=>{
    const request=vi.fn<typeof fetch>(async(_url,init)=>{
      if(init?.redirect==='error') throw new TypeError('Invalid redirect value: Workers supports follow or manual');
      return new Response(null,{status:201});
    });
    expect(await sendWebPush(subscription,{title:'TosiDrop',body:'Reward opens',url:'/calendar',tag:'reminder:1'},config({} as D1Database),'0123456789abcdef',request)).toBe(201);
    const options=request.mock.calls[0]?.[1];
    if (!options) throw new Error('Expected a transport request');
    expect(options.redirect).toBe('manual');
    expect(new Headers(options.headers).get('Content-Encoding')).toBe('aes128gcm');
    expect(new Headers(options.headers).get('Authorization')).toMatch(/^vapid /);
    expect(options.body).toBeInstanceOf(Uint8Array);
  });
  it('does not follow redirected push destinations and permanently fails that delivery',async()=>{
    const request=vi.fn<typeof fetch>(async()=>new Response(null,{status:302,headers:{Location:'https://untrusted.example/push'}}));
    const {db,sqlite}=await fixture();
    await runReminderDelivery(config(db),now,async()=>event,(sub,payload,topic)=>sendWebPush(sub,payload,config(db),topic,request));
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[0]).toBe(subscription.endpoint);
    expect(request.mock.calls[0]?.[1]?.redirect).toBe('manual');
    expect(sqlite.prepare('SELECT state FROM reward_reminders').get()?.state).toBe('failed');
  });
  it('claims atomically and sends a due reminder once across overlapping cron runs',async()=>{
    const {db,sqlite}=await fixture();const send=vi.fn(async(_subscription:unknown,_payload:unknown,_topic:string)=>201);
    await Promise.all([runReminderDelivery(config(db),now,async()=>event,send),runReminderDelivery(config(db),now,async()=>event,send)]);
    await runReminderDelivery(config(db),now,async()=>event,send);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[1]).toMatchObject({url:'/calendar?event=announcement%3A1&date=2026-10-29T12%3A00%3A00.000Z'});
    expect(sqlite.prepare('SELECT state FROM reward_reminders').get()?.state).toBe('sent');
  });
  it('re-resolves edited announcement dates before sending and defers a moved event',async()=>{
    const {db,sqlite}=await fixture();const send=vi.fn(async()=>201);
    await runReminderDelivery(config(db),now,async()=>({...event,startsAt:'2026-10-30T12:00:00.000Z'}),send);
    expect(send).not.toHaveBeenCalled();
    expect(sqlite.prepare('SELECT state, scheduled_at FROM reward_reminders').get()).toMatchObject({state:'pending',scheduled_at:'2026-10-30T12:00:00.000Z'});
  });
  it('retries transient delivery failure with backoff and removes expired subscriptions',async()=>{
    const {db,sqlite}=await fixture();const send=vi.fn().mockResolvedValueOnce(503).mockResolvedValueOnce(410);
    await runReminderDelivery(config(db),now,async()=>event,send);
    const row=sqlite.prepare('SELECT state,next_attempt_at FROM reward_reminders').get()!;
    expect(row.state).toBe('pending');expect(Date.parse(String(row.next_attempt_at))).toBeGreaterThan(now.getTime());
    await runReminderDelivery(config(db),now,async()=>event,send);expect(send).toHaveBeenCalledTimes(1);
    await runReminderDelivery(config(db),new Date(String(row.next_attempt_at)),async()=>event,send);
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM reward_reminders').get()?.count).toBe(0);
  });
  it('recovers expired leases but stops an exhausted interrupted delivery',async()=>{
    const {db,sqlite}=await fixture();const send=vi.fn(async()=>201);
    sqlite.prepare("UPDATE reward_reminders SET state='sending', attempts=5, lease_until=?, lease_token='expired'").run(new Date(now.getTime()-60000).toISOString());
    await runReminderDelivery(config(db),now,async()=>event,send);
    expect(send).not.toHaveBeenCalled();
    expect(sqlite.prepare('SELECT state FROM reward_reminders').get()?.state).toBe('failed');
  });
  it('drains more than twenty eligible reminders when explicitly configured for a verified higher budget',async()=>{
    const {db,sqlite}=await fanout(55);const send=vi.fn(async()=>201);
    await runReminderDelivery({...config(db),REWARD_REMINDERS_MAX_PER_RUN:'200'},now,async()=>event,send);
    expect(send).toHaveBeenCalledTimes(55);
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM reward_reminders WHERE state='pending'").get()?.count).toBe(0);
  });
  it('keeps a free-budget backlog pending and delivers it after an hour rather than dropping it',async()=>{
    const {db,sqlite}=await fanout(35);const send=vi.fn(async()=>201);
    await runReminderDelivery(config(db),now,async()=>event,send);
    expect(send).toHaveBeenCalledTimes(10);
    await runReminderDelivery(config(db),new Date(now.getTime()+2*3600_000),async()=>event,send);
    expect(send).toHaveBeenCalledTimes(20);
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM reward_reminders WHERE state='pending'").get()?.count).toBe(15);
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM reward_reminders WHERE state='failed'").get()?.count).toBe(0);
  });
  it('keeps the ten-per-minute capacity floor when a lower override is supplied',async()=>{
    const {db}=await fanout(15);const send=vi.fn(async()=>201);
    await runReminderDelivery({...config(db),REWARD_REMINDERS_MAX_PER_RUN:'1'},now,async()=>event,send);
    expect(send).toHaveBeenCalledTimes(10);
  });
  it('stops claiming when its wall-clock budget expires and preserves unfinished rows',async()=>{
    const {db,sqlite}=await fanout(55);let clock=0;const send=vi.fn(async()=>{clock+=10000;return 201;});
    await runReminderDelivery({...config(db),REWARD_REMINDERS_MAX_PER_RUN:'200'},now,async()=>event,send,()=>clock);
    expect(send.mock.calls.length).toBeGreaterThan(0);expect(send.mock.calls.length).toBeLessThanOrEqual(7);
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM reward_reminders WHERE state='failed'").get()?.count).toBe(0);
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM reward_reminders WHERE state='pending'").get()?.count).toBe(55-send.mock.calls.length);
  });
  it('expires an explicitly ended event rather than sending an obsolete reminder',async()=>{
    const {db,sqlite}=await fixture();const send=vi.fn(async()=>201);
    await runReminderDelivery(config(db),new Date(now.getTime()+120_000),async()=>({...event,endsAt:'2026-10-29T12:01:00.000Z'}),send);
    expect(send).not.toHaveBeenCalled();expect(sqlite.prepare('SELECT state FROM reward_reminders').get()?.state).toBe('failed');
  });
  it('does not send deleted or unapproved events and stays inert when unconfigured',async()=>{
    const {db,sqlite}=await fixture();const send=vi.fn(async()=>201);
    await runReminderDelivery({...config(db),REWARD_REMINDERS_ENABLED:'false'},now,async()=>event,send);expect(send).not.toHaveBeenCalled();
    await runReminderDelivery(config(db),now,async()=>null,send);expect(send).not.toHaveBeenCalled();
    expect(sqlite.prepare('SELECT state FROM reward_reminders').get()?.state).toBe('failed');
  });
});
