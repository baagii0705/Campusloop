// Local-only Pages preview: disposable SQLite; preview fixtures never reach production.
import http from 'node:http';
import {readFile,stat,readdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {onRequestGet as campus} from '../functions/api/campus.js';
import {onRequestGet as offer,onRequestHead as offerHead} from '../functions/deals/[id].js';
import {onRequestGet as deals} from '../functions/api/deals/index.js';
import {onRequestPost as apply} from '../functions/api/deals/apply.js';
import {onRequestGet as adminGet,onRequestPost as adminPost} from '../functions/api/deals/admin.js';
import {onRequestGet as societies} from '../functions/api/societies/index.js';
import {onRequestGet as societyMine} from '../functions/api/societies/mine.js';
import {onRequestPost as societySubmit,onRequestPatch as societyWithdraw} from '../functions/api/societies/submit.js';
import {onRequestGet as societyAdmin,onRequestPost as societyReview} from '../functions/api/societies/admin.js';
import {onRequestGet as calendar} from '../functions/api/societies/calendar.js';
import {onRequestGet as vipGet,onRequestPost as vipPost} from '../functions/api/vip/index.js';
import {onRequestGet as summary} from '../functions/api/admin/summary.js';
import {onRequestGet as sponsorsAdminGet,onRequestPost as sponsorsAdminPost} from '../functions/api/sponsors/admin.js';
import {onRequestGet as sponsorsActive} from '../functions/api/sponsors/active.js';
import {onRequestPost as sponsorsApply} from '../functions/api/sponsors/apply.js';
import {onRequestPost as sponsorsEvent} from '../functions/api/sponsors/event.js';
import {societyFields} from '../societies-data.js';
const sqlite=new DatabaseSync(':memory:');
for(const name of (await readdir('migrations')).filter(n=>n.endsWith('.sql')).sort())sqlite.exec(await readFile('migrations/'+name,'utf8'));
function statement(sql,params=[]){return {
 bind(...values){return statement(sql,values)},
 all:async()=>({results:sqlite.prepare(sql).all(...params)}),
 first:async()=>sqlite.prepare(sql).get(...params),
 run:async()=>({meta:sqlite.prepare(sql).run(...params)}),
 execute:async()=>/^\s*SELECT/i.test(sql)?{results:sqlite.prepare(sql).all(...params)}:{meta:sqlite.prepare(sql).run(...params)}
}}
const db={prepare:statement,batch:async statements=>{sqlite.exec('BEGIN');try{const out=[];for(const entry of statements)out.push(await entry.execute());sqlite.exec('COMMIT');return out}catch(e){sqlite.exec('ROLLBACK');throw e}}};
let fixtures=false;
function seedPreview(){
 if(fixtures)return;fixtures=true;
 const previewId='local-example';
 const columns='id,company,title,benefit,conditions,category,school,location,code,target_url,start_at,end_at';
 const sample=[previewId,'Туршилтын кафе','Оюутны үнэмлэхтэй бол кофе хямд','15% хөнгөлөлт','Үнэмлэхээ касс дээр үзүүлээрэй. Зөвхөн дотоод туршилтын жишээ.','Хоол, кофе','','Кампусын дэргэд','LOCAL15','',new Date(Date.now()-86400000).toISOString(),new Date(Date.now()+14*86400000).toISOString()];
 sqlite.prepare('INSERT INTO student_deal_requests('+columns+",contact_name,email,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,'Preview','local@example.invalid','approved')").run(...sample);
 sqlite.prepare('INSERT INTO student_deals('+columns+') SELECT '+columns+' FROM student_deal_requests WHERE id=?').run(previewId);
 const insert=(kind,id,input)=>{const data=societyFields(kind,input),keys=Object.keys(data);sqlite.prepare('INSERT INTO society_'+(kind==='club'?'clubs':'events')+'(id,owner_id,status,created_at,'+keys.join(',')+') VALUES('+Array(keys.length+4).fill('?').join(',')+')').run(id,'preview-owner','published',new Date().toISOString(),...keys.map(k=>data[k]))};
 insert('club','preview-code',{name:'Код ба кофе',school:'ШУТИС',category:'Технологи',summary:'Хамтдаа жижиг төсөл хийж, санаагаа туршдаг оюутнууд.',description:'Энэ бол зөвхөн дотоод харагдац шалгах жишээ мэдээлэл. Бодит клуб биш.',meeting_info:'Бямба гараг бүр. Шинэ гишүүдэд нээлттэй.',join_url:'https://example.com/club'});
 insert('club','preview-art',{name:'Зургийн дугуйлан',school:'МУИС',category:'Урлаг',summary:'Фото зураг, хотын алхалтад дуртай хүмүүсийн хүрээлэл.',description:'Энэ бол зөвхөн дотоод харагдац шалгах жишээ мэдээлэл. Бодит клуб биш.'});
 const start=new Date(Date.now()+2*86400000),end=new Date(+start+2*3600000);
 insert('event','preview-meet',{title:'Санаагаа төсөл болгох өдөр',school:'ШУТИС',category:'Технологи',club_id:'preview-code',description:'Энэ бол зөвхөн дотоод харагдац шалгах жишээ эвент. Бодит зар биш.\nХамтдаа санаагаа танилцуулж, багийн жижиг төсөл дээр ажиллана.',location:'Сургуулийн 101 тоот',starts_at:start.toISOString(),ends_at:end.toISOString(),price_note:'Үнэгүй',registration_url:'https://example.com/register'});
 insert('event','preview-photo',{title:'Хотын гэрэл — фото алхалт',school:'',category:'Урлаг',club_id:'preview-art',description:'Энэ бол зөвхөн дотоод харагдац шалгах жишээ эвент. Бодит зар биш.',location:'Хотын төв, уулзах цэгийг холбоосоор харна.',starts_at:new Date(+start+86400000).toISOString(),ends_at:new Date(+end+86400000).toISOString(),price_note:'Үнэгүй'});
}
const routes={
 '/api/vip':{GET:vipGet,POST:vipPost},'/api/admin/summary':{GET:summary},
 '/api/sponsors/admin':{GET:sponsorsAdminGet,POST:sponsorsAdminPost},'/api/sponsors/active':{GET:sponsorsActive},'/api/sponsors/apply':{POST:sponsorsApply},'/api/sponsors/event':{POST:sponsorsEvent},
 '/api/campus':{GET:campus},'/api/deals':{GET:deals},'/api/deals/apply':{POST:apply},'/api/deals/admin':{GET:adminGet,POST:adminPost},
 '/api/societies':{GET:societies},'/api/societies/mine':{GET:societyMine},'/api/societies/submit':{POST:societySubmit,PATCH:societyWithdraw},'/api/societies/admin':{GET:societyAdmin,POST:societyReview},'/api/societies/calendar':{GET:calendar}
};
const root=resolve('dist'),types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.txt':'text/plain','.json':'application/json'};
http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://'+req.headers.host);if(url.searchParams.get('demo')==='1')seedPreview();
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const request=new Request(url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})}),context={request,env:{SPONSOR_DB:db}};
  let result;const dealMatch=url.pathname.match(/^\/deals\/([^/]+)\/?$/);
  if(dealMatch)context.params={id:decodeURIComponent(dealMatch[1])};
  const route=dealMatch?{GET:offer,HEAD:offerHead}:routes[url.pathname];
  if(route)result=route[req.method]?await route[req.method](context):new Response('Method not allowed',{status:405});
  else if(url.pathname.startsWith('/api/public/')&&req.method==='GET')result=await fetch('https://sol1o.me'+url.pathname+url.search);
  else if(url.pathname.startsWith('/api/'))result=new Response('Unknown local API',{status:404});
  if(result){res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));return}
  const path=resolve(root,url.pathname==='/partners'||url.pathname==='/partners/'?'partners.html':'.'+decodeURIComponent(url.pathname));if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403);res.end();return}
  const file=(await stat(path)).isDirectory()?resolve(path,'index.html'):path;
  res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');let content=await readFile(file);
  if(file.endsWith('index.html')&&url.searchParams.get('demo')==='1')content=Buffer.from(content.toString().replace('</body>','<aside style="position:fixed;right:8px;bottom:90px;z-index:2000;background:#fff4bd;border:1px solid #b69744;padding:8px;font:11px monospace">LOCAL PREVIEW · SAMPLE DATA</aside></body>'));
  res.end(content);
 }catch(error){console.error('Preview:',error.message);res.writeHead(404);res.end('Not found')}
}).listen(Number(process.env.PORT)||4173,'0.0.0.0');
