/* Shared, lightweight entry points. Feature pages still load on demand. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),esc=escapeHTML;
const entries=[
 ['market','Зарууд','Хэрэгтэй зүйлээ олох, худалдаж авах','grid','Олж үзэх',()=>goMobileHome()],
 ['wanted','Хайж байна','Олдохгүй байгаа зүйлээ оюутнуудаас асуух','wanted','Олж үзэх',()=>openSolioWanted()],
 ['campus','Миний сургууль','Сургуулийн зар, хүсэлт, нийтлэл нэг дор','school','Олж үзэх',()=>SolioCampus.open()],
 ['societies','Клуб, эвент','Клубтэй танилцах, арга хэмжээ олох','person','Олж үзэх',()=>SolioSocieties.open()],
 ['community','Оюутны булан','Асуулт, зөвлөгөө, сургуулийн сонин','chat','Олж үзэх',()=>openSolioCommunity()],
 ['deals','Хөнгөлөлт','Оюутанд зориулсан байгууллагын саналууд','heart','Олж үзэх',()=>SolioCampus.deals()],
 ['saved','Хадгалсан зар','Зүрх дарж хадгалсан заруудаа үзэх','heart','Миний хэсэг',()=>showSavedListings()],
 ['mine','Миний зарууд','Зараа засах, төлөв солих, үнийн санал үзэх','box','Миний хэсэг',()=>goMyListings()],
 ['requests','Клуб, эвентийн хүсэлтүүд','Илгээсэн хүсэлтийнхээ төлөвийг шалгах','file','Миний хэсэг',()=>SolioSocieties.open({kind:'mine'})],
 ['profile','Миний бүртгэл','Профайл, мэдэгдэл, бүртгэлийн тохиргоо','person','Миний хэсэг',()=>goMobileSpace()],
 ['advertise','Сурталчилгаа байршуулах','Үнэ, байрлал харах, байгууллагын хүсэлт илгээх','share','Байгууллагад',()=>SolioSponsorOpen('feed')],
 ['offer-deal','Хөнгөлөлт санал болгох','Оюутанд зориулсан хөнгөлөлтөө илгээх','school','Байгууллагад',()=>SolioCampus.apply()]
];
const createEntries=[
 ['listing','Зар нэмэх','Зарах эсвэл үнэгүй өгөх зүйл байна.','box',()=>openModal('post')],
 ['wanted','Хайж буй зүйлээ бичих','Хэрэгтэй зүйлээ олоогүй байна.','wanted',()=>{openSolioWanted();toggleSocialForm('wanted',true)}],
 ['community','Нийтлэл бичих','Асуулт, зөвлөгөө, мэдээллээ хуваалцъя.','chat',()=>{openSolioCommunity();toggleSocialForm('community',true)}],
 ['event','Эвент нэмэх','Уулзалт, тэмцээн, арга хэмжээ зарлая.','file',()=>SolioSocieties.create('event')],
 ['club','Клуб бүртгүүлэх','Клубээ танилцуулж, гишүүдтэй болъё.','person',()=>SolioSocieties.create('club')]
];
function sheet(title,intro,content){
 const dialog=document.querySelector('.dialog');
 dialog.classList.remove('authDialog','detailDialog','quickPostDialog');dialog.classList.add('easyDialog');
 $('modal').classList.add('show');$('modalBody').innerHTML='<div class="easySheet"><span class="easyKicker">SOL1O / ЧАМД ХЭРЭГТЭЙ БҮХЭН</span><h2>'+title+'</h2><p class="easyIntro">'+intro+'</p>'+content+'</div>';dialog.scrollTop=0;
}
function choice(key,title,description,icon,attribute){return '<button type="button" class="easyChoice" '+attribute+'="'+key+'">'+boardIcon(icon)+'<span><strong>'+esc(title)+'</strong><small>'+esc(description)+'</small></span><span class="easyArrow" aria-hidden="true">→</span></button>'}
function menu(){
 sheet('Юу хиймээр байна?','Хэрэгтэй хэсгээ эндээс шууд нээгээрэй.','<label class="easyMenuSearch">Цэснээс хайх<input id="easyMenuQuery" type="search" placeholder="Жишээ: клуб, хадгалсан, зар…" autocomplete="off"></label><div id="easyMenuItems"></div><p id="easyMenuEmpty" role="status" hidden>Тохирох хэсэг алга. Өөр үгээр хайгаарай.</p><details class="easyHelp"><summary>Sol1o-г хэрхэн ашиглах вэ?</summary><p><b>Авах:</b> Зараа нээгээд утас эсвэл Instagram-аар худалдагчтай холбогдоно. Үнийн санал бас илгээж болно.</p><p><b>Зарах:</b> «Нэмэх» → «Зар нэмэх». Нэр, үнэ, сургууль, ангиллаа оруулна. Холбоо барих мэдээлэл нэмбэл бусад хүн холбогдоход амар.</p><p><b>Олдохгүй байвал:</b> «Хайж байна» хэсэгт хэрэгтэй зүйл, төсвөө бичээрэй.</p><p><b>Клуб, эвент:</b> Танилцуулгыг нээгээд зохион байгуулагчийн холбоосоор бүртгүүлнэ. Календарьт нэмэх нь бүртгэл болохгүй.</p><p><b>Хадгалах:</b> Зар дээрх зүрх, клуб/эвент дээрх «Хадгалах» товчийг дарна. Эдгээр нь энэ төхөөрөмжид хадгалагдана.</p></details>');
 const draw=()=>{const q=$('easyMenuQuery').value.trim().toLocaleLowerCase('mn-MN');const found=entries.filter(x=>x.slice(1,5).join(' ').toLocaleLowerCase('mn-MN').includes(q));$('easyMenuItems').innerHTML=['Олж үзэх','Миний хэсэг','Байгууллагад'].map(group=>{const items=found.filter(x=>x[4]===group);return items.length?'<section class="easyMenuGroup"><h3>'+group+'</h3><div class="easyChoices">'+items.map(x=>choice(...x.slice(0,4),'data-easy-go')).join('')+'</div></section>':''}).join('');$('easyMenuEmpty').hidden=!!found.length};
 $('easyMenuQuery').oninput=draw;$('easyMenuItems').onclick=e=>{const b=e.target.closest('[data-easy-go]');if(!b)return;const entry=entries.find(x=>x[0]===b.dataset.easyGo);closeModal();entry?.[5]()};draw();
}
function create(){sheet('Юу нэмэх вэ?','Хийх үйлдлээ сонго. Нэвтрэх шаардлагатай бол эндээс үргэлжлүүлнэ.','<div class="easyChoices easyCreate">'+createEntries.map(x=>choice(...x.slice(0,4),'data-easy-create')).join('')+'</div>');$('modalBody').querySelector('.easyCreate').onclick=e=>{const b=e.target.closest('[data-easy-create]');if(!b)return;closeModal();createEntries.find(x=>x[0]===b.dataset.easyCreate)?.[4]()}}
function searchElsewhere(kind){const q=$('solioGlobalSearch').value.trim();if(kind==='wanted'){openSolioWanted();$('wantedQueryFilter').value=q;filterWantedRequests()}else if(kind==='community'){openSolioCommunity();$('communitySearch').value=q;renderCommunityFeed()}else SolioSocieties.open({kind,q})}
function listingForm(id,title,content,submitText,onSave){
 const x=listings.find(item=>item.id===id);if(!x)return;
 sheet(title,x.title,'<form id="easyActionForm" class="easyActionForm">'+content+'<p id="easyActionStatus" role="status"></p><div class="easyFormActions"><button type="button" id="easyActionBack">← Зар руу буцах</button><button class="easyPrimary" type="submit">'+submitText+'</button></div></form>');
 $('easyActionBack').onclick=()=>openListing(id);
 const form=$('easyActionForm');form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('[type=submit]');if(button.disabled)return;button.disabled=true;$('easyActionStatus').textContent='Хадгалж байна…';try{await onSave(new FormData(form));if($('easyActionForm')===form&&$('modal').classList.contains('show'))openListing(id)}catch(error){if($('easyActionForm')===form)$('easyActionStatus').textContent=error.message||'Холболтоо шалгаад дахин оролдоно уу.';else toast('Үйлдэл амжилтгүй. Дахин оролдоно уу.')}finally{button.disabled=false}};
}
window.SolioUX={menu,create,searchElsewhere,listingForm};
})();
