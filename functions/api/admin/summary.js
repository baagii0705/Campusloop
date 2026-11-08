import {binding,response,requireAdmin} from '../../../sponsor-api-utils.js';
export async function onRequestGet(context){
 if(!await requireAdmin(context.request))return response({error:'Админ эрх шаардлагатай.'},403);
 try{
  const db=binding(context),tables={vip:'vip_requests',clubs:'society_clubs',events:'society_events',deals:'student_deal_requests',sponsors:'sponsor_requests'};
  const keys=Object.keys(tables),results=await db.batch(keys.map(key=>db.prepare("SELECT COUNT(*) AS count FROM "+tables[key]+" WHERE status='pending'")));
  const pending=Object.fromEntries(keys.map((key,i)=>[key,Number(results[i].results?.[0]?.count||0)]));
  return response({pending,updated_at:new Date().toISOString()});
 }catch{return response({error:'Хүсэлтийн тоог ачаалж чадсангүй. Хэсгүүдийг тус тусад нь нээж болно.'},503)}
}
