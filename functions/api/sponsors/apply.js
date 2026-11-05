import {response,originOK,readJSON,clean,safeURL,safeDate,checkDateRange,binding} from '../../../sponsor-api-utils.js';
export async function onRequestPost({request,env}){
 if(!originOK(request))return response({error:'Энэ сайтаас хүсэлт илгээнэ үү'},403);
 if(!String(request.headers.get('Content-Type')||'').startsWith('application/json'))return response({error:'JSON хүсэлт шаардлагатай'},415);
 try{
  const input=await readJSON(request);
  // Honeypot for simple automated form submissions.
  if(input.website)return response({ok:true,status:'pending'});
  const company=clean(input.company,100),contact_name=clean(input.contact_name,100),email=clean(input.email,254).toLowerCase(),phone=clean(input.phone,40),message=clean(input.message,1500);
  const image_url=safeURL(input.image_url,true),target_url=safeURL(input.target_url,true);
  const start_at=safeDate(input.start_at),end_at=safeDate(input.end_at);checkDateRange(start_at,end_at);
  if(company.length<2||contact_name.length<2||!/^\S+@\S+\.\S+$/.test(email)||!phone&&email.length<5||image_url===null||target_url===null)return response({error:'Байгууллагын нэр, холбоо барих хүн, имэйл болон HTTPS холбоосуудыг шалгана уу'},400);
  if(!phone&&!email)return response({error:'Холбоо барих мэдээлэл оруулна уу'},400);
  const db=binding({env});
  const recent=await db.prepare("SELECT COUNT(*) AS count FROM sponsor_requests WHERE email=? AND datetime(created_at) >= datetime('now','-24 hours')").bind(email).first();
  if((recent?.count||0)>=3)return response({error:'Энэ имэйлээс 24 цагт 3-аас олон хүсэлт илгээх боломжгүй'},429);
  const id=crypto.randomUUID();
  await db.prepare('INSERT INTO sponsor_requests(id,company,contact_name,email,phone,message,image_url,target_url,start_at,end_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,company,contact_name,email,phone,message,image_url,target_url,start_at,end_at).run();
  return response({ok:true,id,status:'pending'},201);
 }catch(e){return response({error:e?.message==='SPONSOR_DB binding missing'?'Систем түр ашиглах боломжгүй':String(e?.message||'Түр алдаа гарлаа')},e?.message==='SPONSOR_DB binding missing'?503:400)}
}
