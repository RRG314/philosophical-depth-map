import {describe,it,expect} from 'vitest';
import worker,{Limits,type Env} from '../server/worker';
const env={ALLOWED_ORIGINS:'https://example.test',DAILY_CALL_CAP:'2',PER_IP_CAP:'1',DAILY_TOKEN_CAP:'80000'} as Env;
const call=(path:string,init?:RequestInit,e=env)=>worker.fetch(new Request('https://api.test'+path,init),e);
describe('worker fail-closed routes',()=>{
 it('health does not imply configured AI or research',async()=>expect(await (await call('/health')).json()).toMatchObject({aiConfigured:false,researchEnabled:false}));
 it('rejects other origins and research writes',async()=>{expect((await call('/guide',{method:'POST',headers:{Origin:'https://bad.test'}})).status).toBe(403);expect((await call('/research',{method:'POST',headers:{Origin:'https://example.test'}})).status).toBe(503);});
 it('reports missing credentials honestly',async()=>expect((await call('/guide',{method:'POST',headers:{Origin:'https://example.test'}})).status).toBe(503));
 it('enforces per-IP and shared token reservations',async()=>{const map=new Map<string,unknown>();const tx={get:async(k:string)=>structuredClone(map.get(k)),put:async(k:string,v:unknown)=>{map.set(k,structuredClone(v));}};const state={storage:{transaction:async(fn:(t:typeof tx)=>unknown)=>fn(tx),setAlarm:async()=>{},deleteAll:async()=>map.clear()}} as unknown as DurableObjectState;const limits=new Limits(state,env);const reserve=async(ip:string)=>await(await limits.fetch(new Request('https://internal',{method:'POST',body:JSON.stringify({ip})}))).json() as {allowed:boolean};expect((await reserve('a')).allowed).toBe(true);expect((await reserve('a')).allowed).toBe(false);expect((await reserve('b')).allowed).toBe(true);expect((await reserve('c')).allowed).toBe(false);});
});
