/* Public business advertising application and pricing. */
(function(){
'use strict';
const API='/api/sponsors';
// Introductory MNT prices: server validates the same catalog before saving.
let sponsorRates={
 feed:{label:'Зарын дунд — өргөн баннер',description:'6 дахь зарын дараа, бүтэн өргөн',prices:{7:15000,30:45000}},
 bottom:{label:'Утасны доод баннер',description:'Доод цэсний дээр',prices:{7:10000,30:30000}},
 both:{label:'Хоёр байрлалд зэрэг',description:'Зарын дунд + доод баннер',prices:{7:22000,30:60000}}
};
const formatMNT=n=>Number(n||0).toLocaleString('en-US')+' ₮';
function updateSponsorQuote(){
 if(!dialog)return;
 const form=$('#solioSponsorApplyForm',dialog),place=form?.elements.placement,days=form?.elements.duration_days;
 if(!place||!days)return;
 const amount=sponsorRates[place.value]?.prices[days.value];
 const out=$('#solioSponsorQuotedPrice',dialog);
 if(out)out.textContent=amount!=null?formatMNT(amount):'Сонголтоо шалгана уу';
 dialog.querySelectorAll('[data-plan-placement]').forEach(b=>b.classList.toggle('selected',b.dataset.planPlacement===place.value));
}
import('/sponsor-pricing.js').then(m=>{sponsorRates=m.SPONSOR_RATES;updateSponsorQuote()}).catch(e=>console.warn('Solio pricing catalog:',e.message));
const $=(s,root=document)=>root.querySelector(s);
const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(cls)e.className=cls;return e};
function elSelect(name,label,value,options){
 const wrapper=make('label',undefined,'solioSponsorField');
 wrapper.append(make('span',label));
 const select=make('select');select.name=name;
 for(const [key,text] of options){const opt=make('option',text);opt.value=String(key);select.append(opt)}
 select.value=String(value??options[0][0]);wrapper.append(select);return wrapper;
}
function buildPricingPicker(form){
 const section=make('section',undefined,'solioSponsorPricePicker');
 section.innerHTML='<h3>Байршил болон үнэ</h3><p>Сурталчилгаа хаана, хэд хоног гарахаа сонгоно уу.</p>';
 const cards=make('div',undefined,'solioSponsorPriceCards');
 for(const [key,p] of Object.entries(sponsorRates)){
  const b=make('button',undefined,'solioSponsorPriceOption');
  b.type='button';b.dataset.planPlacement=key;
  b.append(make('strong',p.label),make('small',p.description),make('span','7 хоног · '+formatMNT(p.prices[7])),make('span','30 хоног · '+formatMNT(p.prices[30])));
  b.addEventListener('click',()=>{form.elements.placement.value=key;updateSponsorQuote()});
  cards.append(b);
 }
 section.append(cards);
 const controls=make('div',undefined,'solioSponsorChoiceControls');
 controls.append(elSelect('placement','Хаана байрлах вэ?','feed',Object.keys(sponsorRates).map(key=>[key,sponsorRates[key].label])),elSelect('duration_days','Хэд хоног?','7',[[7,'7 хоног'],[30,'30 хоног']]));
 section.append(controls);
 const total=make('div',undefined,'solioSponsorPriceTotal');
 total.append(make('span','Сонгосон багцын нийт үнэ'));
 const strong=make('strong');strong.id='solioSponsorQuotedPrice';total.append(strong);
 section.append(total);
 section.append(make('small','Танилцуулах тариф (₮). Төлбөр энэ маягтаар автоматаар суутгахгүй. Хүсэлт шалгаж зөвшөөрсний дараа төлбөрийг тохиролцоно.'));
 form.prepend(section);
 controls.querySelectorAll('select').forEach(el=>el.addEventListener('change',updateSponsorQuote));
 updateSponsorQuote();
}

/* Four short steps instead of asking organizations to complete one long form. */
function setupSponsorWizard(form){
 const picker=form.querySelector('.solioSponsorPricePicker');
 const originalFields=form.querySelector('.solioSponsorFields');
 const message=form.elements.message?.closest('label');
 const privacy=form.querySelector('.solioSponsorPrivacy');
 const feedback=form.querySelector('#solioSponsorApplyFeedback');
 const submit=form.querySelector('.solioSponsorPrimary');
 const stepNames=['Байрлал, үнэ','Байгууллага','Зарын мэдээлэл','Баталгаажуулах'];
 const wizard=make('div',undefined,'solioSponsorWizard');
 const progress=make('ol',undefined,'solioSponsorSteps');
 const sections=stepNames.map((name,index)=>{
  const li=make('li',String(index+1)+'. '+name);progress.append(li);
  const section=make('section',undefined,'solioSponsorStep');
  section.dataset.step=String(index);section.hidden=index!==0;
  section.setAttribute('aria-label',name);
  return section;
 });
 wizard.append(progress,...sections);
 sections[0].append(make('h3','1. Сурталчилгааны байрлал, хугацаагаа сонгоно уу'),picker);
 sections[1].append(make('h3','2. Танай байгууллагатай хэрхэн холбогдох вэ?'));
 const contactGrid=make('div',undefined,'solioSponsorFields');
 const creativeGrid=make('div',undefined,'solioSponsorFields');
 function move(name,destination){
  const node=originalFields.querySelector('[name="'+name+'"]')?.closest('label');
  if(node)destination.append(node);
 }
 for(const name of ['company','contact_name','email','phone'])move(name,contactGrid);
 sections[1].append(contactGrid);
 sections[1].append(make('p','Нэр, имэйлээ зөв оруулаарай. Хүсэлтийн төлөвөө имэйлээрээ шалгана.'));
 sections[2].append(make('h3','3. Зарынхаа мэдээллийг оруулна уу'));
 for(const name of ['image_url','target_url','start_date'])move(name,creativeGrid);
 sections[2].append(creativeGrid);
 if(message)sections[2].append(message);
 sections[2].append(make('p','Зураг болон холбоос одоохондоо бэлэн биш бол хоосон үлдээж болно. Админтай тохиролцож дараа нь өгөх боломжтой.'));
 const creativePreview=make('div',undefined,'solioSponsorCreativePreview');
 const previewPic=make('img');previewPic.alt='Сурталчилгааны зураг урьдчилан харах';previewPic.referrerPolicy='no-referrer';previewPic.hidden=true;
 const previewText=make('span','Зургийн HTTPS холбоос оруулбал энд харагдана.');
 creativePreview.append(previewPic,previewText);sections[2].append(creativePreview);
 function updatePreview(){
  const raw=form.elements.image_url.value.trim();
  let valid=false;try{const u=new URL(raw);valid=u.protocol==='https:'&&!u.username&&!u.password}catch{}
  previewPic.hidden=!valid;previewText.hidden=valid;
  if(valid)previewPic.src=raw;else previewPic.removeAttribute('src');
 }
 form.elements.image_url.addEventListener('input',updatePreview);
 previewPic.addEventListener('error',()=>{previewPic.hidden=true;previewText.hidden=false;previewText.textContent='Зургийн холбоос нээгдсэнгүй. Зөв HTTPS зураг оруулна уу.'});
 sections[3].append(make('h3','4. Мэдээллээ шалгаад хүсэлтээ илгээнэ үү'));
 const summary=make('dl',undefined,'solioSponsorReview');sections[3].append(summary);
 if(privacy)sections[3].append(privacy);
 sections[3].append(make('p','Энэ бол захиалгын хүсэлт. Төлбөр автоматаар суутгахгүй, зар шууд нийтлэгдэхгүй. Админ хянаж тантай холбогдоно.'));
 originalFields.remove();
 form.prepend(wizard);
 const actions=make('div',undefined,'solioSponsorWizardActions');
 const back=make('button','Буцах','solioSponsorSecondary');back.type='button';
 const next=make('button','Үргэлжлүүлэх →','solioSponsorPrimary');next.type='button';
 actions.append(back,next,submit);form.insertBefore(actions,feedback);
 const stepStatus=make('p',undefined,'solioSponsorStepStatus');
 progress.before(stepStatus);
 const oldStatusForm=dialog.querySelector('#solioSponsorStatusForm');
 if(oldStatusForm){
  const details=make('details',undefined,'solioSponsorStatusDetails');
  const disclosure=make('summary','Өмнө илгээсэн хүсэлтийн төлөв шалгах');
  oldStatusForm.before(details);details.append(disclosure,oldStatusForm);
 }
 function review(){
  summary.replaceChildren();
  const quote=sponsorRates[form.elements.placement.value];
  const rows=[
   ['Байгууллага',form.elements.company.value.trim()],
   ['Холбоо барих',form.elements.contact_name.value.trim()],
   ['Имэйл',form.elements.email.value.trim()],
   ['Утас',form.elements.phone.value.trim()||'Оруулаагүй'],
   ['Байрлал',quote?.label||''],
   ['Хугацаа',form.elements.duration_days.value+' хоног'],
   ['Санал болгож буй үнэ',formatMNT(quote?.prices[form.elements.duration_days.value]||0)],
   ['Эхлэх өдөр',form.elements.start_date.value||'Админтай тохиролцоно'],
   ['Зураг',form.elements.image_url.value.trim()?'Холбоос оруулсан':'Дараа өгнө'],
   ['Очих холбоос',form.elements.target_url.value.trim()||'Дараа өгнө']
  ];
  for(const [key,value] of rows){summary.append(make('dt',key),make('dd',value))}
 }
 let step=0;
 function setStep(n){
  step=Math.max(0,Math.min(3,n));
  if(step===3)review();
  sections.forEach((section,i)=>{section.hidden=i!==step});
  [...progress.children].forEach((li,i)=>{li.classList.toggle('current',i===step);li.classList.toggle('completed',i<step);if(i===step)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current')});
  back.hidden=step===0;next.hidden=step===3;submit.hidden=step!==3;
  stepStatus.textContent='Алхам '+(step+1)+' / 4';
  wizard.scrollIntoView?.({block:'nearest',behavior:'auto'});
 }
 function advance(){
  for(const control of sections[step].querySelectorAll('input,select,textarea')){
   if(!control.checkValidity()){control.reportValidity();control.focus();return}
  }
  setStep(step+1);
 }
 back.onclick=()=>setStep(step-1);
 next.onclick=advance;
 form.addEventListener('submit',event=>{
  if(step!==3){event.preventDefault();event.stopImmediatePropagation();advance()}
 },true);
 form.sponsorSetStep=setStep;
 setStep(0);
}

let dialog;
function ensureDialog(){
 if(dialog)return dialog;
 dialog=make('div',undefined,'solioSponsorOverlay');dialog.id='solioSponsorOverlay';dialog.hidden=true;
 dialog.innerHTML='<div class="solioSponsorDialog" role="dialog" aria-modal="true" aria-labelledby="solioSponsorDialogTitle"><button type="button" class="solioSponsorDismiss" aria-label="Хаах">×</button><div class="solioSponsorEyebrow">SOLIO · БАЙГУУЛЛАГЫН ЗАР</div><h2 id="solioSponsorDialogTitle">Энд танай сурталчилгаа байрлаж болно</h2><p>Оюутнуудад хүрэх сурталчилгаа, хөнгөлөлтөө илгээнэ үү. Байгууллагаар бүртгүүлэх, үнэ харах, хүсэлтийн төлөв шалгах боломжтой.</p><form id="solioSponsorApplyForm"><div class="solioSponsorFields"><label class="solioSponsorField"><span>Байгууллагын нэр *</span><input name="company" maxlength="100" required></label><label class="solioSponsorField"><span>Холбоо барих хүн *</span><input name="contact_name" maxlength="100" required></label><label class="solioSponsorField"><span>Имэйл *</span><input type="email" name="email" maxlength="254" required></label><label class="solioSponsorField"><span>Утас</span><input name="phone" maxlength="40" inputmode="tel"></label><label class="solioSponsorField"><span>Баннерын зургийн HTTPS холбоос (дараа өгч болно)</span><input type="url" name="image_url" placeholder="https://"></label><label class="solioSponsorField"><span>Сурталчилгаагаар очих HTTPS холбоос</span><input type="url" name="target_url" placeholder="https://"></label><label class="solioSponsorField"><span>Эхлэх өдөр (сонголттой)</span><input type="date" name="start_date"></label><label class="solioSponsorField"><span>Дуусах өдөр (сонголттой)</span><input type="date" name="end_date"></label></div><label class="solioSponsorField"><span>Дэлгэрэнгүй хүсэлт, хугацаа</span><textarea name="message" rows="3" maxlength="1500" placeholder="Байгууллагын сурталчилгааны тухай..."></textarea></label><input class="solioSponsorHoneypot" type="text" name="website" autocomplete="off" tabindex="-1"><p class="solioSponsorPrivacy">Таны холбоо барих мэдээлэл нийтэд харагдахгүй. Хүсэлт илгээх нь төлбөр төлсөн эсвэл зар автоматаар батлагдсан гэсэн үг биш.</p><p id="solioSponsorApplyFeedback" role="status" aria-live="polite"></p><button class="solioSponsorPrimary" type="submit">Хүсэлт илгээх</button></form><hr><form id="solioSponsorStatusForm"><h3>Хүсэлтийн төлөв шалгах</h3><label class="solioSponsorField"><span>Хүсэлтийн дугаар</span><input name="id" required></label><label class="solioSponsorField"><span>Илгээсэн имэйл</span><input type="email" name="email" required></label><button class="solioSponsorSecondary" type="submit">Төлөв харах</button><p id="solioSponsorStatusFeedback" role="status" aria-live="polite"></p></form></div>';
 document.body.append(dialog);
 const form=$('#solioSponsorApplyForm',dialog);
 form.querySelector('[name=end_date]')?.closest('label')?.remove();
 buildPricingPicker(form);
 setupSponsorWizard(form);
 const close=()=>{dialog.hidden=true;document.body.classList.remove('solioSponsorModalOpen')};
 $('.solioSponsorDismiss',dialog).onclick=close;
 dialog.addEventListener('click',event=>{if(event.target===dialog)close()});
 document.addEventListener('keydown',event=>{if(!dialog.hidden&&event.key==='Escape')close()});
 $('#solioSponsorApplyForm',dialog).addEventListener('submit',submitApplication);
 $('#solioSponsorStatusForm',dialog).addEventListener('submit',checkApplicationStatus);
 return dialog;
}
function openApplication(placement='feed'){
 const d=ensureDialog(),selected=typeof placement==='string'&&sponsorRates[placement]?placement:'feed';
 const form=$('#solioSponsorApplyForm',d);
 if(form.dataset.submitted){form.reset();delete form.dataset.submitted;form.querySelector('.solioSponsorPrimary[type=submit]').disabled=false}
 form.elements.placement.value=selected;
 updateSponsorQuote();form.sponsorSetStep?.(0);d.hidden=false;
 document.body.classList.add('solioSponsorModalOpen');
 $('#solioSponsorApplyFeedback',d).textContent='';
 $('.solioSponsorDialog',d).scrollTop=0;
 $('.solioSponsorDismiss',d).focus();
}
window.SolioSponsorOpen=openApplication;
async function submitApplication(event){
 event.preventDefault();const form=event.currentTarget,data=new FormData(form),msg=$('#solioSponsorApplyFeedback',dialog),btn=$('button[type=submit]',form);
 const input=Object.fromEntries(data.entries());
 input.start_at=input.start_date?new Date(input.start_date+'T00:00:00').toISOString():null;
 delete input.start_date;delete input.end_date;
 btn.disabled=true;btn.textContent='Илгээж байна...';msg.textContent='';
 try{
  const res=await fetch(API+'/apply',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',body:JSON.stringify(input)});
  const result=await res.json();if(!res.ok)throw Error(result.error||'Хүсэлт илгээгдсэнгүй');
  form.dataset.submitted='true';const statusForm=$('#solioSponsorStatusForm',dialog);statusForm.elements.id.value=result.id;statusForm.elements.email.value=input.email;msg.textContent='Хүсэлтийг хүлээн авлаа. Дугаар: '+result.id+' · Төлөв: Хүлээгдэж буй. Дугаараа хадгалаарай. Төлөв шалгах хэсэгт автоматаар бөглөгдлөө.';msg.classList.add('solioSponsorSuccess');
 }catch(e){msg.textContent=e.message||'Алдаа гарлаа';msg.classList.remove('solioSponsorSuccess')}
 finally{btn.disabled=!!form.dataset.submitted;btn.textContent=form.dataset.submitted?'Хүсэлт илгээгдсэн':'Хүсэлт илгээх'}
}
async function checkApplicationStatus(event){
 event.preventDefault();const form=event.currentTarget,msg=$('#solioSponsorStatusFeedback',dialog);msg.textContent='Шалгаж байна…';
 try{const params=new URLSearchParams(new FormData(form));const r=await fetch(API+'/apply?'+params);const data=await r.json();if(!r.ok)throw Error(data.error||'Төлөв олдсонгүй');const labels={pending:'Хүлээгдэж буй',approved:'Зөвшөөрсөн',rejected:'Татгалзсан'};msg.textContent='Төлөв: '+(labels[data.item.status]||data.item.status)+(data.item.admin_notes?' · '+data.item.admin_notes:'')}catch(error){msg.textContent=error.message||'Төлөв шалгаж чадсангүй.'}
}
function mountCTA(){
 const footer=document.querySelector('footer');
 if(footer&&!$('#solioSponsorFooterCta')){
  const b=make('button','Байгууллагын сурталчилгаа байрлуулах','solioSponsorFooterCta');b.id='solioSponsorFooterCta';b.type='button';b.onclick=()=>openApplication('feed');footer.prepend(b);
 }
 if(new URLSearchParams(location.search).get('sponsor')==='1')setTimeout(()=>openApplication(new URLSearchParams(location.search).get('placement')||'feed'),250);
}
mountCTA();
})();
