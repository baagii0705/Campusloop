import {binding,response,originOK,readJSON,verifiedUser} from '../../../sponsor-api-utils.js';
export async function onRequestGet(c){
 try{
 const mode=new URL(c.request.url).searchParams.get('mode');
 if(mode==='admin'){const user=await verifiedUser(c.request);if(!user?.admin)return response({error:'Админ эрх шаардлагатай.'},403);return response({items:(await binding(c).prepare("SELECT * FROM vip_requests ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END,requested_at DESC LIMIT 100").all()).results})}
 if(mode==='mine'){const user=await verifiedUser(c.request);if(!user)return response({error:'Нэвтэрнэ үү.'},401);return response({items:(await binding(c).prepare("SELECT listing_id,status,requested_at,expires_at FROM vip_requests WHERE owner_id=? ORDER BY requested_at DESC LIMIT 100").bind(user.id).all()).results})}
 return response({items:(await binding(c).prepare("SELECT listing_id,expires_at FROM vip_requests WHERE status='active' AND expires_at>? ORDER BY requested_at DESC LIMIT 100").bind(new Date().toISOString()).all()).results});
 }catch{return response({error:'VIP мэдээлэл түр ачаалагдсангүй.'},503)}
}
export async function onRequestPost(c){
 if(!originOK(c.request))return response({error:'Энэ сайтаас илгээнэ үү.'},403);
 const user=await verifiedUser(c.request);if(!user)return response({error:'Нэвтэрнэ үү.'},401);
 try{
 const input=await readJSON(c.request);const id=String(input.id||'');if(!/^[a-zA-Z0-9_-]{1,70}$/.test(id))return response({error:'Зарын дугаар буруу.'},400);
 const db=binding(c),now=new Date().toISOString();
 if(input.action==='approve'||input.action==='reject'){
 if(!user.admin)return response({error:'Админ эрх шаардлагатай.'},403);
 const days=Number(input.days);if(input.action==='approve'&&![3,7,14,30].includes(days))return response({error:'Хугацаагаа сонгоно уу.'},400);
 const result=await db.prepare("UPDATE vip_requests SET status=?,expires_at=? WHERE listing_id=? AND status='pending'").bind(input.action==='approve'?'active':'rejected',input.action==='approve'?new Date(Date.now()+days*86400000).toISOString():null,id).run();
 return result.meta?.changes?response({ok:true}):response({error:'Хүсэлт өмнө шийдэгдсэн байна.'},409);
 }
 if(input.action==='stop'){
 if(!user.admin)return response({error:'Админ эрх шаардлагатай.'},403);
 await db.prepare("UPDATE vip_requests SET status='rejected',expires_at=NULL WHERE listing_id=?").bind(id).run();return response({ok:true});
 }
 if(input.action!=='request')return response({error:'Үйлдэл буруу.'},400);
 const r=await fetch('https://sgp.cloud.appwrite.io/v1/databases/public/collections/listings/documents/'+encodeURIComponent(id),{headers:{'X-Appwrite-Project':'6ae367b80007a4d31918'},signal:AbortSignal.timeout(9000)});
 if(!r.ok)return response({error:'Нийтэд харагдах зар олдсонгүй.'},404);
 const listing=await r.json();if(listing.user_id!==user.id)return response({error:'Зөвхөн өөрийн зарыг онцолно.'},403);
 if(listing.status==='sold')return response({error:'Зарагдсан зарыг онцлох боломжгүй.'},400);
 const old=await db.prepare('SELECT status,expires_at FROM vip_requests WHERE listing_id=?').bind(id).first();
 if(old&&(old.status==='pending'||old.status==='active'&&old.expires_at>now))return response({error:'Энэ зарын VIP хүсэлт хүлээгдэж байгаа эсвэл идэвхтэй байна.'},409);
 await db.prepare("INSERT INTO vip_requests(listing_id,owner_id,title,requested_at,status) VALUES(?,?,?,?,'pending') ON CONFLICT(listing_id) DO UPDATE SET owner_id=excluded.owner_id,title=excluded.title,requested_at=excluded.requested_at,status='pending',expires_at=NULL").bind(id,user.id,String(listing.title||'Зар').slice(0,120),now).run();return response({ok:true},201);
 }catch{return response({error:'Үйлдэл амжилтгүй. Дахин оролдоно уу.'},503)}
}
