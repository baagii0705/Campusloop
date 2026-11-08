/* Public sponsored placements: approved campaigns and existing banners. */
(function(){
'use strict';
const COLLECTION='sponsored_ads';
const bar=document.createElement('aside');bar.id='solioSponsorBar';bar.setAttribute('aria-label','Ивээн тэтгэсэн сурталчилгаа');
bar.innerHTML='<a class="sponsorLink" target="_blank" rel="noopener noreferrer sponsored"><img class="sponsorImage" alt=""><span class="sponsorCopy"><span class="sponsorTag">Ивээн тэтгэсэн</span><span class="sponsorName"></span></span></a><button type="button" class="sponsorClose" aria-label="Сурталчилгааг хаах">×</button>';
document.body.appendChild(bar);
const nav=document.querySelector('.mobileBottomNav');
let ads=[],current=0,feedAds=[],feedCurrent=0,closed=false,rotateTimer=null;
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
  copy.append(sponsoredElement('h3','','Энд таны байгууллагын зар байрлана'),sponsoredElement('p','','Оюутнуудад хүрэх сурталчилгааны байршил, үнийн мэдээлэл.'));
  intro.append(copy);
  card.append(intro);
  const button=sponsoredElement('button','solioFeedSponsorAction','Байршил, үнэ үзэх →');
  button.type='button';
  button.addEventListener('click',()=>{if(typeof window.SolioSponsorOpen==='function')window.SolioSponsorOpen('feed');else location.assign('/?sponsor=1&placement=feed')});
  card.append(button);
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
 // A wide banner starts on a full row at every screen width.
 const columns=Math.max(1,getComputedStyle(marketplaceRoot).gridTemplateColumns.split(' ').length);
 const target=Math.min(10,items.length);
 const slot=Math.min(items.length,Math.max(columns,Math.floor(target/columns)*columns));
 const previous=items[slot-1];
 if(existing&&!force&&existing.dataset.sponsorId===ad.$id){
  if(previous.nextElementSibling!==existing)previous.after(existing);
  return;
 }
 if(existing)existing.remove();
 stopInFeedView();
 inFeedCard=makeInFeedCard(ad);
 previous.after(inFeedCard);
 observeInFeedView(inFeedCard,ad);
}
if(marketplaceRoot){
 const feedMutationObserver=new MutationObserver(()=>refreshInFeed());
 feedMutationObserver.observe(marketplaceRoot,{childList:true});
 if(window.ResizeObserver)new ResizeObserver(()=>refreshInFeed()).observe(marketplaceRoot);
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
  ads=bottomActive;
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
if('requestIdleCallback' in window)requestIdleCallback(()=>load(),{timeout:1500});else setTimeout(load,500);
setInterval(()=>{if(!document.hidden)load()},60000);
})();
