import {binding,response,originOK,readJSON,requireAdmin,clean} from '../../../sponsor-api-utils.js';
import {tableFor} from '../../../societies-data.js';
export async function onRequestGet(context){
 if(!await requireAdmin(context.request))return response({error:'Админ эрх шаардлагатай.'},403);
 try{
  const db=binding(context),result=await db.batch([
   db.prepare("SELECT * FROM society_clubs WHERE status IN ('pending','published') ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END,created_at DESC LIMIT 100"),
   db.prepare("SELECT e.*,c.name AS club_name FROM society_events e LEFT JOIN society_clubs c ON c.id=e.club_id WHERE e.status='pending' OR (e.status='published' AND e.ends_at>?) ORDER BY CASE e.status WHEN 'pending' THEN 0 ELSE 1 END,e.starts_at LIMIT 100").bind(new Date().toISOString())
  ]);
  return response({clubs:result[0].results||[],events:result[1].results||[]});
 }catch{return response({error:'Клуб, эвентийн удирдлагыг ачаалж чадсангүй.'},503)}
}
export async function onRequestPost(context){
 if(!originOK(context.request)||!await requireAdmin(context.request))return response({error:'Админ эрх шаардлагатай.'},403);
 try{
  const input=await readJSON(context.request),table=tableFor(input.kind),id=clean(input.id,70),note=clean(input.note,400);
  if(!table||!id||!['approve','reject','close'].includes(input.action))return response({error:'Үйлдэл буруу байна.'},400);
  const now=new Date().toISOString(),status=input.action==='approve'?'published':input.action==='reject'?'rejected':input.kind==='club'?'archived':'cancelled';
  let where=input.action==='close'?"status IN ('pending','published')":"status='pending'";
  if(input.action==='approve'&&input.kind==='event')where+=" AND ends_at>? AND (club_id IS NULL OR EXISTS(SELECT 1 FROM society_clubs c WHERE c.id=club_id AND c.status='published'))";
  const params=[status,note,now,id];if(input.action==='approve'&&input.kind==='event')params.push(now);
  const result=await binding(context).prepare('UPDATE '+table+' SET status=?,review_note=?,reviewed_at=? WHERE id=? AND '+where).bind(...params).run();
  return result.meta?.changes?response({ok:true}):response({error:'Хүсэлт өмнө шийдэгдсэн, хугацаа дууссан эсвэл клуб нь нийтлэгдээгүй байна.'},409);
 }catch{return response({error:'Шийдвэрийг хадгалж чадсангүй.'},503)}
}
