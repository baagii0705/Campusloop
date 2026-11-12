import {CAMPUS_SECTIONS,readCampusSection} from '../../campus-feed.js';
export async function onRequestGet({request}) {
  const url = new URL(request.url);
  const school = (url.searchParams.get('school') || '').trim();
  const page = Math.max(0,Math.min(100,parseInt(url.searchParams.get('page') || '0',10)||0));
  if (school.length<2 || school.length>180 || /[\u0000-\u001f]/.test(school)) return Response.json({error:'Сургуулиа сонгоно уу.'},{status:400});
  const names=Object.keys(CAMPUS_SECTIONS);
  const results=await Promise.allSettled(names.map(name=>readCampusSection(name,school,page*12)));
  const sections={}, errors=[];
  results.forEach((result,index)=>{
    if(result.status==='fulfilled') sections[names[index]]=result.value;
    else errors.push(names[index]);
  });
  const items=Object.values(sections).flatMap(section=>section.items).sort((a,b)=>b.created_at.localeCompare(a.created_at)||a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id));
  return Response.json({school,page,items,totals:Object.fromEntries(Object.entries(sections).map(([name,section])=>[name,section.total])),has_more:Object.values(sections).some(section=>section.has_more),errors},{status:errors.length===names.length?503:200,headers:{'Cache-Control':errors.length?'no-store':'public, max-age=15','X-Content-Type-Options':'nosniff'}});
}
