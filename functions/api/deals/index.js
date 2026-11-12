import {binding,response} from '../../../sponsor-api-utils.js';
import {publicDeal} from '../../../student-deals.js';
export async function onRequestGet(context) {
  try {
    const url=new URL(context.request.url),school=(url.searchParams.get('school')||'').trim();
    if(school.length>180)return response({error:'Сургуулийн нэр буруу байна.'},400);
    const category=(url.searchParams.get('category')||'').trim();
    if(category.length>40)return response({error:'Ангилал буруу байна.'},400);
    const offset=Math.max(0,Math.min(2400,parseInt(url.searchParams.get('offset')||'0',10)||0));
    const now=new Date().toISOString(),params=[now,now];
    let where='active=1 AND start_at<=? AND end_at>?';
    if(school){where+=" AND (school='' OR school=?)";params.push(school)}
    if(category){where+=' AND category=?';params.push(category)}
    const rows=await binding(context).prepare('SELECT id,company,title,benefit,conditions,category,school,location,code,target_url,start_at,end_at FROM student_deals WHERE '+where+' ORDER BY end_at ASC,id ASC LIMIT 25 OFFSET ?').bind(...params,offset).all();
    return Response.json({deals:(rows.results||[]).slice(0,24).map(publicDeal),has_more:(rows.results||[]).length>24},{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  } catch {return response({error:'Хөнгөлөлтийг түр ачаалах боломжгүй. Дахин оролдоно уу.'},503)}
}
