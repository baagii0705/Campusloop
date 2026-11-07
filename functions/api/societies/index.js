import {binding,response} from '../../../sponsor-api-utils.js';
import {societyQuery,publicSociety} from '../../../societies-data.js';
export async function onRequestGet(context){
 let query;try{query=societyQuery(new URL(context.request.url))}catch{return response({error:'Мэдээллийн төрөл буруу байна.'},400)}
 try{
  const rows=await binding(context).prepare(query.sql).bind(...query.params).all();
  if(query.id)return rows.results?.[0]?response({item:publicSociety(query.kind,rows.results[0])}):response({error:'Мэдээлэл олдсонгүй эсвэл нийтлэгдээгүй байна.'},404);
  return response({items:(rows.results||[]).slice(0,24).map(row=>publicSociety(query.kind,row)),has_more:(rows.results||[]).length>24});
 }catch{return response({error:'Клуб, эвентийн мэдээллийг ачаалж чадсангүй. Дахин оролдоно уу.'},503)}
}
