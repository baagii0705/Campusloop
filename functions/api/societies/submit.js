import {binding,response,originOK,readJSON,verifiedUser,clean} from '../../../sponsor-api-utils.js';
import {societyFields,tableFor} from '../../../societies-data.js';
export async function onRequestPost(context){
 if(!originOK(context.request))return response({error:'Энэ сайтаас хүсэлт илгээнэ үү.'},403);
 if(!context.request.headers.get('Content-Type')?.startsWith('application/json'))return response({error:'JSON хүсэлт шаардлагатай.'},415);
 const user=await verifiedUser(context.request);
 if(!user)return response({error:'Клуб, эвент нэмэхийн тулд нэвтэрнэ үү.'},401);
 let input,fields;
 try{input=await readJSON(context.request,12000);fields=societyFields(input.kind,input)}catch(e){return response({error:e.message},400)}
 try{
  const db=binding(context),table=tableFor(input.kind),now=new Date().toISOString();
  if(input.kind==='event'&&fields.club_id){
   const club=await db.prepare("SELECT owner_id FROM society_clubs WHERE id=? AND status='published'").bind(fields.club_id).first();
   if(!club||(!user.admin&&club.owner_id!==user.id))return response({error:'Өөрийн нийтлэгдсэн клубийг сонгоно уу.'},403);
  }
  const keys=Object.keys(fields),id=crypto.randomUUID();
  const result=await db.prepare('INSERT INTO '+table+'(id,owner_id,created_at,'+keys.join(',')+') SELECT '+Array(keys.length+3).fill('?').join(',')+" WHERE (SELECT COUNT(*) FROM "+table+" WHERE owner_id=? AND created_at>=?)<10").bind(id,user.id,now,...keys.map(k=>fields[k]),user.id,new Date(Date.now()-86400000).toISOString()).run();
  if(!result.meta?.changes)return response({error:'24 цагт 10 хүртэл хүсэлт илгээх боломжтой.'},429);
  return response({ok:true,id,status:'pending'},201);
 }catch{return response({error:'Хүсэлтийг хадгалж чадсангүй. Дахин оролдоно уу.'},503)}
}
export async function onRequestPatch(context){
 if(!originOK(context.request))return response({error:'Энэ сайтаас хүсэлт илгээнэ үү.'},403);
 const user=await verifiedUser(context.request);
 if(!user)return response({error:'Эхлээд нэвтэрнэ үү.'},401);
 try{
  const input=await readJSON(context.request),table=tableFor(input.kind),id=clean(input.id,70);
  if(!table||!id||input.action!=='withdraw')return response({error:'Үйлдэл буруу байна.'},400);
  const status=input.kind==='club'?'archived':'cancelled';
  const result=await binding(context).prepare('UPDATE '+table+" SET status=? WHERE id=? AND owner_id=? AND status IN ('pending','published')").bind(status,id,user.id).run();
  return result.meta?.changes?response({ok:true}):response({error:'Өөрчлөх эрхгүй эсвэл хүсэлт өмнө хаагдсан байна.'},409);
 }catch{return response({error:'Хүсэлтийг хааж чадсангүй.'},503)}
}
