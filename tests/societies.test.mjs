import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {societyFields,societyQuery,publicSociety} from '../societies-data.js';
import {eventCalendar} from '../event-calendar.js';
import {onRequestGet as list} from '../functions/api/societies/index.js';
import {onRequestGet as mine} from '../functions/api/societies/mine.js';
import {onRequestPost as submit,onRequestPatch as withdraw} from '../functions/api/societies/submit.js';
import {onRequestPost as moderate,onRequestGet as adminGet} from '../functions/api/societies/admin.js';
import {onRequestGet as calendar} from '../functions/api/societies/calendar.js';
const day=86400000;
const club={kind:'club',name:'Код клуб',school:'ШУТИС',category:'Технологи',summary:'Хамтдаа төсөл хийдэг оюутны клуб.',description:'Оюутнууд долоо хоног бүр цуглаж шинэ санаагаа бодит төсөл болгоно.',join_url:'https://example.com/club'};
const event={kind:'event',title:'Төслийн уулзалт',school:'ШУТИС',category:'Технологи',description:'Хамтдаа шинэ төслүүдээ танилцуулж, баг бүрдүүлэн ажиллана.',location:'Сургуулийн 101 тоот',starts_at:new Date(Date.now()+day).toISOString(),ends_at:new Date(Date.now()+day+3600000).toISOString(),registration_url:'https://example.com/join',price_note:'Үнэгүй'};
const tokens={owner:'owner_user_jwt_of_sufficient_length',other:'other_user_jwt_of_sufficient_length',admin:'admin_user_jwt_of_sufficient_length'};
const request=(path='',data,role,method=data?'POST':'GET')=>new Request('https://sol1o.me/api/societies'+path,{method,headers:{'Content-Type':'application/json',...(role?{Authorization:'Bearer '+tokens[role]}:{})},...(data?{body:JSON.stringify(data)}:{})});
async function fixture(t){
 let DatabaseSync;try{({DatabaseSync}=await import('node:sqlite'))}catch{t.skip('SQLite integration requires Node 22+');return null}
 const sql=new DatabaseSync(':memory:');sql.exec(await readFile(new URL('../migrations/002-clubs-events.sql',import.meta.url),'utf8'));
 const statement=(text,params=[])=>({bind(...values){return statement(text,values)},first:async()=>sql.prepare(text).get(...params),all:async()=>({results:sql.prepare(text).all(...params)}),run:async()=>({meta:sql.prepare(text).run(...params)}),execute:async()=>/^\s*SELECT/i.test(text)?{results:sql.prepare(text).all(...params)}:{meta:sql.prepare(text).run(...params)}});
 const db={prepare:statement,batch:async queries=>{sql.exec('BEGIN');try{const results=[];for(const q of queries)results.push(await q.execute());sql.exec('COMMIT');return results}catch(e){sql.exec('ROLLBACK');throw e}}};
 const original=globalThis.fetch;globalThis.fetch=async(input,init)=>{assert.equal(String(input),'https://sgp.cloud.appwrite.io/v1/account');const token=init.headers['X-Appwrite-JWT'];const role=Object.keys(tokens).find(k=>tokens[k]===token);return role?Response.json({$id:role,labels:role==='admin'?['admin']:[]}):new Response('',{status:401})};
 t.after(()=>{globalThis.fetch=original;sql.close()});
 const context=request=>({request,env:{SPONSOR_DB:db}});
 const create=async(data,role='owner')=>{const res=await submit(context(request('/submit',data,role)));assert.equal(res.status,201,JSON.stringify(await res.clone().json()));return (await res.json()).id};
 const review=(kind,id,action='approve')=>moderate(context(request('/admin',{kind,id,action,note:'Хянасан'},'admin')));
 return {sql,context,create,review};
}
test('club and event fields validate dates, URLs and text while ignoring owner and approval claims',()=>{
 const fields=societyFields('club',{...club,owner_id:'admin',status:'published'});assert.equal(fields.owner_id,undefined);assert.equal(fields.status,undefined);assert.ok(fields.search_text.includes('код клуб'));
 assert.throws(()=>societyFields('club',{...club,join_url:'javascript:alert(1)'}));assert.throws(()=>societyFields('event',{...event,starts_at:'2000-01-01'}));assert.throws(()=>societyFields('event',{...event,ends_at:event.starts_at}));assert.throws(()=>societyFields('event',{...event,price_note:''}));assert.throws(()=>societyFields('other',club));
 assert.equal(publicSociety('club',{...club,id:'x',owner_id:'private',review_note:'private'}).owner_id,undefined);
});
test('public query binds search, school and saved IDs instead of concatenating them into SQL',()=>{
 const url=new URL('https://sol1o.me/api/societies?kind=club&school='+encodeURIComponent('ШУТИС')+'&q='+encodeURIComponent("%' OR 1=1 --")+'&ids=abc,def');const q=societyQuery(url);assert.ok(!q.sql.includes('ШУТИС'));assert.ok(!q.sql.includes('OR 1=1'));assert.match(q.sql,/id IN \(\?,\?\)/);assert.ok(q.params.includes('abc'));assert.ok(q.params.some(p=>String(p).includes('\\%')));assert.throws(()=>societyQuery(new URL('https://sol1o.me/?kind=secrets')));
});
test('guests and ordinary users cannot moderate; foreign origin submissions fail before auth or DB',async()=>{
 assert.equal((await submit({request:request('/submit',club)})).status,401);assert.equal((await mine({request:request('/mine')})).status,401);assert.equal((await adminGet({request:request('/admin')})).status,403);
 const forged=new Request('https://sol1o.me/api/societies/submit',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:JSON.stringify(club)});assert.equal((await submit({request:forged})).status,403);
});
test('pending club submissions are private and moderation publishes only safe fields',async t=>{
 const f=await fixture(t);if(!f)return;const id=await f.create({...club,owner_id:'other',status:'published'});const stored=f.sql.prepare('SELECT * FROM society_clubs WHERE id=?').get(id);assert.equal(stored.owner_id,'owner');assert.equal(stored.status,'pending');
 assert.equal((await (await list(f.context(request('?kind=club')))).json()).items.length,0);assert.equal((await list(f.context(request('?kind=club&id='+id)))).status,404);
 assert.equal((await moderate(f.context(request('/admin',{kind:'club',id,action:'approve'},'owner')))).status,403);
 assert.equal((await f.review('club',id)).status,200);assert.equal((await f.review('club',id)).status,409);
 const data=await (await list(f.context(request('?kind=club&q='+encodeURIComponent('КОД'))))).json();assert.equal(data.items.length,1);assert.equal(data.items[0].owner_id,undefined);assert.equal(data.items[0].review_note,undefined);
 const own=await (await mine(f.context(request('/mine',undefined,'owner')))).json();assert.equal(own.clubs.length,1);assert.equal((await (await mine(f.context(request('/mine',undefined,'other')))).json()).clubs.length,0);
});
test('club ownership, date filters, calendar visibility and withdrawal govern events',async t=>{
 const f=await fixture(t);if(!f)return;const clubId=await f.create(club);await f.review('club',clubId);
 assert.equal((await submit(f.context(request('/submit',{...event,club_id:clubId},'other')))).status,403);
 const id=await f.create({...event,club_id:clubId});assert.equal((await calendar(f.context(request('/calendar?id='+id)))).status,404);await f.review('event',id);
 let items=(await (await list(f.context(request('?kind=event&scope=week')))).json()).items;assert.equal(items.length,1);assert.equal(items[0].club_name,club.name);assert.equal((await (await list(f.context(request('?kind=event&school='+encodeURIComponent('МУИС'))))).json()).items.length,0);assert.equal((await (await list(f.context(request('?kind=event&scope=past')))).json()).items.length,0);
 const ics=await calendar(f.context(request('/calendar?id='+id)));assert.equal(ics.status,200);assert.match(ics.headers.get('Content-Type'),/text\/calendar/);assert.match(await ics.text(),/DTSTART:\d{8}T\d{6}Z/);
 assert.equal((await withdraw(f.context(request('/submit',{kind:'club',id:clubId,action:'withdraw'},'other','PATCH')))).status,409);assert.equal((await withdraw(f.context(request('/submit',{kind:'club',id:clubId,action:'withdraw'},'owner','PATCH')))).status,200);
 assert.equal((await (await list(f.context(request('?kind=event')))).json()).items.length,0);assert.equal((await calendar(f.context(request('/calendar?id='+id)))).status,404);
});
test('expired events cannot be approved, and rejected requests remain visible only to their owner',async t=>{
 const f=await fixture(t);if(!f)return;const id=await f.create(event);f.sql.prepare('UPDATE society_events SET starts_at=?,ends_at=? WHERE id=?').run('2000-01-01T00:00:00.000Z','2000-01-02T00:00:00.000Z',id);assert.equal((await f.review('event',id)).status,409);assert.equal((await f.review('event',id,'reject')).status,200);
 const data=await (await mine(f.context(request('/mine',undefined,'owner')))).json();assert.equal(data.events[0].status,'rejected');assert.equal(data.events[0].review_note,'Хянасан');assert.equal((await list(f.context(request('?kind=event&id='+id)))).status,404);
});
test('submission rate limit is enforced per verified owner with SQL',async t=>{
 const f=await fixture(t);if(!f)return;for(let i=0;i<10;i++)await f.create({...club,name:'Клуб '+i});assert.equal((await submit(f.context(request('/submit',club,'owner')))).status,429);assert.equal((await submit(f.context(request('/submit',club,'other')))).status,201);
});
test('calendar folds Mongolian text to 75-byte lines and escapes calendar injection',()=>{
 const result=eventCalendar({...event,id:'test',title:'Миний эвент '.repeat(20),description:'text\nBEGIN:VEVENT;bad,\\x'});for(const line of result.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75);assert.equal((result.match(/\r\nBEGIN:VEVENT\r\n/g)||[]).length,1);assert.match(result,/\\nBEGIN:VEVENT\\;bad\\,\\\\x/);assert.ok(result.endsWith('END:VCALENDAR\r\n'));
});
