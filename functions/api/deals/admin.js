import {response,binding,requireAdmin,originOK,readJSON,clean} from '../../../sponsor-api-utils.js';
import {DEAL_COLUMN_NAMES} from '../../../student-deals.js';
export async function onRequestGet(context) {
  if(!await requireAdmin(context.request))return response({error:'Админ эрх шаардлагатай.'},403);
  try {
    const results=await binding(context).batch([
      binding(context).prepare("SELECT * FROM student_deal_requests ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END,created_at DESC LIMIT 100"),
      binding(context).prepare('SELECT * FROM student_deals ORDER BY created_at DESC LIMIT 100')
    ]);
    return response({requests:results[0].results||[],deals:results[1].results||[]});
  } catch {return response({error:'Хөнгөлөлтийн удирдлагыг ачаалж чадсангүй.'},503)}
}
export async function onRequestPost(context) {
  if(!originOK(context.request)||!await requireAdmin(context.request))return response({error:'Админ эрх шаардлагатай.'},403);
  try {
    const input=await readJSON(context.request),id=clean(input.id,70),db=binding(context);
    if(!id)return response({error:'Хүсэлтийн дугаар шаардлагатай.'},400);
    if(input.action==='approve') {
      const now=new Date().toISOString();
      const result=await db.batch([
        db.prepare('INSERT INTO student_deals(id,'+DEAL_COLUMN_NAMES+") SELECT id,"+DEAL_COLUMN_NAMES+" FROM student_deal_requests WHERE id=? AND status='pending' AND end_at>? AND NOT EXISTS(SELECT 1 FROM student_deals WHERE id=?)").bind(id,now,id),
        db.prepare("UPDATE student_deal_requests SET status='approved',reviewed_at=? WHERE id=? AND status='pending' AND EXISTS(SELECT 1 FROM student_deals WHERE id=?)").bind(now,id,id)
      ]);
      if(!result[0].meta?.changes)return response({error:'Хүсэлт өмнө шийдвэрлэгдсэн эсвэл хугацаа дууссан.'},409);
      return response({ok:true,id});
    }
    if(input.action==='reject') {
      const result=await db.prepare("UPDATE student_deal_requests SET status='rejected',reviewed_at=? WHERE id=? AND status='pending'").bind(new Date().toISOString(),id).run();
      return result.meta?.changes?response({ok:true}):response({error:'Шийдвэрлэх боломжгүй хүсэлт.'},409);
    }
    if(input.action==='toggle'&&typeof input.active==='boolean') {
      const result=await db.prepare('UPDATE student_deals SET active=? WHERE id=?').bind(input.active?1:0,id).run();
      return result.meta?.changes?response({ok:true}):response({error:'Санал олдсонгүй.'},404);
    }
    return response({error:'Үйлдэл буруу байна.'},400);
  } catch {return response({error:'Өөрчлөлтийг хадгалж чадсангүй.'},400)}
}
