// Shared state rules for the admin UI. Expired content is never labelled active.
export function adminStatus(kind,item,now=Date.now()){
 if(kind==='listings')return item.status||'available';
 if(kind==='reports')return 'received';
 if(kind==='vip')return item.status==='active'&&Date.parse(item.expires_at)<=now?'expired':item.status;
 if(kind==='societies')return item.status==='published'&&item.kind==='event'&&Date.parse(item.ends_at)<=now?'expired':item.status;
 if(item._request)return item.status;
 if(item.end_at&&Date.parse(item.end_at)<=now)return 'expired';
 if(!item.active)return 'paused';
 if(item.start_at&&Date.parse(item.start_at)>now)return 'scheduled';
 return 'active';
}
export function adminItems(kind,data){
 if(kind==='vip')return data.items||[];
 if(kind==='societies')return [...(data.clubs||[]).map(x=>({...x,kind:'club'})),...(data.events||[]).map(x=>({...x,kind:'event'}))];
 if(kind==='deals'||kind==='sponsors')return [...(data.requests||[]).map(x=>({...x,_request:true})),...(data.deals||data.campaigns||[])];
 return data.items||[];
}
export function filterAdminItems(kind,items,{query='',status='all'}={},now=Date.now()){
 const q=query.trim().toLocaleLowerCase('mn-MN');
 return items.filter(x=>(status==='all'||adminStatus(kind,x,now)===status)&&[x.title,x.name,x.company,x.school,x.reason,x.listing_id,x.id,x.contact_name,x.email,x.phone].filter(Boolean).join(' ').toLocaleLowerCase('mn-MN').includes(q)).sort((a,b)=>Number(adminStatus(kind,b,now)==='pending')-Number(adminStatus(kind,a,now)==='pending')||String(b.requested_at||b.created_at||'').localeCompare(a.requested_at||a.created_at||''));
}
