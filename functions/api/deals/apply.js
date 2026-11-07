import {response,binding,originOK,readJSON,clean} from '../../../sponsor-api-utils.js';
import {dealFields,DEAL_COLUMN_NAMES} from '../../../student-deals.js';
export async function onRequestPost(context) {
  const {request}=context;
  if(!originOK(request))return response({error:'Энэ сайтаас хүсэлт илгээнэ үү.'},403);
  if(!String(request.headers.get('Content-Type')||'').startsWith('application/json'))return response({error:'JSON хүсэлт шаардлагатай.'},415);
  try {
    const input=await readJSON(request,10000);
    if(input.website)return response({ok:true,status:'pending'});
    const fields=dealFields(input),contact_name=clean(input.contact_name,100),email=clean(input.email,254).toLowerCase(),phone=clean(input.phone,40);
    if(contact_name.length<2||!/^\S+@\S+\.\S+$/.test(email))return response({error:'Холбоо барих хүний нэр, имэйлийг шалгана уу.'},400);
    const db=binding(context);
    const recent=await db.prepare("SELECT COUNT(*) AS count FROM student_deal_requests WHERE email=? AND datetime(created_at)>=datetime('now','-24 hours')").bind(email).first();
    if(Number(recent?.count)>=3)return response({error:'Энэ имэйлээс 24 цагт 3 хүсэлт илгээх боломжтой.'},429);
    const id=crypto.randomUUID(),keys=DEAL_COLUMN_NAMES.split(',');
    await db.prepare('INSERT INTO student_deal_requests(id,contact_name,email,phone,'+DEAL_COLUMN_NAMES+') VALUES('+Array(15).fill('?').join(',')+')').bind(id,contact_name,email,phone,...keys.map(key=>fields[key])).run();
    return response({ok:true,id,status:'pending'},201);
  } catch(error){return response({error:error?.message==='SPONSOR_DB binding missing'?'Үйлчилгээ түр ашиглах боломжгүй.':String(error?.message||'Хүсэлт илгээж чадсангүй.')},error?.message==='SPONSOR_DB binding missing'?503:400)}
}
