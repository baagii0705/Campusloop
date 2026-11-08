import test from 'node:test';import assert from 'node:assert/strict';import {onRequestPost,onRequestGet} from '../functions/api/vip/index.js';
const req=(body,auth=true)=>new Request('https://sol1o.me/api/vip',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+'a'.repeat(30)}:{})},body:JSON.stringify(body)});
test('VIP requires authentication and rejects cross-origin requests',async()=>{assert.equal((await onRequestPost({request:req({id:'one',action:'request'},false)})).status,401);const r=req({});r.headers.set('Origin','https://elsewhere.test');assert.equal((await onRequestPost({request:r})).status,403)});
test('VIP approval is admin-only and validates its duration',async t=>{const original=global.fetch;t.after(()=>global.fetch=original);global.fetch=async()=>Response.json({$id:'owner',labels:[]});assert.equal((await onRequestPost({request:req({id:'one',action:'approve',days:7}),env:{SPONSOR_DB:{}}})).status,403);global.fetch=async()=>Response.json({$id:'admin',labels:['admin']});assert.equal((await onRequestPost({request:req({id:'one',action:'approve',days:999}),env:{SPONSOR_DB:{}}})).status,400)});
test('VIP request cannot promote another seller listing',async t=>{const original=global.fetch;t.after(()=>global.fetch=original);global.fetch=async url=>Response.json(String(url).endsWith('/account')?{$id:'buyer',labels:[]}:{user_id:'seller',title:'Book'});assert.equal((await onRequestPost({request:req({id:'one',action:'request'}),env:{SPONSOR_DB:{}}})).status,403)});
test('public VIP results filter expiry in the database and omit owner information',async()=>{let sql,cutoff;const r=await onRequestGet({request:new Request('https://sol1o.me/api/vip'),env:{SPONSOR_DB:{prepare(s){sql=s;return {bind(now){cutoff=now;return {all:async()=>({results:[]})}}}}}}});assert.equal(r.status,200);assert.match(sql,/expires_at>\?/);assert.match(sql,/status='active'/);assert.doesNotMatch(sql,/owner_id/);assert.ok(Number.isFinite(Date.parse(cutoff)))});

test('publishing with VIP requests promotion only after saving and keeps the listing on VIP failure',async()=>{
 const {readFileSync}=await import('node:fs');const {runInNewContext}=await import('node:vm');const html=readFileSync('index.html','utf8');const source=html.slice(html.indexOf('async function saveListing(id){'),html.indexOf('async function deleteListing('));
 const values={newTitle:'Book title',newPrice:'1000',newSchool:'ШУТИС',newCategory:'Ном',newDesc:'',newPhone:'',newInstagram:'',newMeetingPlace:'',newImage:''};const button={disabled:false,textContent:'Нийтлэх'};let checked=true,saved=0,promoted=0,closed=0,notice='',failVip=false,failSave=false;
 const fn=runInNewContext(source+';saveListing',{document:{getElementById(id){if(id==='postForm')return {querySelector:()=>button};if(id==='postStatus')return {classList:{toggle(){}}};if(id==='newVip')return {checked};if(id==='newImageFile')return {files:[]};return {value:values[id],focus(){},closest(){return null}}}},session:{user:{id:'owner'}},listings:[],localStorage:{setItem(){}},db:{from:()=>({insert:async()=>{if(failSave)return {error:Error('Save failed')};saved++;return {data:{id:'saved-id'},error:null}}})},window:{SolioVIP:{submitRequest:async id=>{assert.equal(saved>0,true);assert.equal(id,'saved-id');promoted++;if(failVip)throw Error('Offline')}}},closeModal:()=>closed++,toast:t=>notice=t,loadListings:async()=>{}});
 await fn();assert.equal(saved,1);assert.equal(promoted,1);assert.match(notice,/VIP хүсэлт илгээгдлээ/);
 failVip=true;await fn();assert.equal(saved,2);assert.equal(closed,2);assert.match(notice,/Зар нийтлэгдсэн.*илгээгдсэнгүй/);assert.equal(button.disabled,false);
 checked=false;await fn();assert.equal(promoted,2);assert.equal(saved,3);
 checked=true;failSave=true;await fn();assert.equal(promoted,2);assert.equal(saved,3);
});

test('VIP admin is placed above listings, loads pending requests and recovers from errors',async()=>{
 const {readFileSync}=await import('node:fs');const {runInNewContext}=await import('node:vm');
 const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,textContent:'',innerHTML:'',disabled:false});return nodes.get(id)};
 let inserted,fail=false,calls=0;const observers=[];
 node('adminPanel').querySelector=selector=>{assert.equal(selector,'.adminHeader');return {after:element=>inserted=element}};
 runInNewContext(readFileSync('vip.js','utf8'),{
 document:{getElementById:node,createElement:()=>({}),querySelectorAll:()=>[]},
 MutationObserver:class{constructor(fn){observers.push(fn)}observe(){}},setInterval(){},
 window:{},isCampusAdmin:()=>true,escapeHTML:s=>String(s).replaceAll('<','&lt;'),
 appwriteAccount:{createJWT:async()=>({jwt:'test-token'})},
 fetch:async(url,options)=>{if(!url.includes('mode=admin'))return {ok:true,json:async()=>({items:[]})};calls++;assert.equal(options.headers.Authorization,'Bearer test-token');return {ok:!fail,json:async()=>fail?{error:'Offline'}:{items:[{listing_id:'one',title:'<Book>',status:'pending'}]}}}
 });
 const flush=()=>new Promise(resolve=>setImmediate(resolve));await flush();
 assert.equal(inserted.id,'vipAdminPanel');assert.equal(calls,1);assert.match(node('vipRows').innerHTML,/&lt;Book>/);assert.match(node('vipRows').innerHTML,/data-vip="approve"/);assert.match(node('vipPendingCount').textContent,/1 хүлээгдэж буй/);
 fail=true;await node('vipRefresh').onclick();assert.match(node('vipAdminStatus').textContent,/Offline.*Шинэчлэх/);assert.equal(node('vipRefresh').disabled,false);
 fail=false;await node('vipRefresh').onclick();assert.equal(node('vipAdminStatus').textContent,'');
 observers[1]();await flush();assert.equal(calls,4);
});
