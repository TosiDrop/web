import { describe, expect, it } from 'vitest';
import { onRequestGet, onRequestPost } from '../rewardReminders';
import { calendarDb } from '../../services/__tests__/calendarDb';
import type { Env } from '../../types/env';
function ctx(request:Request,env:Partial<Env>) {return {request,env} as Parameters<typeof onRequestPost>[0];}
describe('reminder API configuration and request boundary',()=>{
  it('returns an honest unconfigured state and refuses enrollment',async()=>{
    const get=await onRequestGet(ctx(new Request('https://app.example/api/rewardReminders'),{}));
    expect(await get.json()).toEqual({available:false,publicKey:null});
    const post=await onRequestPost(ctx(new Request('https://app.example/api/rewardReminders',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}),{}));
    expect(post.status).toBe(503);
  });
  it('allows capability removal when push sending is disabled, without exposing stored subscription data',async()=>{
    const {db}=calendarDb();
    const response=await onRequestPost(ctx(new Request('https://app.example/api/rewardReminders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'remove',id:'unknown',managementToken:'a'.repeat(64)})}),{DB:db}));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({removed:true});
  });  it('rejects a wrong capability for a present row and confirms removal after server cleanup',async()=>{
    const {db,sqlite}=calendarDb();
    sqlite.exec("INSERT INTO reward_reminders(id,network,event_id,offset_minutes,subscription,subscription_hash,management_hash,scheduled_at,next_attempt_at,created_at) VALUES('r1','preview','announcement:1',0,'{}','sub','storedhash','2026-10-30T12:00:00.000Z','2026-10-30T12:00:00.000Z','2026-10-29T00:00:00.000Z')");
    const req=()=>new Request('https://app.example/api/rewardReminders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'remove',id:'r1',managementToken:'a'.repeat(64)})});
    expect((await onRequestPost(ctx(req(),{DB:db}))).status).toBe(404);
    sqlite.exec("DELETE FROM reward_reminders WHERE id='r1'");
    const removed=await onRequestPost(ctx(req(),{DB:db}));
    expect(removed.status).toBe(200);expect(await removed.json()).toEqual({removed:true});
  });

});
