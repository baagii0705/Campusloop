import {binding,response,verifiedUser} from '../../../sponsor-api-utils.js';
export async function onRequestGet(context){
 const user=await verifiedUser(context.request);
 if(!user)return response({error:'Эхлээд нэвтэрнэ үү.'},401);
 try{
  const db=binding(context),result=await db.batch([
   db.prepare('SELECT * FROM society_clubs WHERE owner_id=? ORDER BY created_at DESC LIMIT 100').bind(user.id),
   db.prepare('SELECT e.*,c.name AS club_name FROM society_events e LEFT JOIN society_clubs c ON c.id=e.club_id WHERE e.owner_id=? ORDER BY e.created_at DESC LIMIT 100').bind(user.id)
  ]);
  return response({clubs:result[0].results||[],events:result[1].results||[]});
 }catch{return response({error:'Таны хүсэлтүүдийг ачаалж чадсангүй.'},503)}
}
