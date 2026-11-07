import {clean,safeURL,safeDate,checkDateRange} from './sponsor-api-utils.js';
export const SOCIETY_CATEGORIES=['Технологи','Урлаг','Спорт','Сайн дурын ажил','Карьер, сургалт','Бусад'];
export const CLUB_FIELDS=['id','name','school','category','summary','description','join_url','meeting_info','created_at'];
export const EVENT_FIELDS=['id','club_id','club_name','title','school','category','description','location','starts_at','ends_at','registration_url','price_note','created_at'];
export const tableFor=kind=>kind==='club'?'society_clubs':kind==='event'?'society_events':null;
export const publicSociety=(kind,row)=>Object.fromEntries((kind==='club'?CLUB_FIELDS:EVENT_FIELDS).map(key=>[key,row[key]??'']));
export const normalized=s=>String(s||'').normalize('NFKC').toLocaleLowerCase('mn-MN');
export const likeTerm=s=>'%'+normalized(clean(s,100)).replace(/[\\%_]/g,'\\$&')+'%';
export function societyFields(kind,input,now=Date.now()){
 const school=clean(input.school,180),category=clean(input.category,40);
 if(!SOCIETY_CATEGORIES.includes(category))throw Error('Ангиллаа сонгоно уу.');
 const description=clean(input.description,2000);
 if(description.length<15)throw Error('Тайлбараа 15-аас доошгүй тэмдэгтээр бичнэ үү.');
 let fields;
 if(kind==='club'){
  const name=clean(input.name,100),summary=clean(input.summary,180),join_url=safeURL(input.join_url,true),meeting_info=clean(input.meeting_info,240);
  if(name.length<3||summary.length<10||join_url===null)throw Error('Клубийн нэр, товч танилцуулга болон HTTPS холбоосоо шалгана уу.');
  fields={name,school,category,summary,description,join_url,meeting_info};
 }else if(kind==='event'){
  const title=clean(input.title,120),location=clean(input.location,200),starts_at=safeDate(input.starts_at),ends_at=safeDate(input.ends_at),registration_url=safeURL(input.registration_url,true),price_note=clean(input.price_note,100),club_id=clean(input.club_id,70)||null;
  if(title.length<3||location.length<3||!starts_at||!ends_at||registration_url===null||!price_note)throw Error('Гарчиг, байршил, огноо, төлбөрийн нөхцөл болон HTTPS холбоосоо шалгана уу.');
  if(Date.parse(starts_at)<=now)throw Error('Эхлэх хугацааг ирээдүйд сонгоно уу.');
  checkDateRange(starts_at,ends_at);
  fields={club_id,title,school,category,description,location,starts_at,ends_at,registration_url,price_note};
 }else throw Error('Мэдээллийн төрөл буруу байна.');
 fields.search_text=normalized(Object.values(fields).join(' '));
 return fields;
}
export function societyQuery(url,now=new Date()){
 const kind=url.searchParams.get('kind')||'event',table=tableFor(kind);
 if(!table)throw Error('Мэдээллийн төрөл буруу байна.');
 const alias=kind==='club'?'c':'e';
 const params=[],where=[alias+".status='published'"];
 if(kind==='event')where.push("(e.club_id IS NULL OR EXISTS(SELECT 1 FROM society_clubs c WHERE c.id=e.club_id AND c.status='published'))");
 const id=clean(url.searchParams.get('id'),70);
 const ids=url.searchParams.get('ids');
 if(ids!==null){const values=ids.split(',').filter(x=>/^[a-zA-Z0-9_-]{1,70}$/.test(x)).slice(0,200);where.push(values.length?alias+'.id IN ('+values.map(()=>'?').join(',')+')':'0=1');params.push(...values)}
 if(id){where.push(alias+'.id=?');params.push(id)}
 else{
  const school=clean(url.searchParams.get('school'),180),category=clean(url.searchParams.get('category'),40),q=clean(url.searchParams.get('q'),100),club=clean(url.searchParams.get('club_id'),70);
  if(school){where.push('('+alias+".school='' OR "+alias+'.school=?)');params.push(school)}
  if(category){where.push(alias+'.category=?');params.push(category)}
  if(q){where.push(alias+".search_text LIKE ? ESCAPE '\\'");params.push(likeTerm(q))}
  if(kind==='event'){
   const scope=url.searchParams.get('scope')||'upcoming';
   where.push(scope==='past'?'e.ends_at<=?':'e.ends_at>?');params.push(now.toISOString());
   if(scope==='week'){where.push('e.starts_at<?');params.push(new Date(+now+7*86400000).toISOString())}
   if(club){where.push('e.club_id=?');params.push(club)}
  }
 }
 const fields=kind==='club'?CLUB_FIELDS.map(f=>'c.'+f).join(','):EVENT_FIELDS.map(f=>f==='club_name'?"COALESCE(c.name,'') AS club_name":'e.'+f).join(',');
 const offset=Math.max(0,Math.min(2400,parseInt(url.searchParams.get('offset')||'0',10)||0));
 const order=kind==='club'?'c.created_at DESC,c.id':(url.searchParams.get('scope')==='past'?'e.starts_at DESC,e.id':'e.starts_at ASC,e.id');
 return {kind,id,sql:'SELECT '+fields+' FROM '+table+' '+alias+(kind==='event'?' LEFT JOIN society_clubs c ON c.id=e.club_id':'')+' WHERE '+where.join(' AND ')+' ORDER BY '+order+' LIMIT '+(id?'1':'25 OFFSET ?'),params:id?params:[...params,offset]};
}
