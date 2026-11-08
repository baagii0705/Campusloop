import {adminItems,adminStatus,filterAdminItems} from './admin-model.js';
import {SPONSOR_RATES} from './sponsor-pricing.js';

// Loaded only when an administrator opens the dashboard.
(()=>{
'use strict';
const $=id=>document.getElementById(id),root=$('adminPanel'),esc=escapeHTML;
const tabs={overview:'Тойм',vip:'VIP хүсэлт',listings:'Зарууд',reports:'Гомдол',societies:'Клуб, эвент',deals:'Хөнгөлөлт',sponsors:'Байгууллагын зар',legacy:'Хуучин баннер'};
const descriptions={overview:'Шийдвэр хүлээж буй хүсэлтүүдээ эндээс эхэлж шалгаарай.',vip:'Зарыг шалгаад, тохирсон хугацаагаар VIP болгоно.',listings:'Зарыг нээж шалгах, шаардлагатай үед устгах.',reports:'Ирсэн гомдлыг уншаад холбогдох зарыг шалгана.',societies:'Клуб, эвентийн мэдээллийг шалгаж нийтэлнэ.',deals:'Хөнгөлөлтийн нөхцөл, хүчинтэй хугацааг шалгана.',sponsors:'Сурталчилгааны хүсэлт, нийтэлсэн баннер болон статистик.',legacy:'Өмнө байршуулсан баннерууд. Шинэ баннерыг «Байгууллагын зар» хэсэгт нэмнэ.'};
const labels={pending:'Хүлээгдэж буй',active:'Идэвхтэй',published:'Нийтэлсэн',approved:'Зөвшөөрсөн хүсэлт',rejected:'Татгалзсан',expired:'Хугацаа дууссан',paused:'Түр зогсоосон',scheduled:'Эхлэхийг хүлээж буй',available:'Байгаа',reserved:'Захиалсан',sold:'Зарагдсан',received:'Ирсэн',archived:'Архивласан',cancelled:'Цуцалсан'};
const options={vip:['pending','active','expired','rejected'],listings:['available','reserved','sold'],reports:[],societies:['pending','published','expired'],deals:['pending','active','scheduled','paused','expired','approved','rejected'],sponsors:['pending','active','scheduled','paused','expired','approved','rejected'],legacy:['active','scheduled','paused','expired']};
const state={tab:'overview',epoch:0,data:{},summary:null,loading:new Set(),filters:{},owner:null,action:null,busy:false};
const valid=(epoch,owner)=>epoch===state.epoch&&!root.hidden&&isCampusAdmin()&&session?.user?.id===owner;
const money=n=>Number(n||0).toLocaleString('mn-MN')+' ₮';
const date=v=>{if(!v||!Number.isFinite(Date.parse(v)))return '—';const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ulaanbaatar',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(v)).map(p=>[p.type,p.value]));return parts.year+'.'+parts.month+'.'+parts.day+' '+parts.hour+':'+parts.minute+' (УБ)'};
const field=(name,label,value='',type='text',required=false)=>'<label>'+esc(label)+'<input name="'+name+'" type="'+type+'" value="'+esc(value)+'" '+(required?'required':'')+'></label>';
const select=(name,label,values,value)=>'<label>'+esc(label)+'<select name="'+name+'">'+values.map(([v,l])=>'<option value="'+esc(v)+'" '+(String(v)===String(value)?'selected':'')+'>'+esc(l)+'</option>').join('')+'</select></label>';
const paragraph=(label,value)=>value?'<p><b>'+esc(label)+'</b> '+esc(value)+'</p>':'';
function safeLink(url,label){try{const u=new URL(url);if(u.protocol!=='https:')return '';return '<a href="'+esc(u.href)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+'</a>'}catch{return ''}}
function message(text,error=false){$('adminStatus').textContent=text;$('adminStatus').dataset.error=String(error)}
async function api(path,body){
 const jwt=await appwriteAccount.createJWT();
 const r=await fetch('/api/'+path,{method:body?'POST':'GET',cache:'no-store',headers:{Authorization:'Bearer '+jwt.jwt,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 let data;try{data=await r.json()}catch{throw Error('Серверээс мэдээлэл ирсэнгүй. Дахин оролдоно уу.')}
 if(!r.ok)throw Error(data.error||'Үйлдэл амжилтгүй. Дахин оролдоно уу.');return data;
}
function mount(){
 root.innerHTML='<div class="adminHeader"><div><small>SOL1O · УДИРДЛАГА</small><h1 id="adminTitle" tabindex="-1">Удирдлагын самбар</h1><p>Хүсэлтээ шалга. Шийдвэрээ гарга.</p></div><button type="button" id="adminClose">Сайт руу буцах</button></div><div class="adminLayout"><nav class="adminNav" aria-label="Удирдлагын цэс">'+Object.entries(tabs).map(([key,label])=>'<button type="button" data-tab="'+key+'" aria-pressed="false">'+label+'<span data-count="'+key+'"></span></button>').join('')+'</nav><div class="adminWorkspace"><div class="adminSectionHead"><div><h2 id="adminSectionTitle" tabindex="-1"></h2><p id="adminDescription"></p></div><button type="button" id="adminRefresh">Шинэчлэх</button></div><div id="adminToolbar" class="adminToolbar"><label>Хайх<input type="search" id="adminQuery" placeholder="Нэр, сургууль, дугаар…" autocomplete="off"></label><label id="adminFilterLabel">Төлөв<select id="adminFilter"></select></label><button type="button" id="adminReset">Цэвэрлэх</button></div><p id="adminStatus" role="status" aria-live="polite"></p><div id="adminContent"></div><button type="button" id="adminMore" hidden>Дараагийн 50-ийг ачаалах</button></div></div><dialog id="adminAction" aria-labelledby="adminActionTitle"><form id="adminActionForm"><h2 id="adminActionTitle"></h2><p id="adminActionIntro"></p><div id="adminActionFields"></div><p id="adminActionError" role="alert"></p><div class="adminActions"><button type="button" id="adminActionCancel">Болих</button><button type="submit" id="adminActionSave" class="adminPrimary">Хадгалах</button></div></form></dialog>';
 $('adminClose').onclick=close;
 root.querySelector('.adminNav').onclick=e=>{const b=e.target.closest('[data-tab]');if(b)choose(b.dataset.tab,true)};
 $('adminRefresh').onclick=()=>load(state.tab);
 $('adminMore').onclick=()=>load(state.tab,true);
 $('adminQuery').oninput=()=>{saveFilters();draw()};$('adminFilter').onchange=()=>{saveFilters();draw()};
 $('adminReset').onclick=()=>{$('adminQuery').value='';$('adminFilter').value='all';saveFilters();draw()};
 $('adminContent').onclick=handleContent;
 $('adminActionCancel').onclick=()=>{if(!state.busy)$('adminAction').close()};
 $('adminAction').addEventListener('cancel',e=>{if(state.busy)e.preventDefault()});
 $('adminActionForm').onsubmit=saveAction;
}
function saveFilters(){state.filters[state.tab]={query:$('adminQuery').value,status:$('adminFilter').value}}
function choose(tab,focus=false){
 if(!tabs[tab]||root.hidden||!isCampusAdmin())return;
 state.tab=tab;const saved=state.filters[tab]||{query:'',status:'all'};
 root.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===tab)));
 $('adminSectionTitle').textContent=tabs[tab];$('adminDescription').textContent=descriptions[tab];$('adminToolbar').hidden=tab==='overview';
 $('adminFilter').innerHTML='<option value="all">Бүх төлөв</option>'+(options[tab]||[]).map(k=>'<option value="'+k+'">'+labels[k]+'</option>').join('');
 $('adminFilterLabel').hidden=!(options[tab]||[]).length;$('adminQuery').value=saved.query;$('adminFilter').value=saved.status;
 $('adminRefresh').disabled=state.loading.has(tab);$('adminMore').disabled=state.loading.has(tab);
 message('');if(tab==='overview'?state.summary:state.data[tab])draw();else load(tab);
 if(focus)$('adminSectionTitle').focus({preventScroll:true});
}
async function fetchData(tab,more){
 if(['listings','reports','legacy'].includes(tab)){
  const collection={listings:'listings',reports:'listing_reports',legacy:'sponsored_ads'}[tab],old=state.data[tab];
  const queries=[Appwrite.Query.orderDesc('$createdAt'),Appwrite.Query.limit(50)];
  if(more&&old?.cursor)queries.push(Appwrite.Query.cursorAfter(old.cursor));
  const result=await appwriteDatabases.listDocuments(APPWRITE_CONFIG.databaseId,collection,queries),fresh=result.documents.map(normalizeAppwriteDocument);
  const items=more?[...new Map([...(old?.items||[]),...fresh].map(x=>[x.id,x])).values()]:fresh;
  return {items,total:result.total,cursor:fresh.at(-1)?.id,more:fresh.length===50&&items.length<result.total};
 }
 return api({vip:'vip?mode=admin',societies:'societies/admin',deals:'deals/admin',sponsors:'sponsors/admin'}[tab]);
}
async function load(tab=state.tab,more=false){
 if(!isCampusAdmin()||root.hidden||state.loading.has(tab))return;
 const epoch=state.epoch,owner=state.owner;state.loading.add(tab);
 if(tab===state.tab){message('Ачаалж байна…');$('adminRefresh').disabled=true;$('adminMore').disabled=true}
 try{
  const data=tab==='overview'?await api('admin/summary'):await fetchData(tab,more);
  if(!valid(epoch,owner))return;
  if(tab==='overview')state.summary=data;else state.data[tab]=data;
  if(tab===state.tab)draw();updateCounts();if(tab!=='overview')load('overview');
 }catch(e){if(valid(epoch,owner)&&tab===state.tab){message(e.message,true);if(!(tab==='overview'?state.summary:state.data[tab]))$('adminContent').innerHTML='<div class="adminEmpty"><h3>Мэдээлэл ачаалагдсангүй.</h3><p>Шинэчлэх товчийг дарж дахин оролдоорой.</p></div>'}}
 finally{if(epoch===state.epoch){state.loading.delete(tab);if(tab===state.tab){$('adminRefresh').disabled=false;$('adminMore').disabled=false}}}
}
function counts(){
 if(state.summary)return state.summary.pending;
 const p={};
 for(const kind of ['vip','societies','deals','sponsors'])if(state.data[kind]){const a=adminItems(kind,state.data[kind]);if(a.length>=100&&state.summary)continue;if(kind==='societies'){p.clubs=a.filter(x=>x.kind==='club'&&x.status==='pending').length;p.events=a.filter(x=>x.kind==='event'&&x.status==='pending').length}else p[kind]=a.filter(x=>x.status==='pending').length}
 return p;
}
function updateCounts(){
 const p=counts();root.querySelectorAll('[data-count]').forEach(el=>{const k=el.dataset.count,n=k==='societies'?(p.clubs==null?null:p.clubs+p.events):p[k];el.textContent=n==null||n===0?'':n;el.hidden=!n});
}
function overview(){
 const p=counts(),cards=[['vip','VIP хүсэлт',p.vip,'Зарын VIP хугацааг батална.'],['societies','Клуб, эвент',p.clubs==null?null:p.clubs+p.events,'Мэдээллийг хянаж нийтэлнэ.'],['deals','Хөнгөлөлт',p.deals,'Нөхцөл, хугацааг шалгана.'],['sponsors','Байгууллагын зар',p.sponsors,'Баннер, үнэ, хугацааг тохируулна.']];
 $('adminContent').innerHTML='<div class="adminOverview">'+cards.map(([key,title,n,detail])=>'<button type="button" data-go="'+key+'"><span>'+title+'</span><strong>'+esc(n??'—')+'</strong><small>хүлээгдэж буй</small><p>'+detail+'</p><b>Шалгах →</b></button>').join('')+'</div><div class="adminGuide"><h3>Дарааллаар нь шийдэхэд</h3><ol><li>Хүсэлтийг нээгээд агуулга, холбоос, хугацааг шалга.</li><li>VIP эсвэл сурталчилгааны тохиролцоог хийсэн бол зөвшөөр.</li><li>Нийтэлсэн мэдээллийг тухайн хэсгээс түр зогсоож болно.</li></ol><div class="adminActions"><button type="button" data-go="listings">Заруудыг шалгах</button><button type="button" data-go="reports">Гомдлуудыг харах</button></div></div>';
 message('Сүүлд шинэчилсэн: '+date(state.summary?.updated_at));$('adminMore').hidden=true;
}
const actionButton=(action,key,label,danger=false)=>'<button type="button" data-action="'+action+'" data-key="'+esc(key)+'"'+(danger?' class="adminDanger"':'')+'>'+label+'</button>';
function itemKey(x){return (x._request?'request:':x.kind?x.kind+':':'')+(x.listing_id&&state.tab==='vip'?x.listing_id:x.id)}
function row(item){
 const tab=state.tab,key=itemKey(item),status=adminStatus(tab,item),title=item.title||item.company||item.name||item.reason||'Нэргүй мэдээлэл';
 let body='',actions='';
 if(tab==='vip'){
  body=paragraph('Илгээсэн:',date(item.requested_at))+paragraph('Дуусах:',item.expires_at?date(item.expires_at):'')+paragraph('Зарын дугаар:',item.listing_id);
  actions=actionButton('view',key,'Зар харах');if(status==='pending')actions+=actionButton('approve',key,'VIP болгох')+actionButton('reject',key,'Татгалзах');if(status==='active')actions+=actionButton('stop',key,'VIP зогсоох',true);
 }else if(tab==='listings'){
  body=paragraph('Үнэ:',money(item.price))+paragraph('Сургууль:',item.school)+paragraph('Оруулсан:',date(item.created_at));actions=actionButton('view',key,'Зар харах')+actionButton('delete',key,'Устгах',true);
 }else if(tab==='reports'){
  body=paragraph('Зарын дугаар:',item.listing_id)+paragraph('Ирсэн:',date(item.created_at));actions=actionButton('view',key,'Зар шалгах');
 }else if(tab==='societies'){
  body=paragraph('Төрөл:',item.kind==='club'?'Клуб':'Эвент')+paragraph('Сургууль:',item.school||'Бүх сургууль')+paragraph('Ангилал:',item.category)+paragraph('',item.summary||'')+'<details><summary>Дэлгэрэнгүй шалгах</summary>'+paragraph('',item.description)+paragraph('Байршил / уулзалт:',item.location||item.meeting_info)+paragraph('Хугацаа:',item.starts_at?date(item.starts_at)+' — '+date(item.ends_at):'')+paragraph('Төлбөр:',item.price_note)+safeLink(item.join_url||item.registration_url,'Бүртгэлийн холбоос')+'</details>';
  actions=status==='pending'?actionButton('approve',key,'Зөвшөөрч нийтлэх')+actionButton('reject',key,'Татгалзах'):status==='published'?actionButton('close',key,'Нийтлэлээс хасах',true):'';
 }else if(tab==='deals'){
  body=paragraph('Байгууллага:',item.company)+paragraph('Хөнгөлөлт:',item.benefit)+paragraph('Нөхцөл:',item.conditions)+paragraph('Хугацаа:',date(item.start_at)+' — '+date(item.end_at))+paragraph('Сургууль:',item.school||'Бүх сургууль')+paragraph('Байршил:',item.location)+paragraph('Код:',item.code)+safeLink(item.target_url,'Байгууллагын холбоос');
  if(item._request)body+=paragraph('Холбогдох:',[item.contact_name,item.email,item.phone].filter(Boolean).join(' · '));
  actions=item._request&&status==='pending'?actionButton('approve',key,'Зөвшөөрч нийтлэх')+actionButton('reject',key,'Татгалзах'):!item._request?actionButton('toggle',key,item.active?'Түр зогсоох':'Идэвхжүүлэх'):'';
 }else if(tab==='sponsors'){
  body=paragraph('Байршил:',SPONSOR_RATES[item.placement]?.label)+paragraph('Багц:',item.duration_days+' хоног · '+money(item.quoted_price))+paragraph('Хугацаа:',date(item.start_at)+' — '+date(item.end_at));
  if(item._request){body+=paragraph('Холбогдох:',[item.contact_name,item.email,item.phone].filter(Boolean).join(' · '))+paragraph('Хүсэлт:',item.message);if(status==='pending')actions=actionButton('approve',key,'Шалгаж зөвшөөрөх')+actionButton('reject',key,'Татгалзах')}
  else{body+=paragraph('Статистик:','Үзэлт '+Number(item.views||0)+' · Дарсан '+Number(item.clicks||0)+' · CTR '+(item.views?(100*Number(item.clicks||0)/item.views).toFixed(1):'0')+'%');const daily=(state.data.sponsors.daily||[]).filter(x=>x.campaign_id===item.id);if(daily.length)body+='<details><summary>Сүүлийн 30 хоног</summary>'+daily.map(x=>paragraph(x.day+':','Үзэлт '+x.views+' · Дарсан '+x.clicks)).join('')+'</details>';actions=actionButton('edit',key,'Засах')+actionButton('toggle',key,item.active?'Түр зогсоох':'Идэвхжүүлэх')}
  body+=safeLink(item.image_url,'Баннерын зураг')+' '+safeLink(item.target_url,'Очих холбоос');
 }else if(tab==='legacy'){
  body=paragraph('Хугацаа:',date(item.start_at)+' — '+date(item.end_at))+safeLink(item.image_url,'Баннерын зураг')+' '+safeLink(item.target_url,'Очих холбоос');actions=actionButton('toggle',key,item.active?'Түр зогсоох':'Идэвхжүүлэх')+actionButton('delete',key,'Устгах',true);
 }
 return '<article class="adminCard"><div class="adminCardHead"><h3>'+esc(title)+'</h3><span class="adminBadge" data-status="'+esc(status)+'">'+esc(labels[status]||status)+'</span></div><div class="adminCardBody">'+body+'</div><div class="adminActions">'+actions+'</div></article>';
}
function draw(){
 if(state.tab==='overview'){overview();return}
 const data=state.data[state.tab];if(!data)return;
 const all=adminItems(state.tab,data),items=filterAdminItems(state.tab,all,state.filters[state.tab]);
 const extra=state.tab==='sponsors'?'<button type="button" data-new-sponsor class="adminPrimary">Баннер нэмэх</button>':'';
 $('adminContent').innerHTML=extra+'<div class="adminCards">'+(items.length?items.map(row).join(''):'<div class="adminEmpty"><h3>'+(all.length?'Тохирох мэдээлэл алга.':'Одоогоор мэдээлэл алга.')+'</h3><p>'+(all.length?'Хайлтаа өөрчлөх эсвэл Цэвэрлэх товчийг дараарай.':'Шинэ хүсэлт ирэхэд энэ хэсэгт харагдана.')+'</p></div>')+'</div>';
 const bounded=!['listings','reports','legacy'].includes(state.tab)&&all.length>=100;
 message('Харагдаж буй: '+items.length+' / Ачаалсан: '+all.length+(data.total!=null?' / Нийт: '+data.total:'')+(bounded?' · Жагсаалт хязгаартай; хүлээгдэж буй хүсэлтүүд эхэнд харагдана.':'')+(data.more?' · Хайлт ачаалсан мэдээллээс шүүнэ. Дараагийн хуудсыг ачаалж болно.':''));
 $('adminMore').hidden=!data.more;updateCounts();
}
async function handleContent(e){
 const go=e.target.closest('[data-go]');if(go){choose(go.dataset.go,true);return}
 if(e.target.closest('[data-new-sponsor]')){openAction('create',{});return}
 const b=e.target.closest('[data-action]');if(!b||!isCampusAdmin())return;
 const item=adminItems(state.tab,state.data[state.tab]).find(x=>itemKey(x)===b.dataset.key);if(!item)return;
 if(b.dataset.action==='view'){
  const epoch=state.epoch,owner=state.owner;b.disabled=true;try{const id=item.listing_id||item.id;let listing=listings.find(x=>x.id===id);if(!listing){const r=await db.from('listings').select('*').eq('id',id).maybeSingle();if(r.error||!r.data)throw Error('Зар олдсонгүй. Устгасан эсвэл нийтэд харагдахгүй болсон байж болно.');listing=r.data;if(!valid(epoch,owner))return;listings.push(listing)}if(!valid(epoch,owner))return;close();openListing(id)}catch(error){message(error.message,true)}finally{b.disabled=false}return;
 }
 openAction(b.dataset.action,item);
}
function toLocal(value){if(!value||!Number.isFinite(Date.parse(value)))return '';const d=new Date(value);return new Date(+d-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}
function sponsorFields(item){return field('company','Байгууллагын нэр',item.company,'text',true)+field('image_url','Баннерын зургийн HTTPS холбоос',item.image_url,'url',true)+field('target_url','Очих HTTPS холбоос',item.target_url,'url',true)+select('placement','Байршил',Object.entries(SPONSOR_RATES).map(([k,v])=>[k,v.label]),item.placement||'both')+select('duration_days','Хугацаа',[[7,'7 хоног'],[30,'30 хоног']],item.duration_days||7)+field('start_at','Эхлэх (сонголттой)',toLocal(item.start_at),'datetime-local')+field('end_at','Дуусах (сонголттой)',toLocal(item.end_at),'datetime-local')+'<p class="adminFormHint" id="adminSponsorPrice"></p>'}
function openAction(action,item){
 if(!isCampusAdmin()||state.busy)return;
 const tab=state.tab,title=item.title||item.company||item.name||'Баннер';state.action={tab,action,item};let fields='',intro='«'+title+'»',button='Батлах';
 const names={approve:tab==='vip'?'Зарыг VIP болгох':'Зөвшөөрч нийтлэх',reject:'Хүсэлтэд татгалзах',stop:'VIP зогсоох',delete:'Бүрмөсөн устгах',close:'Нийтлэлээс хасах',toggle:item.active?'Түр зогсоох':'Идэвхжүүлэх',edit:'Баннер засах',create:'Баннер нэмэх'};
 if(tab==='vip'&&action==='approve'){fields=select('days','VIP байх хугацаа',[[3,'3 хоног'],[7,'7 хоног'],[14,'14 хоног'],[30,'30 хоног']],7);intro+=' — тохиролцоогоо шалгаад хугацааг сонгоно уу.'}
 if(tab==='societies')fields='<label>Тайлбар (сонголттой)<textarea name="note" maxlength="400" rows="3">'+esc(item.review_note||'')+'</textarea></label>';
 if(tab==='sponsors'&&['approve','edit','create'].includes(action)){fields=sponsorFields(item);intro='Зураг, холбоос, хугацаа болон төлбөрийн тохиролцоогоо шалгана уу.'}
 if(tab==='sponsors'&&['approve','reject'].includes(action))fields+='<label>Админы тэмдэглэл (сонголттой)<textarea name="admin_notes" maxlength="500" rows="3"></textarea></label>';
 if(action==='delete'){intro+=' — устгасан мэдээллийг сэргээх боломжгүй.';button='Тийм, устгах'}
 if(action==='toggle'&&!item.active&&item.end_at&&Date.parse(item.end_at)<=Date.now()){message('Хугацаа дууссан байна. Хугацааг шинэчилж байж идэвхжүүлнэ үү.',true);return}
 $('adminActionTitle').textContent=names[action];$('adminActionIntro').textContent=intro;$('adminActionFields').innerHTML=fields;$('adminActionError').textContent='';$('adminActionSave').textContent=action==='delete'?button:names[action];$('adminActionSave').classList.toggle('adminDanger',action==='delete');
 const price=$('adminSponsorPrice');if(price){const form=$('adminActionForm'),update=()=>{price.textContent='Багцын үнэ: '+money(SPONSOR_RATES[form.elements.placement.value]?.prices[form.elements.duration_days.value])};form.elements.placement.onchange=update;form.elements.duration_days.onchange=update;update()}
 $('adminAction').showModal();
}
async function mutate({tab,action,item},form){
 const id=item.id||item.listing_id;
 if(tab==='listings'||tab==='legacy'){
  if(action==='delete')await appwriteDatabases.deleteDocument(APPWRITE_CONFIG.databaseId,tab==='legacy'?'sponsored_ads':'listings',id);
  else await appwriteDatabases.updateDocument(APPWRITE_CONFIG.databaseId,'sponsored_ads',id,{active:!item.active});
 }else if(tab==='vip')await api('vip',{action,id:item.listing_id,days:Number(form.get('days')||7)});
 else if(tab==='societies')await api('societies/admin',{action,id,kind:item.kind,note:form.get('note')||''});
 else if(tab==='deals')await api('deals/admin',{action,id,...(action==='toggle'?{active:!item.active}:{})});
 else if(tab==='sponsors'){
  const body={action:action==='edit'?'update':action,id};
  if(['approve','edit','create'].includes(action)){
   Object.assign(body,Object.fromEntries(form));body.duration_days=Number(body.duration_days);body.start_at=body.start_at?new Date(body.start_at).toISOString():null;body.end_at=body.end_at?new Date(body.end_at).toISOString():null;
   for(const url of [body.image_url,body.target_url])if(!/^https:\/\//i.test(url))throw Error('Зураг болон очих холбоос https:// гэж эхэлсэн байх ёстой.');
   if(body.end_at&&body.start_at&&body.end_at<=body.start_at)throw Error('Дуусах хугацаа эхлэхээс хойш байх ёстой.');
  }
  if(action==='reject')body.admin_notes=form.get('admin_notes')||'';
  if(action==='toggle')body.active=!item.active;await api('sponsors/admin',body);
 }
}
async function saveAction(e){
 e.preventDefault();if(state.busy||!state.action||!isCampusAdmin())return;
 const action=state.action,epoch=state.epoch,owner=state.owner;state.busy=true;const buttons=$('adminActionForm').querySelectorAll('button');buttons.forEach(b=>b.disabled=true);$('adminActionError').textContent='Хадгалж байна…';
 try{
  await mutate(action,new FormData(e.currentTarget));if(!valid(epoch,owner))return;
  $('adminAction').close();toast('Амжилттай шинэчлэгдлээ.');await load(action.tab);load('overview');
  if(action.tab==='vip')window.SolioVIP?.refresh().catch(()=>{});
  if(['sponsors','legacy'].includes(action.tab))window.SolioSponsorRefresh?.();
  if(action.tab==='listings')loadListings();
 }catch(error){if(valid(epoch,owner))$('adminActionError').textContent=error.message}
 finally{if(epoch===state.epoch)state.busy=false;buttons.forEach(b=>b.disabled=false)}
}
function close(){
 state.epoch++;state.loading.clear();root.hidden=true;document.body.classList.remove('solioAdminMode');$('adminAction')?.close();
 // Private moderation data stays only in memory and is cleared on close/logout.
 state.data={};state.summary=null;state.action=null;state.owner=null;state.busy=false;
 root.replaceChildren();
}
function open(){
 if(!isCampusAdmin())return;
 if(!root.querySelector('.adminLayout'))mount();
 state.epoch++;state.loading.clear();state.owner=session.user.id;root.hidden=false;document.body.classList.add('solioAdminMode');choose('overview');window.scrollTo({top:0,behavior:'instant'});$('adminTitle').focus({preventScroll:true});
}
appwriteAuth.onAuthStateChange(()=>{state.filters={};close()});
document.addEventListener('click',e=>{if(!root.hidden&&e.target.closest('body > header button:not(#adminNavBtn), .mobileBottomNav button'))close()},{capture:true});
window.SolioAdmin={open,close};
})();
