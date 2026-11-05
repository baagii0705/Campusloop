/* Solio business sponsor applications and admin operations (independent of user listings). */
(function(){
'use strict';
const API='/api/sponsors';
const $=(s,root=document)=>root.querySelector(s);
const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(cls)e.className=cls;return e};
const urlOk=s=>{try{return new URL(s).protocol==='https:'}catch{return false}};
const toLocal=v=>{if(!v)return '';const d=new Date(v);if(!Number.isFinite(+d))return '';const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);return local.toISOString().slice(0,16)};
const toISO=v=>v?new Date(v).toISOString():null;
const fmtDate=v=>v?new Date(v).toLocaleString('mn-MN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'Хугацаа заагаагүй';
const pct=(v,c)=>v?((c/v)*100).toFixed(1)+'%':'0%';
function elInput(name,label,value='',type='text',required=false){
 const box=make('label',undefined,'solioSponsorField');box.append(make('span',label));const e=make('input');e.name=name;e.type=type;e.value=value??'';e.required=required;if(type==='url')e.placeholder='https://';box.append(e);return box;
}
let dialog;
function ensureDialog(){
 if(dialog)return dialog;
 dialog=make('div',undefined,'solioSponsorOverlay');dialog.id='solioSponsorOverlay';dialog.hidden=true;
 dialog.innerHTML='<div class="solioSponsorDialog" role="dialog" aria-modal="true" aria-labelledby="solioSponsorDialogTitle"><button type="button" class="solioSponsorDismiss" aria-label="Хаах">×</button><div class="solioSponsorEyebrow">SOLIO · БАЙГУУЛЛАГЫН ЗАР</div><h2 id="solioSponsorDialogTitle">Энд танай сурталчилгаа байрлаж болно</h2><p>Solio-ийн оюутнуудад хүрэх сурталчилгааны хүсэлт илгээнэ үү. Бид шалгаад тантай холбогдоно.</p><form id="solioSponsorApplyForm"><div class="solioSponsorFields"><label class="solioSponsorField"><span>Байгууллагын нэр *</span><input name="company" maxlength="100" required></label><label class="solioSponsorField"><span>Холбоо барих хүн *</span><input name="contact_name" maxlength="100" required></label><label class="solioSponsorField"><span>Имэйл *</span><input type="email" name="email" maxlength="254" required></label><label class="solioSponsorField"><span>Утас</span><input name="phone" maxlength="40" inputmode="tel"></label><label class="solioSponsorField"><span>Баннерын зургийн HTTPS холбоос (дараа өгч болно)</span><input type="url" name="image_url" placeholder="https://"></label><label class="solioSponsorField"><span>Сурталчилгаагаар очих HTTPS холбоос</span><input type="url" name="target_url" placeholder="https://"></label><label class="solioSponsorField"><span>Эхлэх өдөр (сонголттой)</span><input type="date" name="start_date"></label><label class="solioSponsorField"><span>Дуусах өдөр (сонголттой)</span><input type="date" name="end_date"></label></div><label class="solioSponsorField"><span>Дэлгэрэнгүй хүсэлт, хугацаа</span><textarea name="message" rows="3" maxlength="1500" placeholder="Байгууллагын сурталчилгааны тухай..."></textarea></label><input class="solioSponsorHoneypot" type="text" name="website" autocomplete="off" tabindex="-1"><p class="solioSponsorPrivacy">Таны холбоо барих мэдээлэл нийтэд харагдахгүй. Хүсэлт илгээх нь төлбөр төлсөн эсвэл зар автоматаар батлагдсан гэсэн үг биш.</p><p id="solioSponsorApplyFeedback" role="status" aria-live="polite"></p><button class="solioSponsorPrimary" type="submit">Хүсэлт илгээх</button></form></div>';
 document.body.append(dialog);
 const close=()=>{dialog.hidden=true;document.body.classList.remove('solioSponsorModalOpen')};
 $('.solioSponsorDismiss',dialog).onclick=close;
 dialog.addEventListener('click',event=>{if(event.target===dialog)close()});
 document.addEventListener('keydown',event=>{if(!dialog.hidden&&event.key==='Escape')close()});
 $('#solioSponsorApplyForm',dialog).addEventListener('submit',submitApplication);
 return dialog;
}
function openApplication(){const d=ensureDialog();d.hidden=false;document.body.classList.add('solioSponsorModalOpen');$('#solioSponsorApplyFeedback',d).textContent='';$('.solioSponsorDialog',d).scrollTop=0;$('.solioSponsorDismiss',d).focus()}
window.SolioSponsorOpen=openApplication;
async function submitApplication(event){
 event.preventDefault();const form=event.currentTarget,data=new FormData(form),msg=$('#solioSponsorApplyFeedback',dialog),btn=$('button[type=submit]',form);
 const input=Object.fromEntries(data.entries());
 input.start_at=input.start_date?input.start_date+'T00:00:00':null;input.end_at=input.end_date?input.end_date+'T23:59:59':null;
 delete input.start_date;delete input.end_date;
 btn.disabled=true;btn.textContent='Илгээж байна...';msg.textContent='';
 try{
  const res=await fetch(API+'/apply',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',body:JSON.stringify(input)});
  const result=await res.json();if(!res.ok)throw Error(result.error||'Хүсэлт илгээгдсэнгүй');
  form.reset();msg.textContent='Хүсэлтийг хүлээн авлаа. Бид таны имэйлээр холбогдоно.';msg.classList.add('solioSponsorSuccess');
 }catch(e){msg.textContent=e.message||'Алдаа гарлаа';msg.classList.remove('solioSponsorSuccess')}
 finally{btn.disabled=false;btn.textContent='Хүсэлт илгээх'}
}
function mountCTA(){
 const footer=document.querySelector('footer');
 if(footer&&!$('#solioSponsorFooterCta')){
  const b=make('button','Байгууллагын сурталчилгаа байрлуулах','solioSponsorFooterCta');b.id='solioSponsorFooterCta';b.type='button';b.onclick=openApplication;footer.prepend(b);
 }
 if(new URLSearchParams(location.search).get('sponsor')==='1')setTimeout(openApplication,250);
}
async function adminApi(method='GET',payload){
 const jwt=await appwriteAccount.createJWT();
 const options={method,headers:{'Authorization':'Bearer '+jwt.jwt,Accept:'application/json'}};
 if(method==='POST'){options.headers['Content-Type']='application/json';options.body=JSON.stringify(payload)}
 const res=await fetch(API+'/admin',options);const body=await res.json();
 if(!res.ok)throw Error(body.error||'Админ үйлдэл амжилтгүй');
 return body;
}
let manager,refreshing=false;
function updateMessage(text,kind=''){if(!manager)return;const e=$('.solioSponsorAdminMessage',manager);e.textContent=text;e.dataset.kind=kind}
async function mutation(payload){
 try{await adminApi('POST',payload);updateMessage('Амжилттай шинэчлэгдлээ.','ok');window.SolioSponsorRefresh?.();await loadAdmin()}
 catch(e){updateMessage(e.message,'error')}
}
function requestForm(record){
 const form=make('form',undefined,'solioSponsorAdminForm');
 form.append(elInput('company','Байгууллага',record.company,'text',true),elInput('image_url','Баннерын зураг (HTTPS)',record.image_url,'url',true),elInput('target_url','Очих холбоос (HTTPS)',record.target_url,'url',true),elInput('start_at','Эхлэх',toLocal(record.start_at),'datetime-local'),elInput('end_at','Дуусах',toLocal(record.end_at),'datetime-local'));
 form.append(elInput('admin_notes','Админы тэмдэглэл','','text'));
 const actions=make('div',undefined,'solioSponsorAdminActions');
 const approve=make('button','Зөвшөөрөх','solioSponsorPrimary');approve.type='submit';
 const reject=make('button','Татгалзах','solioSponsorSecondary');reject.type='button';
 reject.onclick=()=>{if(confirm(record.company+' хүсэлтэд татгалзах уу?'))mutation({action:'reject',id:record.id,admin_notes:form.elements.admin_notes.value})};
 actions.append(approve,reject);form.append(actions);
 form.onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(form));if(!urlOk(f.image_url)||!urlOk(f.target_url)){updateMessage('HTTPS холбоос оруулна уу','error');return}mutation({action:'approve',id:record.id,company:f.company,image_url:f.image_url,target_url:f.target_url,start_at:toISO(f.start_at),end_at:toISO(f.end_at),admin_notes:f.admin_notes})};
 return form;
}
function drawRequests(data){
 const root=$('#solioSponsorPendingRequests',manager);root.replaceChildren();
 const requests=data.requests||[];
 $('#solioSponsorPendingCount',manager).textContent=requests.filter(r=>r.status==='pending').length;
 if(!requests.length){root.append(make('p','Одоогоор хүсэлт ирээгүй.'));return}
 const sorted=[...requests].sort((a,b)=>(a.status==='pending'?0:1)-(b.status==='pending'?0:1));
 for(const item of sorted){
  const card=make('article',undefined,'solioSponsorAdminCard');
  const head=make('div',undefined,'solioSponsorCardHead');head.append(make('strong',item.company),make('small',item.status==='pending'?'Хүлээгдэж байна':item.status==='approved'?'Зөвшөөрсөн':'Татгалзсан'));card.append(head);
  card.append(make('p',item.contact_name+' · '+item.email+(item.phone?' · '+item.phone:'')));
  if(item.message)card.append(make('p',item.message));
  card.append(make('small','Илгээсэн: '+fmtDate(item.created_at)));
  if(item.status==='pending')card.append(requestForm(item));
  root.append(card);
 }
}
function campaignForm(item){
 const form=make('form',undefined,'solioSponsorAdminForm');
 form.append(elInput('company','Байгууллага',item.company,'text',true),elInput('image_url','Баннерын зураг',item.image_url,'url',true),elInput('target_url','Очих холбоос',item.target_url,'url',true),elInput('start_at','Эхлэх',toLocal(item.start_at),'datetime-local'),elInput('end_at','Дуусах',toLocal(item.end_at),'datetime-local'));
 const actions=make('div',undefined,'solioSponsorAdminActions');
 const save=make('button','Хадгалах','solioSponsorPrimary');save.type='submit';
 const toggle=make('button',item.active?'Түр зогсоох':'Идэвхжүүлэх','solioSponsorSecondary');toggle.type='button';
 toggle.onclick=()=>mutation({action:'toggle',id:item.id,active:!item.active});
 actions.append(save,toggle);form.append(actions);
 form.onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(form));mutation({action:'update',id:item.id,company:f.company,image_url:f.image_url,target_url:f.target_url,start_at:toISO(f.start_at),end_at:toISO(f.end_at)})};
 return form;
}
function drawCampaigns(data){
 const root=$('#solioSponsorCampaigns',manager);root.replaceChildren();
 const campaigns=data.campaigns||[],daily=data.daily||[];
 $('#solioSponsorCampaignCount',manager).textContent=campaigns.filter(c=>c.active).length;
 $('#solioSponsorViews',manager).textContent=campaigns.reduce((sum,c)=>sum+Number(c.views||0),0).toLocaleString();
 $('#solioSponsorClicks',manager).textContent=campaigns.reduce((sum,c)=>sum+Number(c.clicks||0),0).toLocaleString();
 if(!campaigns.length){root.append(make('p','Баталсан кампанит ажил алга байна.'));return}
 for(const item of campaigns){
  const card=make('article',undefined,'solioSponsorAdminCard');
  const head=make('div',undefined,'solioSponsorCardHead');
  head.append(make('strong',item.company),make('small',item.active?'Идэвхтэй':'Түр зогсоосон'));card.append(head);
  const v=Number(item.views||0),c=Number(item.clicks||0);
  card.append(make('p','Үзсэн сешн: '+v+' · Дарсан сешн: '+c+' · CTR: '+pct(v,c)));
  card.append(make('small','Хугацаа: '+fmtDate(item.start_at)+' — '+fmtDate(item.end_at)));
  const dailyRows=daily.filter(d=>d.campaign_id===item.id);
  if(dailyRows.length){
   const details=make('details');details.append(make('summary','Сүүлийн 30 хоногийн статистик'));
   for(const day of dailyRows)details.append(make('p',day.day+' · Үзэлт '+day.views+' · Даралт '+day.clicks));
   card.append(details);
  }
  card.append(campaignForm(item));root.append(card);
 }
}
async function loadAdmin(){
 if(!manager||!isCampusAdmin()||refreshing)return;
 refreshing=true;updateMessage('Ачаалж байна...');
 try{const data=await adminApi();drawRequests(data);drawCampaigns(data);updateMessage('Статистик нь өдөрт нэг сешнийг нэг удаа тоолно.','ok')}
 catch(e){updateMessage('Алдаа: '+e.message,'error')}
 finally{refreshing=false}
}
function setupManager(){
 const panel=document.getElementById('adminPanel');if(!panel||manager)return;
 manager=make('section',undefined,'solioSponsorD1Admin');manager.id='solioSponsorD1Admin';
 manager.innerHTML='<h3>Байгууллагын зар — хүсэлт ба статистик</h3><p>Хүсэлтийг шалгаж зөвшөөрсний дараа л баннер нийтлэгдэнэ. Хэрэглэгчдийн энгийн зараас тусдаа.</p><div class="solioSponsorAdminTotals"><div>Хүлээгдэж буй<strong id="solioSponsorPendingCount">0</strong></div><div>Идэвхтэй баннер<strong id="solioSponsorCampaignCount">0</strong></div><div>Үзсэн сешн<strong id="solioSponsorViews">0</strong></div><div>Дарсан сешн<strong id="solioSponsorClicks">0</strong></div></div><button type="button" class="solioSponsorSecondary" id="solioSponsorRefreshAdmin">Шинэчлэх</button><p class="solioSponsorAdminMessage" role="status" aria-live="polite"></p><h4>Ирсэн хүсэлтүүд</h4><div id="solioSponsorPendingRequests" class="solioSponsorAdminRows"></div><h4>Баталсан сурталчилгаа</h4><div id="solioSponsorCampaigns" class="solioSponsorAdminRows"></div><h4>Шууд зар нэмэх</h4><form id="solioSponsorDirectForm" class="solioSponsorAdminForm"><label class="solioSponsorField"><span>Байгууллагын нэр *</span><input name="company" required></label><label class="solioSponsorField"><span>Баннерын HTTPS зураг *</span><input type="url" name="image_url" required></label><label class="solioSponsorField"><span>Очих HTTPS холбоос *</span><input type="url" name="target_url" required></label><label class="solioSponsorField"><span>Эхлэх</span><input type="datetime-local" name="start_at"></label><label class="solioSponsorField"><span>Дуусах</span><input type="datetime-local" name="end_at"></label><button type="submit" class="solioSponsorPrimary">Шууд нэмэх</button></form>';
 panel.append(manager);
 $('#solioSponsorRefreshAdmin',manager).onclick=loadAdmin;
 $('#solioSponsorDirectForm',manager).onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget));mutation({action:'create',company:f.company,image_url:f.image_url,target_url:f.target_url,start_at:toISO(f.start_at),end_at:toISO(f.end_at)}).then(()=>e.target.reset())};
 const observer=new MutationObserver(()=>{if(!panel.hidden&&isCampusAdmin())loadAdmin()});
 observer.observe(panel,{attributes:true,attributeFilter:['hidden']});
 if(!panel.hidden&&isCampusAdmin())loadAdmin();
}
mountCTA();setupManager();
})();
