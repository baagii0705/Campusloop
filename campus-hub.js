(()=>{
'use strict';
const $=id=>document.getElementById(id),esc=escapeHTML;
const categories=['Хоол, кофе','Хэвлэл, үйлчилгээ','Сургалт','Дэлгүүр','Бусад'];
const state={mode:'',school:'',items:[],page:0,more:false,kind:'all',busy:false,serial:0,deals:[],dealOffset:0};
try{state.school=localStorage.getItem('solio_my_school')||''}catch{}
if(!schools.slice(1).includes(state.school))state.school='';
const options=(all='Сургуулиа сонгох')=>'<option value="">'+all+'</option>'+schools.slice(1).map(s=>'<option>'+esc(s)+'</option>').join('');
const date=s=>{const d=new Date(s);return Number.isFinite(+d)?d.toLocaleDateString('mn-MN'):''};
const money=x=>x==null?'Тохиролцоно':Number(x).toLocaleString('en-US')+' ₮';
const page=document.createElement('section');page.id='campusPage';page.hidden=true;page.className='s1Hub';
page.innerHTML='<div class="s1HubEyebrow">SOL1O / CAMPUS</div><div class="s1HubHeading"><div><h1>Миний<br><em>сургууль.</em></h1><p>Зар, хүсэлт, оюутны яриа. Нэг сургуулийн самбарт.</p></div><button type="button" id="campusClubs">Клуб, эвент</button><button type="button" id="campusDeals">Оюутны хөнгөлөлт <svg class="s1HubArrow" viewBox="0 0 24 24" aria-hidden="true"><use href="#board-arrow"></use></svg></button></div><div class="s1CampusControl"><label>Сургууль<select id="campusSchool">'+options()+'</select></label><label>Энэ самбараас хайх<input id="campusQuery" type="search" placeholder="Ном, тооны машин, зөвлөгөө…"></label></div><p class="s1HubHint">Сонголт энэ төхөөрөмжид хадгалагдана.</p><div id="campusTabs" class="s1HubTabs" aria-label="Мэдээллийн төрөл"><button data-kind="all" aria-pressed="true">Бүгд</button><button data-kind="listing" aria-pressed="false">Зар</button><button data-kind="wanted" aria-pressed="false">Хайж байна</button><button data-kind="post" aria-pressed="false">Нийтлэл</button></div><p id="campusStatus" role="status"></p><div id="campusFeed" class="s1HubGrid"></div><button id="campusMore" type="button" hidden>Дараагийн мэдээлэл ↓</button><button type="button" id="campusDirectory" class="s1TextButton">Сургуулийн жагсаалт үзэх →</button>';
document.querySelector('main.wrap').prepend(page);
const dealsPage=document.createElement('section');dealsPage.id='dealsPage';dealsPage.hidden=true;dealsPage.className='s1Hub';dealsPage.innerHTML='<div class="s1HubEyebrow">SOL1O / STUDENT PERKS</div><div class="s1HubHeading"><div><h1>Оюутанд<br><em>арай хямд.</em></h1><p>Нөхцөл, хугацаа нь тодорхой байгууллагын саналууд.</p></div><button type="button" id="dealApply">Хөнгөлөлт санал болгох <svg class="s1HubArrow" viewBox="0 0 24 24" aria-hidden="true"><use href="#board-arrow"></use></svg></button></div><div class="s1CampusControl"><label>Хамрах сургууль<select id="dealsSchool">'+options('Бүх сургууль')+'</select></label><label>Ангилал<select id="dealsCategory"><option value="">Бүх ангилал</option>'+categories.map(c=>'<option>'+esc(c)+'</option>').join('')+'</select></label></div><p id="dealsStatus" role="status"></p><div id="dealInvite" class="s1DealInvite" hidden><div><strong>Хаана оюутны хөнгөлөлт авдаг вэ?</strong><p>Тэр газарт энэ холбоосыг явуулаарай. Байгууллага өөрийн нөхцөлөө оруулж болно.</p></div><button type="button" id="inviteCompany">Байгууллагыг урих</button><input id="inviteFallback" aria-label="Байгууллагад илгээх холбоос" readonly hidden></div><div id="dealsFeed" class="s1HubGrid"></div><button type="button" id="dealsMore" hidden>Өөр санал үзэх ↓</button><button type="button" id="backCampus" class="s1TextButton">← Миний сургууль</button>';document.querySelector('main.wrap').prepend(dealsPage);
function leave(){document.body.classList.remove('s1CampusMode','s1DealsMode');page.hidden=true;dealsPage.hidden=true;state.mode=''}
function enter(mode,push=true){leaveSolioCommunity();leaveSolioSearch();leaveMobileSchools();state.mode=mode;document.body.classList.add(mode==='campus'?'s1CampusMode':'s1DealsMode');(mode==='campus'?page:dealsPage).hidden=false;updateBottomTabs(mode==='campus'?'bottomSchools':'bottomDeals');if(push&&location.hash!=='#'+mode)history.pushState({},'','#'+mode);window.scrollTo({top:0,behavior:'instant'});if(mode==='campus'){ $('campusSchool').value=state.school;loadCampus()}else{$('dealsSchool').value=state.school;loadDeals()}}
async function json(url,init){const r=await fetch(url,{cache:'no-store',...init});let data;try{data=await r.json()}catch{throw Error('Мэдээллийг ачаалж чадсангүй. Дахин оролдоно уу.')}if(!r.ok)throw Error(data.error||'Ачаалж чадсангүй. Дахин оролдоно уу.');return data}
function retry(el,msg,fn){el.textContent=msg+' ';const b=document.createElement('button');b.type='button';b.textContent='Дахин оролдох';b.onclick=fn;el.append(b)}
async function loadCampus(more=false){const token=++state.serial;state.busy=true;$('campusMore').hidden=true;if(!more){state.items=[];state.page=0;$('campusFeed').innerHTML=''}if(!state.school){state.busy=false;$('campusStatus').textContent='Сургуулиа сонгоод өөрийн самбараа нээгээрэй.';return}$('campusStatus').textContent='Самбарыг ачаалж байна…';try{const data=await json('/api/campus?school='+encodeURIComponent(state.school)+'&page='+(more?state.page+1:0));if(token!==state.serial)return;state.page=data.page;state.more=data.has_more;state.busy=false;state.items=[...new Map([...state.items,...data.items].map(x=>[x.kind+':'+x.id,x])).values()].sort((a,b)=>b.created_at.localeCompare(a.created_at));renderFeed();const t=data.totals;$('campusStatus').textContent=(t.listings??'—')+' зар · '+(t.wanted_posts??'—')+' хүсэлт · '+(t.campus_posts??'—')+' нийтлэл';if(data.errors.length)retry($('campusStatus'),'Зарим мэдээлэл ачаалагдсангүй.',()=>loadCampus());$('campusMore').hidden=!state.more}catch(e){if(token===state.serial)retry($('campusStatus'),e.message,()=>loadCampus(more))}finally{if(token===state.serial)state.busy=false}}
function renderFeed(){const q=$('campusQuery').value.trim().toLowerCase();const items=state.items.filter(x=>(state.kind==='all'||state.kind===x.kind)&&[x.title,x.description,x.details,x.content].join(' ').toLowerCase().includes(q));$('campusFeed').innerHTML=items.length?items.map(x=>'<article class="s1HubCard '+(x.kind==='wanted'?'s1WantedCard':'')+'"><small>'+({listing:'ЗАР',wanted:'ХАЙЖ БАЙНА',post:'ОЮУТНЫ БУЛАН'}[x.kind])+' / '+esc(date(x.created_at))+'</small>'+(x.kind==='listing'?solioCoverImage(x,'s1CampusPhoto',false):'')+'<h2>'+esc(x.title||x.content.slice(0,80))+'</h2><p>'+esc((x.description||x.details||x.content||'').slice(0,220))+'</p>'+(x.kind!=='post'?'<strong>'+esc(money(x.kind==='listing'?x.price:x.budget))+'</strong>':'')+'<button type="button" data-campus-item="'+esc(x.kind+':'+x.id)+'">'+(x.kind==='listing'?'Зар үзэх':x.kind==='wanted'?'Хүсэлт үзэх':'Нийтлэл үзэх')+' <svg class="s1HubArrow" viewBox="0 0 24 24" aria-hidden="true"><use href="#board-arrow"></use></svg></button></article>').join(''):(state.school&&!state.busy?'<div class="s1HubEmpty"><b>Эндээс эхэлнэ.</b><p>Тохирох мэдээлэл одоогоор алга. Зар, хүсэлт эсвэл нийтлэл нэмээд сургуулийнхаа самбарыг эхлүүлээрэй.</p><button type="button" id="campusFirstPost">Зар нэмэх +</button></div>':'');observeSolioImages($('campusFeed'));$('campusFirstPost')?.addEventListener('click',()=>openModal('post'))}
$('campusFeed').onclick=async e=>{const b=e.target.closest('[data-campus-item]');if(!b)return;const x=state.items.find(x=>x.kind+':'+x.id===b.dataset.campusItem);if(!x)return;if(x.kind==='listing'){b.disabled=true;try{if(!listings.some(y=>y.id===x.id)){const result=await db.from('listings').select('*').eq('id',x.id).maybeSingle();if(result.error||!result.data)throw Error();listings.push(result.data)}openListing(x.id)}catch{toast('Зарыг нээж чадсангүй. Дахин оролдоно уу.')}finally{b.disabled=false}}else if(x.kind==='wanted'){openSolioWanted();$('wantedSchoolFilter').value=x.school;$('wantedQueryFilter').value=x.title;filterWantedRequests()}else{openSolioCommunity();$('communitySchool').value=x.school;$('communitySearch').value=x.content.slice(0,45);renderCommunityFeed()}};
$('campusTabs').onclick=e=>{const b=e.target.closest('[data-kind]');if(!b)return;state.kind=b.dataset.kind;$('campusTabs').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderFeed()};$('campusQuery').oninput=renderFeed;
$('campusSchool').onchange=()=>{state.school=$('campusSchool').value;try{localStorage.setItem('solio_my_school',state.school)}catch{}loadCampus()};$('campusMore').onclick=()=>{if(!state.busy)loadCampus(true)};$('campusDirectory').onclick=goMobileSchools;$('campusClubs').onclick=()=>window.SolioSocieties.open({school:state.school});$('campusDeals').onclick=()=>enter('deals');$('backCampus').onclick=()=>enter('campus');
let dealSerial=0;
function dealCard(d){
 const path=solioPublicPath('/deals/'+encodeURIComponent(d.id));
 const visit=d.target_url&&/^https:\/\//i.test(d.target_url)
  ? '<a href="'+esc(d.target_url)+'" target="_blank" rel="noopener noreferrer sponsored">Байгууллагын хуудас ↗</a>':'';
 return '<article class="s1HubCard s1DealCard"><small>'+esc(d.company)+' / '+esc(d.category)+'</small>'
  +'<div class="s1DealBenefit">'+esc(d.benefit)+'</div><h2><a class="s1DealTitle" href="'+esc(path)+'">'+esc(d.title)+'</a></h2>'
  +'<p class="s1DealTerms">'+esc(d.conditions)+'</p><p>'+esc(d.school||'Бүх сургуулийн оюутанд')+'</p>'
  +(d.location?'<p>Байршил: '+esc(d.location)+'</p>':'')+'<small>'+esc(date(d.start_at))+' — '+esc(date(d.end_at))+'</small>'
  +(d.code?'<button type="button" data-copy="'+esc(d.code)+'">Код хуулах: '+esc(d.code)+'</button>':'')
  +'<a href="'+esc(path)+'">Санал нээх, хуваалцах →</a>'+visit+'</article>';
}
async function loadDeals(more=false){
 const token=++dealSerial;
 $('dealsMore').hidden=true;
 $('dealInvite').hidden=true;
 if(!more){state.deals=[];state.dealOffset=0;$('dealsFeed').replaceChildren()}
 $('dealsStatus').textContent='Саналуудыг ачаалж байна…';
 try{
  const school=$('dealsSchool').value,category=$('dealsCategory').value;
  const params=new URLSearchParams({school,category,offset:String(more?state.dealOffset+24:0)});
  const data=await json('/api/deals?'+params);
  if(token!==dealSerial)return;
  if(more)state.dealOffset+=24;
  state.deals.push(...data.deals);
  $('dealsStatus').textContent=state.deals.length?'Хүчинтэй саналууд':school||category?'Сонгосон шүүлтүүрт тохирох санал алга.':'Одоогоор нийтлэгдсэн хөнгөлөлт алга.';
  $('dealsFeed').innerHTML=state.deals.map(dealCard).join('');
  $('dealInvite').hidden=!!state.deals.length;
  $('dealsMore').hidden=!data.has_more;
 }catch(error){if(token===dealSerial)retry($('dealsStatus'),error.message,()=>loadDeals(more))}
}
$('inviteCompany').onclick=async()=>{
 const url='https://sol1o.me/partners';
 if(navigator.share){
  try{await navigator.share({title:'Sol1o · Оюутны хөнгөлөлт',text:'Танай оюутны хөнгөлөлтийг эндээс олж хармаар байна.',url});return}
  catch(error){if(error.name==='AbortError')return}
 }
 try{await navigator.clipboard.writeText(url);toast('Байгууллагад илгээх холбоосыг хууллаа.')}
 catch{const field=$('inviteFallback');field.hidden=false;field.value=url;field.focus();field.select()}
};
$('dealsSchool').onchange=()=>loadDeals();$('dealsCategory').onchange=()=>loadDeals();$('dealsMore').onclick=()=>loadDeals(true);$('dealsFeed').onclick=async e=>{const b=e.target.closest('[data-copy]');if(!b)return;try{await navigator.clipboard.writeText(b.dataset.copy);toast('Код хууллаа.')}catch{toast('Код: '+b.dataset.copy)}};
function apply(){$('modal').classList.add('show');document.querySelector('.dialog').classList.remove('authDialog','detailDialog','quickPostDialog','easyDialog');document.querySelector('.dialog').scrollTop=0;const field=(name,label,type='text',required=true,max=120)=>'<label>'+label+'<input name="'+name+'" type="'+type+'" maxlength="'+max+'" '+(required?'required':'')+'></label>';$('modalBody').innerHTML='<div class="s1DealApplication"><small>БАЙГУУЛЛАГАД</small><h2>Оюутанд санал болгоё.</h2><p>Саналыг хянаж зөвшөөрсний дараа нийтэлнэ. Холбоо барих мэдээлэл олон нийтэд харагдахгүй.</p><form id="dealForm">'+field('company','Байгууллагын нэр')+field('contact_name','Холбоо барих хүний нэр')+field('email','Имэйл','email')+field('phone','Утас','tel',false,40)+field('title','Саналын гарчиг')+field('benefit','Хөнгөлөлт (жишээ: 15% хямдрал)')+'<label>Ашиглах нөхцөл<textarea name="conditions" required minlength="5" maxlength="1200" rows="4" placeholder="Оюутны үнэмлэх шаардах эсэх, хамрах бүтээгдэхүүн, хязгаарлалтаа бичнэ үү."></textarea></label><label>Ангилал<select name="category">'+categories.map(c=>'<option>'+esc(c)+'</option>').join('')+'</select></label><label>Хамрах сургууль<select name="school">'+options('Бүх сургууль')+'</select></label>'+field('location','Байршил','text',false,200)+field('code','Хөнгөлөлтийн код','text',false,40)+field('target_url','Вэбсайт эсвэл сошиал хуудас (https://)','url',false,1000)+field('start_at','Эхлэх хугацаа','datetime-local')+field('end_at','Дуусах хугацаа','datetime-local')+'<div hidden aria-hidden="true"><input name="website" tabindex="-1" autocomplete="off"></div><button type="submit">Хянуулах хүсэлт илгээх →</button><p id="dealFormStatus" role="status"></p></form></div>';const form=$('dealForm');const local=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);form.elements.start_at.value=local;form.elements.end_at.min=local;form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;const status=$('dealFormStatus');status.textContent='Илгээж байна…';try{const values=Object.fromEntries(new FormData(form));values.start_at=new Date(values.start_at).toISOString();values.end_at=new Date(values.end_at).toISOString();const receipt=await json('/api/deals/apply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(values)});showDealReceipt(form,receipt.id)}catch(error){status.textContent=error.message;button.disabled=false}};form.elements.company.focus()}
function showDealReceipt(form,id){
 form.innerHTML='<h3>Хүсэлт хүлээн авлаа.</h3><p>Саналыг зөвшөөрч, эхлэх хугацаа нь болоход нийтэлнэ.</p>';
 if(id){
  const url='https://sol1o.me/deals/'+encodeURIComponent(id);
  const label=document.createElement('label');
  label.textContent='Саналынхаа холбоосыг одоо хадгалаарай. Нийтлэгдсэний дараа эндээс QR кодоо авна.';
  const field=document.createElement('input');
  field.type='url';field.readOnly=true;field.value=url;
  label.append(field);
  const copy=document.createElement('button');
  copy.type='button';copy.textContent='Холбоос хуулах';
  copy.onclick=async()=>{
   try{await navigator.clipboard.writeText(url);copy.textContent='Хууллаа'}
   catch{field.focus();field.select()}
  };
  form.append(label,copy);
 }
 const done=document.createElement('button');
 done.type='button';done.textContent='Хаах';done.onclick=()=>closeModal();
 form.append(done);
}
$('dealApply').onclick=apply;
window.SolioCampus={open:()=>enter('campus'),deals:()=>enter('deals'),apply:()=>{enter('deals');apply()},leave,restoreModalRoute:()=>{if(state.mode)history.replaceState({},'','#'+state.mode)}};
function restorePage(){
 if(location.hash==='#deals/apply'){enter('deals',false);apply()}
 else if(['#campus','#deals'].includes(location.hash))enter(location.hash.slice(1),false);
}
window.addEventListener('popstate',restorePage);
restorePage();
})();
