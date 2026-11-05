/* Solio sponsored placements. Appwrite collection permissions enforce admin writes. */
(function(){
'use strict';
const COLLECTION='sponsored_ads';
const bar=document.createElement('aside');bar.id='solioSponsorBar';bar.setAttribute('aria-label','Ивээн тэтгэсэн сурталчилгаа');
bar.innerHTML='<a class="sponsorLink" target="_blank" rel="noopener noreferrer sponsored"><img class="sponsorImage" alt=""><span class="sponsorCopy"><span class="sponsorTag">Ивээн тэтгэсэн</span><span class="sponsorName"></span></span></a><button type="button" class="sponsorClose" aria-label="Сурталчилгааг хаах">×</button>';
document.body.appendChild(bar);
const nav=document.querySelector('.mobileBottomNav');
let ads=[],current=0,feedAds=[],feedCurrent=0,closed=false,rotateTimer=null;
let sponsorRates={
 feed:{label:'Зарын дунд — өргөн баннер',description:'Бүтэн өргөн',prices:{7:15000,30:45000}},
 bottom:{label:'Утасны доод баннер',description:'Доод цэсний дээр',prices:{7:10000,30:30000}},
 both:{label:'Хоёр байрлалд зэрэг',description:'Хоёр газарт зэрэг',prices:{7:22000,30:60000}}
};
import('/sponsor-pricing.js').then(m=>{sponsorRates=m.SPONSOR_RATES;refreshInFeed(true)}).catch(e=>console.warn('Sponsor pricing unavailable:',e.message));
let sessionId;
try{sessionId=sessionStorage.getItem('solioSponsorSession');if(!sessionId){sessionId=crypto.randomUUID();sessionStorage.setItem('solioSponsorSession',sessionId)}}catch{sessionId=crypto.randomUUID()}
function track(kind,id){
 if(!id||!sessionId)return;
 const body=JSON.stringify({campaign_id:id,session_id:sessionId,kind});
 if(kind==='click'&&navigator.sendBeacon){
  try{if(navigator.sendBeacon('/api/sponsors/event',new Blob([body],{type:'application/json'})))return}catch{}
 }
 fetch('/api/sponsors/event',{method:'POST',headers:{'Content-Type':'application/json'},body,credentials:'omit',keepalive:true}).catch(()=>{});
}
function validUrl(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null}}
function syncPosition(){if(!nav)return;const h=Math.ceil(nav.getBoundingClientRect().height);document.documentElement.style.setProperty('--solio-nav-height',h+'px');document.documentElement.style.setProperty('--solio-sponsor-extra','82px')}
syncPosition();window.addEventListener('resize',syncPosition);if(nav&&window.ResizeObserver)new ResizeObserver(syncPosition).observe(nav);
function show(){
 const ad=ads[current];if(!ad||closed){bar.classList.remove('is-visible');document.body.classList.remove('solio-sponsor-visible');return}
 const placeholder=ad.$id==='solio_welcome_demo';
 const href=validUrl(ad.target_url),img=validUrl(ad.image_url);
 if(!placeholder&&(!href||!img)){bar.classList.remove('is-visible');document.body.classList.remove('solio-sponsor-visible');return}
 const link=bar.querySelector('.sponsorLink');
 const photo=bar.querySelector('.sponsorImage');
 bar.classList.toggle('is-placeholder',placeholder);
 photo.hidden=placeholder;
 if(placeholder){
  photo.removeAttribute('src');
  link.removeAttribute('href');
  link.removeAttribute('target');
  link.setAttribute('aria-label','Энд таны зар байрлана — хүсэлт илгээх');
  link.setAttribute('role','button');link.tabIndex=0;
 }else{
  link.href=href;
  link.target='_blank';
  link.removeAttribute('aria-label');link.removeAttribute('role');link.removeAttribute('tabindex');
  photo.src=img;
 }
 bar.querySelector('.sponsorTag').textContent=placeholder?'Сурталчилгааны талбай':'Ивээн тэтгэсэн';
 bar.querySelector('.sponsorName').textContent=placeholder?'Энд таны зар байрлана':String(ad.name||'Байгууллагын сурталчилгаа');
 bar.classList.add('is-visible');document.body.classList.add('solio-sponsor-visible');syncPosition();
 if(ad._d1){const id=ad.$id;setTimeout(()=>{if(ads[current]?.$id===id&&!document.hidden&&bar.classList.contains('is-visible')){const rect=bar.getBoundingClientRect();if(rect.width>0&&rect.top<innerHeight&&rect.bottom>0)track('view',id)}},1100)}

}
bar.querySelector('.sponsorClose').addEventListener('click',()=>{closed=true;show()});
bar.querySelector('.sponsorLink').addEventListener('click',event=>{
 const ad=ads[current];if(!ad)return;
 if(ad.$id==='solio_welcome_demo'){event.preventDefault();window.SolioSponsorOpen?.();return}
 if(ad._d1)track('click',ad.$id);
});
bar.querySelector('.sponsorLink').addEventListener('keydown',event=>{
 if(ads[current]?.$id==='solio_welcome_demo'&&(event.key==='Enter'||event.key===' ')){event.preventDefault();window.SolioSponsorOpen?.()}
});
window.SolioSponsorRefresh=()=>load();

// Marketplace sponsored slot — never added to Appwrite listings or marketplace counts.
const marketplaceRoot=document.getElementById('cards');
let inFeedCard=null,inFeedViewObserver=null,inFeedViewTimer=null;
function stopInFeedView(){
 if(inFeedViewObserver){inFeedViewObserver.disconnect();inFeedViewObserver=null}
 if(inFeedViewTimer){clearTimeout(inFeedViewTimer);inFeedViewTimer=null}
}
function sponsoredElement(tag,className,textValue){
 const el=document.createElement(tag);
 if(className)el.className=className;
 if(textValue!==undefined)el.textContent=String(textValue);
 return el;
}
function makeInFeedCard(ad){
 const isPlaceholder=ad.$id==='solio_welcome_demo';
 const card=sponsoredElement('article','solioFeedSponsor'+(isPlaceholder?' is-placeholder':''));
 card.setAttribute('aria-label',isPlaceholder?'Сурталчилгаа байрлуулах боломж':'Ивээн тэтгэсэн сурталчилгаа');
 card.dataset.sponsorId=ad.$id;
 const mark=sponsoredElement('span','solioFeedSponsorTag',isPlaceholder?'СУРТАЛЧИЛГААНЫ ТАЛБАЙ':'ИВЭЭН ТЭТГЭСЭН');
 card.append(mark);
 if(isPlaceholder){
  const intro=sponsoredElement('div','solioFeedSponsorIntro');
  const copy=sponsoredElement('div','solioFeedSponsorCopy');
  copy.append(sponsoredElement('h3','','Энд таны байгууллагын зар байрлана'),sponsoredElement('p','','Заруудын дунд бүтэн өргөнөөр, эсвэл утасны доод хэсэгт сурталчилгаа байрлуулаарай.'));
  intro.append(copy);
  card.append(intro);
  const offers=sponsoredElement('div','solioFeedSponsorRates');
  for(const [placement,plan] of Object.entries(sponsorRates)){
   const offer=sponsoredElement('button','solioFeedSponsorOffer');
   offer.type='button';
   const title=sponsoredElement('strong','',plan.label);
   const days7=sponsoredElement('span','','7 хоног — '+Number(plan.prices[7]).toLocaleString('en-US')+' ₮');
   const days30=sponsoredElement('span','','30 хоног — '+Number(plan.prices[30]).toLocaleString('en-US')+' ₮');
   offer.append(title,days7,days30);
   offer.addEventListener('click',()=>{if(typeof window.SolioSponsorOpen==='function')window.SolioSponsorOpen(placement);else location.assign('/?sponsor=1&placement='+encodeURIComponent(placement))});
   offers.append(offer);
  }
  card.append(offers);
  const actions=sponsoredElement('div','solioFeedSponsorBottom');
  const note=sponsoredElement('small','','Танилцуулах тариф · Төлбөр автоматаар авахгүй');
  const button=sponsoredElement('button','solioFeedSponsorAction','Байршил сонгож хүсэлт илгээх');
  button.type='button';
  button.addEventListener('click',()=>{if(typeof window.SolioSponsorOpen==='function')window.SolioSponsorOpen('feed');else location.assign('/?sponsor=1&placement=feed')});
  actions.append(note,button);card.append(actions);
 }else{
  const link=sponsoredElement('a','solioFeedSponsorLink');
  link.href=validUrl(ad.target_url);
  link.target='_blank';
  link.rel='noopener noreferrer sponsored';
  const photo=sponsoredElement('div','solioFeedSponsorPhoto');
  const image=document.createElement('img');
  image.src=validUrl(ad.image_url);image.alt='';
  image.loading='lazy';image.decoding='async';
  image.onerror=()=>{image.hidden=true;photo.classList.add('solioFeedImageFailed')};
  photo.append(image);
  link.append(photo,sponsoredElement('h3','',ad.name||'Байгууллагын сурталчилгаа'),sponsoredElement('span','solioFeedSponsorVisit','Дэлгэрэнгүй үзэх ↗'));
  link.addEventListener('click',()=>{if(ad._d1)track('click',ad.$id)});
  card.append(link);
 }
 return card;
}
function observeInFeedView(card,ad){
 stopInFeedView();
 if(!ad._d1||typeof IntersectionObserver==='undefined')return;
 inFeedViewObserver=new IntersectionObserver(entries=>{
  const entry=entries[0];
  if(!entry||!entry.isIntersecting||entry.intersectionRatio<0.5||document.hidden)return;
  if(inFeedViewTimer)return;
  inFeedViewTimer=setTimeout(()=>{
   inFeedViewTimer=null;
   if(!card.isConnected||document.hidden)return;
   const r=card.getBoundingClientRect();
   if(r.width>0&&r.height>0&&r.top<innerHeight*.85&&r.bottom>innerHeight*.15)track('view',ad.$id);
  },1100);
  inFeedViewObserver?.disconnect();
 },{threshold:[0.5]});
 inFeedViewObserver.observe(card);
}
function refreshInFeed(force=false){
 if(!marketplaceRoot)return;
 const existing=marketplaceRoot.querySelector('.solioFeedSponsor');
 const items=Array.from(marketplaceRoot.querySelectorAll(':scope > article.solioProductCard'));
 // Private "My listings" and saved-only views must show only the user's actual items.
 const privateMode=(typeof onlyMine!=='undefined'&&onlyMine)||(typeof savedOnly!=='undefined'&&savedOnly);
 if(items.length<4||privateMode){
  if(existing)existing.remove();
  stopInFeedView();inFeedCard=null;return;
 }
 const ad=feedAds[feedCurrent]||{$id:'solio_welcome_demo',name:'Энд таны зар байрлана'};
 if(existing&&!force&&existing.dataset.sponsorId===ad.$id)return;
 if(existing)existing.remove();
 stopInFeedView();
 const slot=Math.min(6,Math.max(2,Math.floor(items.length/2)));
 inFeedCard=makeInFeedCard(ad);
 items[slot-1].after(inFeedCard);
 observeInFeedView(inFeedCard,ad);
}
if(marketplaceRoot){
 const feedMutationObserver=new MutationObserver(()=>refreshInFeed());
 feedMutationObserver.observe(marketplaceRoot,{childList:true});
 refreshInFeed();
}

async function load(){
 try{
  let d1=[],legacy=[];
  try{
   const request=await fetch('/api/sponsors/active',{credentials:'omit',cache:'no-store'});
   if(request.ok){const response=await request.json();
    d1=(response.campaigns||[]).map(c=>({...c,$id:c.id,name:c.company,active:true,_d1:true}));
   }
  }catch(error){console.warn('Solio approved sponsors unavailable:',error.message)}
  try{
   let response;
   try{
    const request=await fetch('/api/public/sponsored_ads?limit=100',{credentials:'omit',cache:'no-store'});
    if(!request.ok)throw new Error('Legacy banner API HTTP '+request.status);
    response=await request.json();
   }catch{response=await appwriteDatabases.listDocuments(APPWRITE_CONFIG.databaseId,COLLECTION,[Appwrite.Query.limit(100)])}
   legacy=response.documents||[];
  }catch(error){console.warn('Solio legacy sponsored banners unavailable:',error.message)}
  const now=Date.now();
  const accepted=ad=>ad.active===true&&(!ad.start_at||Date.parse(ad.start_at)<=now)&&(!ad.end_at||Date.parse(ad.end_at)>now)&&validUrl(ad.target_url)&&validUrl(ad.image_url);
  d1=d1.filter(accepted);legacy=legacy.filter(accepted);
  const bottomActive=[...d1.filter(ad=>ad.placement==='bottom'||ad.placement==='both'),...legacy.filter(ad=>ad.$id!=='solio_welcome_demo')];
  ads=bottomActive.length?bottomActive:legacy.filter(ad=>ad.$id==='solio_welcome_demo');
  feedAds=d1.filter(ad=>ad.placement==='feed'||ad.placement==='both');
  current=0;feedCurrent=0;show();refreshInFeed(true);
  clearInterval(rotateTimer);
  if(ads.length>1||feedAds.length>1)rotateTimer=setInterval(()=>{
   if(document.hidden)return;
   if(ads.length>1){current=(current+1)%ads.length;if(!closed)show()}
   if(feedAds.length>1){feedCurrent=(feedCurrent+1)%feedAds.length;refreshInFeed(true)}
  },9000);
  }catch(e){console.warn('Solio sponsored ads unavailable:',e.message);ads=[];show();refreshInFeed(true)}
}
async function adminList(root){
 const list=root.querySelector('#solioSponsorAdminList');list.textContent='Ачаалж байна...';
 try{
 const response=await appwriteDatabases.listDocuments(APPWRITE_CONFIG.databaseId,COLLECTION,[Appwrite.Query.limit(100)]);
 list.replaceChildren();
 for(const ad of response.documents||[]){
 const item=document.createElement('div');item.className='sponsorAdminItem';
 const title=document.createElement('span');title.textContent=(ad.name||'Зар')+' — '+(ad.active?'Идэвхтэй':'Идэвхгүй');
 const actions=document.createElement('span');
 const toggle=document.createElement('button');toggle.type='button';toggle.textContent=ad.active?'Унтраах':'Идэвхжүүлэх';
 toggle.onclick=async()=>{try{await appwriteDatabases.updateDocument(APPWRITE_CONFIG.databaseId,COLLECTION,ad.$id,{active:!ad.active});await adminList(root);await load()}catch(e){alert(e.message)}};
 const remove=document.createElement('button');remove.type='button';remove.textContent='Устгах';remove.style.marginLeft='5px';
 remove.onclick=async()=>{if(!confirm('Энэ сурталчилгааг устгах уу?'))return;try{await appwriteDatabases.deleteDocument(APPWRITE_CONFIG.databaseId,COLLECTION,ad.$id);await adminList(root);await load()}catch(e){alert(e.message)}};
 actions.append(toggle,remove);item.append(title,actions);list.append(item);
 }
 }catch(e){list.textContent='Сурталчилгааны collection эсвэл админ эрхийг шалгана уу: '+e.message}
}
function setupAdmin(){
 const panel=document.getElementById('adminPanel');if(!panel||document.getElementById('solioSponsorAdmin'))return;
 const root=document.createElement('section');root.id='solioSponsorAdmin';
 root.innerHTML='<h3>Хуучин Appwrite баннерууд</h3><p>Зөвхөн хуучин баннерын удирдлага. Шинэ сурталчилгаа болон статистикийг дээд хэсгээс удирдана.</p><form id="solioSponsorForm"><div class="sponsorAdminFields"><input name="name" placeholder="Байгууллагын нэр" maxlength="100" required><input name="image_url" type="url" placeholder="Зургийн HTTPS URL" required><input name="target_url" type="url" placeholder="Очих HTTPS холбоос" required><label>Эхлэх хугацаа<input name="start_at" type="datetime-local"></label><label>Дуусах хугацаа<input name="end_at" type="datetime-local"></label></div><p><button type="submit">Сурталчилгаа нэмэх</button></p></form><div id="solioSponsorAdminList"></div>';
 panel.appendChild(root);
 root.querySelector('form').addEventListener('submit',async event=>{
 event.preventDefault();if(!isCampusAdmin())return;
 const f=new FormData(event.currentTarget);
 const name=String(f.get('name')||'').trim(),image_url=validUrl(f.get('image_url')),target_url=validUrl(f.get('target_url'));
 if(!image_url||!target_url){alert('Зөв http/https холбоос оруулна уу');return}
 const start=f.get('start_at'),end=f.get('end_at');
 const start_at=start?new Date(start).toISOString():null,end_at=end?new Date(end).toISOString():null;
 if(start_at&&end_at&&end_at<=start_at){alert('Дуусах хугацаа эхлэх хугацаанаас хойш байх ёстой');return}
 try{await appwriteDatabases.createDocument(APPWRITE_CONFIG.databaseId,COLLECTION,Appwrite.ID.unique(),{name,image_url,target_url,start_at,end_at,active:true});event.currentTarget.reset();await adminList(root);await load()}catch(e){alert('Зар нэмэх боломжгүй: '+e.message)}
 });
 const observer=new MutationObserver(()=>{if(!panel.hidden&&isCampusAdmin())adminList(root)});
 observer.observe(panel,{attributes:true,attributeFilter:['hidden']});
}
setupAdmin();load();setInterval(load,60000);
})();
