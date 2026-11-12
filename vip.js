(()=>{
const $=id=>document.getElementById(id);let active=new Map(),mine=new Map();
async function api(body,path=''){
 const jwt=body||path==='?mode=mine'?await appwriteAccount.createJWT():null;
 const r=await fetch('/api/vip',{method:body?'POST':'GET',headers:{...(jwt?{Authorization:'Bearer '+jwt.jwt}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const data=await r.json();if(!r.ok)throw Error(data.error||'Алдаа гарлаа.');return data
}
function isActive(id){const expires=active.get(id);return !!expires&&Date.parse(expires)>Date.now()}
function statusFor(id){return mine.get(id)?.status||''}
function decorate(){
 document.querySelectorAll('#cards [data-open]').forEach(card=>{
  const vip=isActive(card.dataset.open)&&!card.querySelector('.solioStatusSold');card.classList.toggle('vipListing',!!vip);
  let badge=card.querySelector('.vipBadge');
  if(vip&&!badge){badge=document.createElement('span');badge.className='vipBadge';badge.textContent='VIP';card.querySelector('.boardMedia')?.append(badge)}
  else if(!vip)badge?.remove();
  const item=listings.find(x=>x.id===card.dataset.open),status=statusFor(item?.id);
  if(item?.user_id===session?.user?.id&&status){
   const label={pending:'VIP хүсэлт хянагдаж байна',active:'VIP идэвхтэй',rejected:'VIP хүсэлт татгалзсан'}[status]||status;
   let request=card.querySelector('.vipRequestStatus');
   if(!request){request=document.createElement('small');request.className='vipRequestStatus';card.querySelector('.boardListingInfo')?.append(request)}
   request.textContent=label;
  }
 });
 document.querySelectorAll('[data-vip-listing]').forEach(detail=>{
  const id=detail.dataset.vipListing,vip=isActive(id)&&listings.find(x=>x.id===id)?.status!=='sold';let badge=detail.querySelector('.vipDetailBadge');
  if(vip&&!badge){badge=document.createElement('span');badge.className='vipDetailBadge';badge.textContent='VIP · Онцлох зар';detail.prepend(badge)}
  else if(!vip)badge?.remove()
 });
}
async function refreshMine(){
 if(!session){mine=new Map();decorate();return}
 try{const data=await api(null,'?mode=mine');mine=new Map(data.items.map(x=>[x.listing_id,x]));decorate()}
 catch(error){console.warn('VIP хүсэлтийн төлөв:',error.message)}
}
api().then(data=>{active=new Map(data.items.map(x=>[x.listing_id,x.expires_at]));decorate();render?.()}).catch(error=>console.warn('VIP мэдээлэл:',error.message));
appwriteAuth.onAuthStateChange(()=>refreshMine());if(session)refreshMine();
new MutationObserver(decorate).observe($('cards'),{childList:true});setInterval(decorate,60000);
window.SolioVIP={
 decorate,isActive,statusFor,refreshMine,
 refresh:async()=>{const data=await api();active=new Map(data.items.map(x=>[x.listing_id,x.expires_at]));decorate();render?.()},
 submitRequest:id=>api({action:'request',id}),
 request(id){requireSolioAccount(()=>{SolioUX.listingForm(id,'Зараа VIP болгох','<p>Зар чинь жагсаалтад онцлох хүрээ, VIP тэмдэгтэй харагдана. Админ хүсэлтийг хянаж, хугацааг баталсны дараа идэвхжинэ.</p><p>Энэ хүсэлт төлбөр автоматаар авахгүй.</p>','VIP хүсэлт илгээх',async()=>{await api({action:'request',id});await refreshMine();toast('VIP хүсэлт илгээгдлээ. Админ хянаж батална.')})},'VIP зарын хүсэлт')},
 onActiveLoaded:()=>{}
};
})();
