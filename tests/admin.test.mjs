import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {adminStatus,adminItems,filterAdminItems} from '../admin-model.js';
import {onRequestGet} from '../functions/api/admin/summary.js';
const now=Date.parse('2026-11-08T00:00:00Z');
test('admin statuses distinguish expired and scheduled content from active content',()=>{
 for(const kind of ['sponsors','deals','legacy']){
  assert.equal(adminStatus(kind,{active:1,end_at:'2026-01-01'},now),'expired');
  assert.equal(adminStatus(kind,{active:1,start_at:'2027-01-01'},now),'scheduled');
  assert.equal(adminStatus(kind,{active:0,end_at:'2027-01-01'},now),'paused');
  assert.equal(adminStatus(kind,{_request:true,status:'approved'},now),'approved');
 }
 assert.equal(adminStatus('vip',{status:'active',expires_at:'2026-11-07'},now),'expired');
 assert.equal(adminStatus('societies',{kind:'event',status:'published',ends_at:'2026-01-01'},now),'expired');
 assert.equal(adminStatus('reports',{},now),'received');
});
test('admin filtering preserves request and campaign identity and puts pending decisions first',()=>{
 const data=adminItems('deals',{requests:[{id:'one',status:'pending',company:'Кофе',created_at:'2026-01-01'}],deals:[{id:'one',active:1,company:'Кофе',created_at:'2026-12-01',end_at:'2027-01-01'}]});
 const all=filterAdminItems('deals',data,{query:'кофе'},now);assert.equal(all.length,2);assert.equal(all[0]._request,true);assert.equal(all[1]._request,undefined);
 assert.equal(filterAdminItems('deals',data,{status:'pending'},now).length,1);
 assert.equal(filterAdminItems('deals',data,{status:'active'},now).length,1);
 assert.equal(filterAdminItems('deals',data,{query:'none'},now).length,0);
 assert.equal(filterAdminItems('listings',[{title:null,id:'42',school:'ШУТИС'}],{query:'ШУТИС'},now).length,1);
});
test('admin summary denies guests and normal users before reading the database',async t=>{
 let queried=false;const env={SPONSOR_DB:{batch(){queried=true}}};
 assert.equal((await onRequestGet({request:new Request('https://sol1o.me/api/admin/summary'),env})).status,403);
 const old=global.fetch;t.after(()=>global.fetch=old);global.fetch=async()=>Response.json({$id:'member',labels:[]});
 assert.equal((await onRequestGet({request:new Request('https://sol1o.me/api/admin/summary',{headers:{Authorization:'Bearer '+'a'.repeat(30)}}),env})).status,403);assert.equal(queried,false);
});
test('admin summary returns only exact counts with no cached or private application content',async t=>{
 const old=global.fetch;t.after(()=>global.fetch=old);global.fetch=async()=>Response.json({$id:'admin',labels:['admin']});
 const queries=[];const result=await onRequestGet({request:new Request('https://sol1o.me/api/admin/summary',{headers:{Authorization:'Bearer '+'a'.repeat(30)}}),env:{SPONSOR_DB:{prepare(sql){queries.push(sql);return sql},batch:async qs=>qs.map((_,i)=>({results:[{count:i+1}]}))}}});
 assert.equal(result.status,200);assert.equal(result.headers.get('Cache-Control'),'no-store');assert.deepEqual((await result.json()).pending,{vip:1,clubs:2,events:3,deals:4,sponsors:5});assert.equal(queries.length,5);for(const q of queries){assert.match(q,/COUNT\(\*\)/);assert.match(q,/status='pending'/);assert.doesNotMatch(q,/SELECT \*/)}
});
test('admin build is separate from public UI and obsolete managers are gone',async()=>{
 const html=await readFile('index.html','utf8'),vip=await readFile('vip.js','utf8');
 assert.doesNotMatch(html,/adminListingRows|updateAdminReport|renderAdminListings/);assert.doesNotMatch(vip,/vipAdminPanel|mode=admin/);
 for(const file of ['campus-hub.js','societies.js','sponsored-banner.js','sponsor-application.js'])assert.doesNotMatch(await readFile(file,'utf8'),/observe\([^;]*adminPanel|setupAdmin\(|setupManager\(|function loadAdmin\(/);
});

async function adminHarness(){
 const {build}=await import('esbuild');const {runInNewContext}=await import('node:vm');
 let source=await readFile('admin-dashboard.js','utf8');source=source.replace('window.SolioAdmin={open,close};','window.__test={state,load,saveAction,openAction};window.SolioAdmin={open,close};');
 const bundled=await build({stdin:{contents:source,resolveDir:process.cwd(),loader:'js'},bundle:true,write:false,format:'iife'});
 const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,textContent:'',innerHTML:'',dataset:{},classList:{add(){},remove(){},toggle(){}},querySelector:()=>({}),querySelectorAll:()=>[],replaceChildren(){this.innerHTML=''},close(){this.closed=true},focus(){}});return nodes.get(id)};
 let auth;const context={window:{scrollTo(){}},document:{getElementById:node,body:{classList:{add(){},remove(){}}},addEventListener(){}},isCampusAdmin:()=>true,session:{user:{id:'admin'}},escapeHTML:s=>String(s??''),appwriteAuth:{onAuthStateChange:fn=>auth=fn},appwriteAccount:{createJWT:async()=>({jwt:'test-admin-jwt'})},fetch:async()=>({ok:true,json:async()=>({items:[]})}),FormData:class{get(){return '7'}},toast(){},Intl};
 runInNewContext(bundled.outputFiles[0].text,context);const api=context.window.__test;api.state.owner='admin';api.state.tab='vip';return {api,context,node,auth:()=>auth()};
}
test('a closed admin page discards a late authenticated response and clears private content',async()=>{
 const h=await adminHarness();let release;h.context.fetch=()=>new Promise(r=>release=r);h.node('adminContent').innerHTML='Private title';
 const request=h.api.load('vip');await new Promise(r=>setImmediate(r));h.context.window.SolioAdmin.close();release({ok:true,json:async()=>({items:[{title:'Private title'}]})});await request;
 assert.equal(h.node('adminPanel').hidden,true);assert.equal(h.api.state.data.vip,undefined);assert.equal(h.node('adminPanel').innerHTML,'');assert.equal(h.api.state.owner,null);
});
test('admin approval blocks repeated submits, keeps errors visible and retries successfully',async()=>{
 const h=await adminHarness();let writes=0,release;const state=h.api.state;state.action={tab:'vip',action:'approve',item:{listing_id:'listing-1'}};
 h.context.fetch=async(url,options)=>{if(options.method==='POST'){writes++;return new Promise(r=>release=r)}return {ok:true,json:async()=>url.includes('summary')?{pending:{vip:0,clubs:0,events:0,deals:0,sponsors:0}}:{items:[]}}};
 const event={preventDefault(){},currentTarget:{}};const first=h.api.saveAction(event);await new Promise(r=>setImmediate(r));await h.api.saveAction(event);assert.equal(writes,1);
 release({ok:false,json:async()=>({error:'Retry required'})});await first;assert.equal(state.busy,false);assert.equal(h.node('adminAction').closed,undefined);assert.equal(h.node('adminActionError').textContent,'Retry required');
 const second=h.api.saveAction(event);await new Promise(r=>setImmediate(r));release({ok:true,json:async()=>({ok:true})});await second;assert.equal(writes,2);assert.equal(h.node('adminAction').closed,true);assert.equal(state.busy,false);
});

test('summary counts remain exact above list limits against the retained SQLite schema',async t=>{
 const {DatabaseSync}=await import('node:sqlite'),{readdir}=await import('node:fs/promises');const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());
 for(const name of (await readdir('migrations')).filter(n=>n.endsWith('.sql')).sort())sqlite.exec(await readFile('migrations/'+name,'utf8'));
 const insert=sqlite.prepare("INSERT INTO vip_requests(listing_id,owner_id,title,status,requested_at) VALUES(?,'test-owner','Book',?,'2026-11-08')");for(let i=0;i<130;i++)insert.run(String(i),'pending');insert.run('old','rejected');
 const statement=sql=>({all:async()=>({results:sqlite.prepare(sql).all()})});const db={prepare:statement,batch:async xs=>Promise.all(xs.map(x=>x.all()))};
 const old=global.fetch;t.after(()=>global.fetch=old);global.fetch=async()=>Response.json({$id:'admin',labels:['admin']});const req=new Request('https://sol1o.me/api/admin/summary',{headers:{Authorization:'Bearer '+'a'.repeat(30)}});
 const result=await onRequestGet({request:req,env:{SPONSOR_DB:db}});assert.equal(result.status,200);assert.equal((await result.json()).pending.vip,130);
 // Reapplying the baseline is safe and retains existing records.
 sqlite.exec(await readFile('migrations/000-sponsors.sql','utf8'));assert.equal(sqlite.prepare('SELECT count(*) n FROM vip_requests').get().n,131);
});
