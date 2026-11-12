import {response,readJSON,originOK,binding,clean} from '../../../sponsor-api-utils.js';
export async function onRequestPost({request,env}){
 if(!originOK(request))return response({error:'Хандалт зөвшөөрөгдөөгүй'},403);
 if(!String(request.headers.get('Content-Type')||'').startsWith('application/json'))return response({error:'Content-Type буруу'},415);
 try{
  const input=await readJSON(request,1024);
  const campaign_id=clean(input.campaign_id,64);
  const session_id=clean(input.session_id,70);
  const kind=clean(input.kind,10);
  if(!/^[a-f0-9-]{36}$/i.test(campaign_id)||!/^[a-f0-9-]{36}$/i.test(session_id)||!['view','click'].includes(kind))return response({error:'Статистикийн мэдээлэл буруу'},400);
  const db=binding({env}),now=new Date().toISOString();
  const eligible=await db.prepare('SELECT id FROM sponsor_campaigns WHERE id=? AND active=1 AND (start_at IS NULL OR start_at<=?) AND (end_at IS NULL OR end_at>?)').bind(campaign_id,now,now).first();
  if(!eligible)return response({ok:false},404);
  const day=now.slice(0,10);
  await db.prepare('INSERT OR IGNORE INTO sponsor_events(campaign_id,day,kind,session_id) VALUES(?,?,?,?)').bind(campaign_id,day,kind,session_id).run();
  return response({ok:true});
 }catch{return response({error:'Статистик түр хадгалагдсангүй'},503)}
}
