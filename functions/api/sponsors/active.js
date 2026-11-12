import {response,binding} from '../../../sponsor-api-utils.js';
export async function onRequestGet(context){
 try{
  const db=binding(context);const now=new Date().toISOString();
  const rows=await db.prepare('SELECT id,company,image_url,target_url,start_at,end_at,placement FROM sponsor_campaigns WHERE active=1 AND (start_at IS NULL OR start_at<=?) AND (end_at IS NULL OR end_at>?) ORDER BY created_at DESC LIMIT 50').bind(now,now).all();
  return Response.json({campaigns:rows.results||[]},{headers:{'Cache-Control':'public,max-age=20','X-Content-Type-Options':'nosniff'}});
 }catch{return response({error:'Сурталчилгааг түр ачаалах боломжгүй'},503)}
}
