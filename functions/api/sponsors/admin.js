import {response,readJSON,clean,safeURL,safeDate,checkDateRange,requireAdmin,binding,originOK} from '../../../sponsor-api-utils.js';
import {sponsorQuote} from '../../../sponsor-pricing.js';
const LIMIT=100;
const campaignFields=(input,source={})=>{
 const company=clean(input.company??source.company,100);
 const image_url=safeURL(input.image_url??source.image_url);
 const target_url=safeURL(input.target_url??source.target_url);
 const placement=clean(input.placement??source.placement??'both',12);
 const duration_days=Number(input.duration_days??source.duration_days??7);
 const quoted_price=sponsorQuote(placement,duration_days);
 if(quoted_price===null)throw Error('Байршил ба хугацааг зөв сонгоно уу');
 const start_at=safeDate(input.start_at!==undefined?input.start_at:source.start_at)||new Date().toISOString();
 let end_at=safeDate(input.end_at!==undefined?input.end_at:source.end_at);
 if(!end_at)end_at=new Date(Date.parse(start_at)+duration_days*86400000).toISOString();
 checkDateRange(start_at,end_at);
 if(Date.parse(end_at)<=Date.now())throw Error('Дуусах хугацаа ирээдүйд байх ёстой');
 if(company.length<2||!image_url||!target_url)throw Error('Байгууллагын нэр, баннер зураг болон очих HTTPS URL шаардлагатай');
 return {company,image_url,target_url,start_at,end_at,placement,duration_days,quoted_price};
};
export async function onRequestGet(context){
 if(!await requireAdmin(context.request))return response({error:'Админ нэвтрэлт шаардлагатай'},403);
 try{
  const db=binding(context);
  const [requests,campaigns,daily]=await db.batch([
   db.prepare("SELECT * FROM sponsor_requests ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END,created_at DESC LIMIT "+LIMIT),
   db.prepare("SELECT c.*, (SELECT COUNT(*) FROM sponsor_events e WHERE e.campaign_id=c.id AND e.kind='view') AS views, (SELECT COUNT(*) FROM sponsor_events e WHERE e.campaign_id=c.id AND e.kind='click') AS clicks FROM sponsor_campaigns c ORDER BY created_at DESC LIMIT "+LIMIT),
   db.prepare("SELECT campaign_id,day,SUM(CASE WHEN kind='view' THEN 1 ELSE 0 END) AS views,SUM(CASE WHEN kind='click' THEN 1 ELSE 0 END) AS clicks FROM sponsor_events WHERE day >= date('now','-29 days') GROUP BY campaign_id,day ORDER BY day DESC LIMIT 500")
  ]);
  return response({requests:requests.results||[],campaigns:campaigns.results||[],daily:daily.results||[]});
 }catch{return response({error:'Удирдлагын мэдээлэл түр ашиглах боломжгүй'},503)}
}
export async function onRequestPost(context){
 if(!originOK(context.request))return response({error:'Хүсэлт зөвшөөрөгдөөгүй'},403);
 if(!await requireAdmin(context.request))return response({error:'Админ нэвтрэлт шаардлагатай'},403);
 try{
  const input=await readJSON(context.request,10000);
  const action=clean(input.action,30),id=clean(input.id,70);
  const db=binding(context);
  if(action==='approve'){
   const item=await db.prepare("SELECT * FROM sponsor_requests WHERE id=? AND status='pending'").bind(id).first();
   if(!item)return response({error:'Хүсэлт олдсонгүй эсвэл өмнө нь шийдвэрлэгдсэн'},409);
   const c=campaignFields(input,item);
   const recordId=item.id;
   await db.batch([
    db.prepare('INSERT INTO sponsor_campaigns(id,request_id,company,image_url,target_url,active,start_at,end_at,placement,duration_days,quoted_price) VALUES(?,?,?,?,?,1,?,?,?,?,?)').bind(recordId,item.id,c.company,c.image_url,c.target_url,c.start_at,c.end_at,c.placement,c.duration_days,c.quoted_price),
    db.prepare("UPDATE sponsor_requests SET status='approved',reviewed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),campaign_id=?,admin_notes=? WHERE id=? AND status='pending'").bind(recordId,clean(input.admin_notes,500),id)
   ]);
   return response({ok:true,campaign_id:recordId});
  }
  if(action==='reject'){
   const done=await db.prepare("UPDATE sponsor_requests SET status='rejected',reviewed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),admin_notes=? WHERE id=? AND status='pending'").bind(clean(input.admin_notes,500),id).run();
   if(!done.meta?.changes)return response({error:'Шийдвэрлэх боломжгүй хүсэлт'},409);
   return response({ok:true});
  }
  if(action==='create'){
   const c=campaignFields(input);
   const created=crypto.randomUUID();
   await db.prepare('INSERT INTO sponsor_campaigns(id,company,image_url,target_url,active,start_at,end_at,placement,duration_days,quoted_price) VALUES(?,?,?,?,1,?,?,?,?,?)').bind(created,c.company,c.image_url,c.target_url,c.start_at,c.end_at,c.placement,c.duration_days,c.quoted_price).run();
   return response({ok:true,campaign_id:created},201);
  }
  if(action==='toggle'){
   if(typeof input.active!=='boolean')return response({error:'Идэвхтэй төлөв буруу байна'},400);
   const result=await db.prepare("UPDATE sponsor_campaigns SET active=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?").bind(input.active?1:0,id).run();
   if(!result.meta?.changes)return response({error:'Зар олдсонгүй'},404);
   return response({ok:true});
  }
  if(action==='update'){
   const existing=await db.prepare('SELECT * FROM sponsor_campaigns WHERE id=?').bind(id).first();
   if(!existing)return response({error:'Зар олдсонгүй'},404);
   const c=campaignFields(input,existing);
   await db.prepare("UPDATE sponsor_campaigns SET company=?,image_url=?,target_url=?,start_at=?,end_at=?,placement=?,duration_days=?,quoted_price=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?").bind(c.company,c.image_url,c.target_url,c.start_at,c.end_at,c.placement,c.duration_days,c.quoted_price,id).run();
   return response({ok:true});
  }
  return response({error:'Үйлдэл танигдсангүй'},400);
 }catch(e){return response({error:clean(e?.message,240)||'Үйлдэл амжилтгүй'},400)}
}
