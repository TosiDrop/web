import { describe, expect, it, vi } from 'vitest';
import { onRequestGet, onRequestPost } from '../rewardCalendar';
import { calendarDb } from '../../services/__tests__/calendarDb';
import type { Env } from '../../types/env';
vi.mock('../../services/verifyCalendarSignature',()=>({verifyCalendarSignature:vi.fn(async()=>({ok:true}))}));
function context(request:Request, env:Partial<Env>) { return {request,env} as Parameters<typeof onRequestPost>[0]; }
const payload = { ownerAddress:'stake_test1owner',projectId:'p1',eventId:null,announcement:{title:'Rewards open',startsAt:'2026-10-30T12:00:00Z',endsAt:null,description:'Confirmed by owner'},signature:'sig',key:'key',message:'TosiDrop calendar announcement v1\n'+JSON.stringify({signedAt:new Date().toISOString()}) };
function request(body:unknown) { return new Request('https://preview.tosidrop.io/api/rewardCalendar',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://preview.tosidrop.io'},body:JSON.stringify(body)}); }
describe('calendar API',()=>{
  it('rejects unbounded ranges before reading sources',async()=>{
    expect((await onRequestGet(context(new Request('https://preview.tosidrop.io/api/rewardCalendar?from=bad&to=bad'),{}))).status).toBe(400);
  });
  it('only publishes approved project owner announcements and keeps retries idempotent',async()=>{
    const {db,sqlite}=calendarDb();
    sqlite.exec("INSERT INTO projects VALUES('p1','preview','stake_test1owner','pending','Project','token1')");
    expect((await onRequestPost(context(request(payload),{DB:db}))).status).toBe(403);
    sqlite.exec("UPDATE projects SET status='approved'");
    expect((await onRequestPost(context(request({...payload,ownerAddress:'stake_test1other'}),{DB:db}))).status).toBe(403);
    const response=await onRequestPost(context(request(payload),{DB:db}));
    expect(response.status).toBe(201);
    const result=await response.json() as {id:string};
    expect(result.id).toMatch(/^announcement:/);
    const retry=await onRequestPost(context(request(payload),{DB:db}));
    expect(await retry.json()).toEqual(result);
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM reward_announcements').get()?.count).toBe(1);
  });
  it('synchronizes pending reminders when an owner moves an announcement earlier',async()=>{
    const {db,sqlite}=calendarDb();
    sqlite.exec("INSERT INTO projects VALUES('p1','preview','stake_test1owner','approved','Project','token1')");
    const created=await onRequestPost(context(request(payload),{DB:db}));
    const {id}=await created.json() as {id:string};
    sqlite.prepare("INSERT INTO reward_reminders(id,network,event_id,offset_minutes,subscription,subscription_hash,management_hash,scheduled_at,next_attempt_at,created_at) VALUES('r1','preview',?,60,'{}','sub','hash','2026-10-30T11:00:00.000Z','2026-10-30T11:00:00.000Z','2026-10-29T00:00:00.000Z')").run(id);
    const update={...payload,eventId:id,signature:'sig2',message:'TosiDrop calendar announcement v1\n'+JSON.stringify({signedAt:new Date(Date.now()+1000).toISOString()}),announcement:{...payload.announcement,startsAt:'2026-10-30T06:00:00Z'}};
    expect((await onRequestPost(context(request(update),{DB:db}))).status).toBe(200);
    expect(sqlite.prepare('SELECT scheduled_at,next_attempt_at FROM reward_reminders').get()).toMatchObject({scheduled_at:'2026-10-30T05:00:00.000Z',next_attempt_at:'2026-10-30T05:00:00.000Z'});
    const oldCreateReplay=await onRequestPost(context(request(payload),{DB:db}));
    expect(oldCreateReplay.status).toBe(200);expect(await oldCreateReplay.json()).toEqual({id});
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM reward_announcements').get()?.count).toBe(1);
  });
  it('rejects cross-origin writes and over-limit bodies',async()=>{
    const req=request(payload);req.headers.set('Origin','https://evil.example');
    expect((await onRequestPost(context(req,{}))).status).toBe(403);
    expect((await onRequestPost(context(request({...payload,message:'x'.repeat(40000)}),{}))).status).toBe(413);
  });
});
