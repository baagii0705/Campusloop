import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script, runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const staticHtml = html.slice(0, html.indexOf('<script'));
const inlineScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] || '';
const section = (start, end = '</section>') => {
  const at = staticHtml.indexOf(start);
  assert.ok(at >= 0, 'Missing section ' + start);
  return staticHtml.slice(at, staticHtml.indexOf(end, at) + end.length);
};

test('Solio JavaScript can be parsed', () => {
  assert.ok(inlineScript.length > 5000);
  assert.doesNotThrow(() => new Script(inlineScript, { filename: 'index.html' }));
});

test('Mobile has five readable entry points and a shared feature menu', () => {
  const nav = section('<nav class="mobileBottomNav"', '</nav>');
  assert.equal((nav.match(/<button\b/g) || []).length, 5);
  for (const id of ['bottomHome','bottomSearch','bottomAdd','bottomMenu','bottomAccount']) {
    assert.equal((nav.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1);
  }
  assert.match(nav, /onclick="SolioUX.menu\(\)"/);
  assert.match(nav, /onclick="SolioUX.create\(\)"/);
  assert.match(nav, /onclick="goMobileSearch\(\)"/);
});

test('Campus home has one Add listing button and working community destinations', () => {
  const home = section('<section class="marketHome');
  assert.equal((home.match(/openModal\('post'\)/g) || []).length, 1);
  assert.match(home, /onclick="openSolioCommunity\(\)"/);
  assert.match(home, /onclick="openSolioWanted\(\)"/);
  assert.doesNotMatch(home, /solioDiscovery|schoolHubGrid/);
});

test('Marketplace uses one accessible category selector', () => {
  const market = section('<section id="market"');
  assert.equal((market.match(/data-home-category="/g) || []).length, 8);
  assert.doesNotMatch(market, /id="category"|id="cats"|class="marketSidebar"/);
  assert.match(market, /id="search"/);
  assert.match(market, /id="solioListingFilter"/);
  assert.match(market, /id="sort"/);
});

test('Schools, Wanted and Community have dedicated pages', () => {
  assert.match(staticHtml, /id="schoolHubGrid"/);
  assert.match(staticHtml, /id="wantedPanel"/);
  assert.match(staticHtml, /id="communityPanel"/);
  assert.match(inlineScript, /function openSolioWanted\(\)/);
  assert.match(inlineScript, /solioWantedPage/);
  assert.match(inlineScript, /location.hash==="#wanted"/);
  assert.match(staticHtml, /id="solioSearchPage"[^>]*hidden/);
  assert.match(inlineScript, /function leaveSolioSearch\(\)[\s\S]*?page.hidden=true/);
});

test('Listing previews are lazy-loaded, and the feed has error recovery', () => {
  assert.match(inlineScript, /decoding="async"/);
  assert.match(inlineScript, /solioCardPrice/);
  assert.match(inlineScript, /solioStatusSold/);
  assert.match(inlineScript, /solioStatusReserved/);
  assert.match(inlineScript, /function scheduleSolioMarketRender/);
  assert.match(inlineScript, /function scheduleSolioGlobalSearch/);
  assert.match(inlineScript, /class="solioListingError"/);
  assert.match(inlineScript, /function loadListings\(reset=true\)/);
});

test('Card price formatting handles free and invalid prices', () => {
  const match = inlineScript.match(/function solioCardPrice\(price\)\{[\s\S]*?\n\}/);
  assert.ok(match, 'Card price helper exists');
  const price = runInNewContext(match[0] + '; solioCardPrice', {});
  assert.equal(price(0), 'Үнэгүй');
  assert.equal(price(450000), '450,000 ₮');
  assert.equal(price(-1), 'Үнэ тодорхойгүй');
});

test('PWA cache is refreshed for the redesigned UI', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(sw, /solio-shell-v9/);
  assert.ok(sw.includes("'/board.css'"));
  assert.ok(staticHtml.includes('href="/board.css"'));
});

test('DOM element IDs are unique', () => {
  const ids=[...staticHtml.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.ok(ids.length>40, 'main application DOM is present');
  assert.equal(ids.length,new Set(ids).size);
});

test('essential marketplace destinations remain in the page', () => {
  for(const id of ['market','cards','schoolHub','schoolHubGrid','solioSearchPage',
    'solioSearchSchools','solioSearchListings','socialHub','communityPanel',
    'wantedPanel','bottomHome','bottomMenu','bottomAdd','bottomSearch',
    'bottomAccount']){
    assert.ok(staticHtml.includes('id="'+id+'"'),id);
  }
});

test('profile notifications are not duplicated in marketplace feed', () => {
  assert.ok(inlineScript.includes('id="profileNotifications"'));
  assert.ok(!staticHtml.includes('id="solioNotifCount"'));
  assert.ok(!staticHtml.includes('onclick="showSolioMatches()"'));
  assert.ok(inlineScript.includes('if(page)page.hidden=true'));
});

test('iPhone modal is above sticky header with accessible close button', () => {
  assert.ok(staticHtml.includes('id="modal" role="presentation"'));
  assert.ok(staticHtml.includes('class="dialog" role="dialog" aria-modal="true"'));
  assert.ok(staticHtml.includes('class="close" type="button" aria-label="Цонх хаах"'));
  assert.ok(staticHtml.includes('onclick="closeModal()"'));
  const uiCss=readFileSync(new URL('../board.css',import.meta.url),'utf8');
  assert.ok(uiCss.includes('#modal{z-index:1000!important'));
  assert.ok(uiCss.includes('#modal>.dialog>.close{'));
  assert.ok(uiCss.includes('max-height:calc(100dvh - 24px)!important'));
});


test('quick-post form keeps essential fields, optional details and mobile submit',()=>{
  const start=inlineScript.indexOf('const listingFormHTML=');
  const end=inlineScript.indexOf(';\nbody.innerHTML=',start);
  assert.ok(start>=0&&end>start,'post markup exists');
  const literal=inlineScript.slice(start+'const listingFormHTML='.length,end);
  const formMarkup=JSON.parse(literal);
  for(const field of ['newTitle','newPrice','newSchool','newCategory','newImageFile','newImage','newPhone','newInstagram','newDesc','newMeetingPlace']){
    assert.ok(formMarkup.includes('id=\"'+field+'\"'),field);
  }
  assert.match(inlineScript,/quickPostExtras/);
  assert.match(inlineScript,/postFreeToggle/);
  assert.match(inlineScript,/solio_last_school/);
  assert.match(inlineScript,/solio_last_category/);
  assert.match(readFileSync(new URL('../board.css',import.meta.url),'utf8'),/#modal \.quickPostFooter\{position:sticky/);
  assert.doesNotMatch(inlineScript.slice(inlineScript.indexOf('const listingFormHTML='),inlineScript.indexOf('async function authAction(')),/id=\"newStatus\"|id=\"newCondition\"/);
});

test('registration keeps Appwrite session flow and enforces 8 characters',()=>{
  assert.match(inlineScript,/class=\"authExperience\"/);
  assert.match(inlineScript,/register\?8:6/);
  assert.match(inlineScript,/register\?"8-аас доошгүй тэмдэгт"/);
  assert.match(inlineScript,/finishSolioAuthentication\(\)/);
  assert.match(inlineScript,/signUp\(\{email,password/);
  assert.match(inlineScript,/signInWithPassword\(\{email,password/);
  assert.match(inlineScript,/resetPasswordForEmail\(/);
  assert.match(readFileSync(new URL('../board.css',import.meta.url),'utf8'),/#modal \.authExperience \.authWide/);
});

test('listing gallery returns all valid stored image URLs without duplicates',()=>{
  const start=inlineScript.indexOf('function solioListingGallery(x){');
  const end=inlineScript.indexOf('function openListing(',start);
  assert.ok(start>=0&&end>start);
  const gallery=runInNewContext(inlineScript.slice(start,end)+';solioListingGallery',{});
  const urls=gallery({image_url:'https://img/1.jpg',image_urls:JSON.stringify(['https://img/1.jpg','https://img/2.jpg'])});
  assert.equal(urls.length,2);
  assert.equal(urls[1],'https://img/2.jpg');
  assert.equal(gallery({image_url:'https://img/1.jpg',image_urls:'corrupt'}).length,1);
});

test('legacy gallery covers fall back to the next photo and then the text notice',()=>{
  const start=inlineScript.indexOf('function solioCardImageUrl(');
  const end=inlineScript.indexOf('function openListing(',start);
  const item={id:'old',image_urls:JSON.stringify(['https://img/1.jpg','https://img/2.jpg'])};
  let handleError;
  const cover=runInNewContext(inlineScript.slice(start,end)+';solioCoverImage',{
    escapeHTML:String, listings:[item], URL,
    document:{addEventListener(type,callback){if(type==='error')handleError=callback;}}
  });
  assert.match(cover(item,'boardPhoto'),/src="https:\/\/img\/1\.jpg"/);
  assert.equal(cover({id:'no-photo'},'boardPhoto'),'');
  const target={matches:()=>true,dataset:{coverId:'old',photoIndex:'0'}};
  handleError({target});
  assert.equal(target.src,'https://img/2.jpg');
  handleError({target});
  assert.equal(target.hidden,true);
});

test('quick-post validates before uploading and saves multiple images in order',async()=>{
  const start=inlineScript.indexOf('async function saveListing(id){');
  const end=inlineScript.indexOf('async function deleteListing(',start);
  assert.ok(start>=0&&end>start,'saveListing region');
  const fields={
    newVip:{checked:false},newTitle:{value:'iPad 9'},
    newPrice:{value:'450000'},
    newSchool:{value:'МУИС'},
    newCategory:{value:'Электрон хэрэгсэл'},
    newDesc:{value:''},newPhone:{value:''},newInstagram:{value:''},
    newMeetingPlace:{value:''},newImage:{value:''},
    newImageFile:{files:[
      {name:'one.jpg',size:180000,type:'image/jpeg'},
      {name:'two.jpg',size:190000,type:'image/jpeg'}
    ]}
  };
  const btn={disabled:false,textContent:'Зар нийтлэх'};
  const form={querySelector:()=>btn};
  const status={textContent:'',classList:{toggle(){}}};
  const doc={
    getElementById(id){
      if(id==='postForm')return form;
      if(id==='postStatus')return status;
      if(id==='quickPostExtras')return {open:false};
      const field=fields[id];
      if(!field)throw Error('Missing mocked '+id);
      return {...field,focus(){},closest(){return null}};
    }
  };
  let uploads=0,inserted=null,closed=0,refreshed=0;
  const db={
    storage:{from:()=>({
      upload:async(id,file)=>{uploads++;return {error:null}},
      getPublicUrl:id=>({data:{publicUrl:'https://images.example/'+id}})
    })},
    from:()=>({insert:async obj=>{inserted=obj;return {error:null}}})
  };
  let nextId=0;
  const make=new Function('document','session','listings','Appwrite','db','toast','closeModal','loadListings','localStorage',
    inlineScript.slice(start,end).replace("await import('/image-upload.mjs')","({optimizeListingImage:async file=>file,uploadListingImageWithCard:async(bucket,path,file)=>{const result=await bucket.upload(path,file);if(result.error)throw result.error;}})")+';return saveListing');
  const post=make(doc,{user:{id:'user-1'}},[],{ID:{unique:()=>String(++nextId)}},
    db,()=>{},()=>{closed++},async()=>{refreshed++},{setItem(){}});
  fields.newTitle.value='No';
  await post();
  assert.equal(uploads,0,'invalid title must not start upload');
  assert.equal(inserted,null);
  fields.newTitle.value='iPad 9';
  await post();
  assert.equal(uploads,2);
  assert.equal(inserted.title,'iPad 9');
  assert.equal(inserted.price,450000);
  assert.equal(inserted.image_url,'https://images.example/1');
  assert.equal(inserted.image_urls.length,2);
  assert.equal(inserted.image_urls[1],'https://images.example/2');
  assert.equal(closed,1);
  assert.equal(refreshed,1);
});

test('listing uploads grant public read and retain owner-only modification',async()=>{
  const source=inlineScript.slice(inlineScript.indexOf('const appwriteStorageApi='),inlineScript.indexOf('const db='));
  let args;
  const api=runInNewContext(source+';appwriteStorageApi',{
    APPWRITE_CONFIG:{storageBucketId:'photos'},session:{user:{id:'seller'}},
    Appwrite:{Permission:{read:r=>'read:'+r,update:r=>'update:'+r,delete:r=>'delete:'+r},Role:{any:()=>'any',user:id=>id}},
    appwriteStorage:{createFile:async(...values)=>{args=values;return {$id:'photo'}}}
  });
  const result=await api.from('listing-images').upload('photo',{});
  assert.equal(result.error,null);
  assert.deepEqual(Array.from(args[3]),['read:any','update:seller','delete:seller']);
});

test('rejected image selection remains available for submit validation',()=>{
  const source=inlineScript.slice(inlineScript.indexOf('document.getElementById("newImageFile").onchange='),inlineScript.indexOf('document.getElementById("postForm").onsubmit='));
  const input={},note={},grid={replaceChildren(){}};
  runInNewContext(source,{document:{getElementById:id=>id==='newImageFile'?input:id==='postImageNote'?note:grid},toast(){}});
  const target={value:'large-photo.jpg',files:[{size:6000000,type:'image/jpeg'}]};
  input.onchange({target});
  assert.equal(target.value,'large-photo.jpg');
  assert.match(note.textContent,/Дахин сонгоно уу/);
});

test('card variants stay within the configured bucket and preserve original detail images',()=>{
  const start=inlineScript.indexOf('function solioCardImageUrl(');
  const end=inlineScript.indexOf('function openListing(',start);
  const original='https://sgp.cloud.appwrite.io/v1/storage/buckets/6ae3b5970003d472ee8f/files/6aed36e60012f3e2230b/view?project=6ae367b80007a4d31918';
  let onError;
  const {cover,url}=runInNewContext(inlineScript.slice(start,end)+';({cover:solioCoverImage,url:solioCardImageUrl})',{
    URL,escapeHTML:String,listings:[],document:{addEventListener(type,callback){if(type==='error')onError=callback;}}
  });
  assert.ok(url(original).includes('/6aed36e60012f3e2230b_card/view'));
  assert.equal(url(original.replace('sgp.cloud.appwrite.io','example.com')),original.replace('sgp.cloud.appwrite.io','example.com'));
  assert.match(url(original.replace('6aed36e60012f3e2230b','newUpload')),/newUpload_card\/view/);
  assert.equal(url(original.replace('6ae3b5970003d472ee8f','anotherBucket')),original.replace('6ae3b5970003d472ee8f','anotherBucket'));
  assert.equal(url(url(original)),url(original),'never append _card twice');
  assert.match(cover({id:'test',image_url:original},'boardPhoto',true),/_card\/view/);
  assert.doesNotMatch(cover({id:'test',image_url:original},'detailPhoto',true),/_card\/view/);
  const img={matches:()=>true,dataset:{original,coverId:'test',photoIndex:'0'}};
  onError({target:img});
  assert.equal(img.src,original);
  assert.equal(img.dataset.photoIndex,'0','try original before advancing gallery');
  assert.equal(img.dataset.original,undefined);
});

test('offscreen images do not start requests until they approach the viewport',()=>{
  const start=inlineScript.indexOf('function solioCardImageUrl(');
  const end=inlineScript.indexOf('function openListing(',start);
  let callback,options;const watched=[];const unwatched=[];
  const api=runInNewContext(inlineScript.slice(start,end)+';({cover:solioCoverImage,observe:observeSolioImages})',{
    URL,escapeHTML:String,listings:[],document:{addEventListener(){}},
    IntersectionObserver:class {constructor(cb,opts){callback=cb;options=opts}observe(img){watched.push(img)}unobserve(img){unwatched.push(img)}}
  });
  const markup=api.cover({id:'test',image_url:'https://images.example/photo.jpg'},'boardPhoto');
  assert.match(markup,/ data-src=/);
  assert.doesNotMatch(markup,/ src=/);
  assert.match(api.cover({id:'test',image_url:'https://images.example/photo.jpg'},'boardPhoto',true),/ src=/);
  const img={dataset:{src:'https://images.example/photo.jpg'}};
  api.observe({querySelectorAll:()=>[img]});
  assert.equal(options.rootMargin,'180px 0px');
  callback([{target:img,isIntersecting:false}]);assert.equal(img.src,undefined);
  callback([{target:img,isIntersecting:true}]);assert.equal(img.src,'https://images.example/photo.jpg');
  assert.equal(img.dataset.src,undefined);assert.equal(unwatched.length,1);
});

test('large uploads shrink without upscaling and decoding failure retains the file',async()=>{
  const source=readFileSync(new URL('../image-upload.mjs',import.meta.url),'utf8').replaceAll('export async function','async function');
  let canvas,revoked=0,failDecode=false,encodedSize=60000;
  class ImageMock{naturalWidth=3024;naturalHeight=4032;set src(value){if(failDecode)this.onerror();else this.onload()}}
  class FileMock{constructor(blobs,name,options){this.size=blobs[0].size;this.name=name;Object.assign(this,options)}}
  const optimize=runInNewContext(source+';optimizeListingImage',{
    URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:()=>revoked++},Image:ImageMock,File:FileMock,
    document:{createElement(){canvas={getContext:()=>({drawImage(image,x,y,w,h){canvas.output=[w,h]}}),toBlob(cb){cb({size:encodedSize,type:'image/webp'})}};return canvas}}
  });
  const file={name:'phone.jpg',type:'image/jpeg',size:2400000,lastModified:123};
  const result=await optimize(file);
  assert.equal(result.size,60000);assert.equal(result.name,'phone.webp');
  assert.deepEqual(Array.from(canvas.output),[1200,1600]);assert.equal(revoked,1);
  encodedSize=3000000;assert.equal(await optimize(file),file,'never upload a larger conversion');
  failDecode=true;assert.equal(await optimize(file),file,'decoder failure must not lose the selected photo');
  const gif={...file,type:'image/gif'};assert.equal(await optimize(gif),gif,'keep animation');
  const small={...file,size:120000};assert.equal(await optimize(small),small);
});

test('public feed starts without waiting for account or hidden community requests',()=>{
  const start=inlineScript.indexOf('// Public listings do not depend');
  const end=inlineScript.indexOf('// PWA registration',start);
  const startup=inlineScript.slice(start,end);
  assert.ok(startup.indexOf('loadListings();')<startup.indexOf('appwriteAuth.getSession()'));
  const setup=inlineScript.slice(inlineScript.indexOf('function setupSocial()'),inlineScript.indexOf('async function loadSocialPosts()'));
  assert.doesNotMatch(setup,/loadSocialPosts\(/);
  assert.doesNotMatch(startup,/setInterval|refreshSolioNotificationCount/);
});

