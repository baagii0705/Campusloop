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

test('Mobile has seven distinct working destinations, Wanted beside Schools', () => {
  const nav = section('<nav class="mobileBottomNav"', '</nav>');
  assert.equal((nav.match(/<button\b/g) || []).length, 7);
  const school = nav.indexOf('id="bottomSchools"');
  const wanted = nav.indexOf('id="bottomWanted"');
  const post = nav.indexOf('class="bottomPost"');
  const search = nav.indexOf('id="bottomSearch"');
  const community = nav.indexOf('id="bottomCommunity"');
  assert.ok(school > 0 && school < wanted && wanted < post && post < search && search < community);
  for (const id of ['bottomHome', 'bottomSchools', 'bottomWanted', 'bottomSearch', 'bottomCommunity', 'bottomAccount']) {
    assert.equal((nav.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1);
  }
  assert.match(nav, /onclick="openSolioWanted\(\)"/);
  assert.match(nav, /onclick="goMobileSearch\(\)"/);
  assert.match(nav, /onclick="openSolioCommunity\(\)"/);
});

test('Home contains only one Add listing button and no redundant Community shortcut', () => {
  const home = section('<section class="marketHome');
  assert.equal((home.match(/openModal\('post'\)/g) || []).length, 1);
  assert.doesNotMatch(home, /openSolioCommunity\(\)|solioDiscovery|schoolHubGrid/);
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
  assert.match(sw, /solio-shell-v5/);
});

test('DOM element IDs are unique', () => {
  const ids=[...staticHtml.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.ok(ids.length>40, 'main application DOM is present');
  assert.equal(ids.length,new Set(ids).size);
});

test('essential marketplace destinations remain in the page', () => {
  for(const id of ['market','cards','schoolHub','schoolHubGrid','solioSearchPage',
    'solioSearchSchools','solioSearchListings','socialHub','communityPanel',
    'wantedPanel','bottomHome','bottomSchools','bottomWanted','bottomSearch',
    'bottomCommunity','bottomAccount']){
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
  assert.ok(staticHtml.includes('onclick="solioPendingPostAfterAuth=false;closeModal()"'));
  assert.ok(staticHtml.includes('#modal{z-index:1000!important'));
  assert.ok(staticHtml.includes('#modal>.dialog>.close{'));
  assert.ok(staticHtml.includes('max-height:calc(100dvh - 24px)!important'));
});


test('quick-post form keeps essential fields, optional details and mobile submit',()=>{
  for(const field of ['newTitle','newPrice','newSchool','newCategory','newImageFile','newImage','newPhone','newInstagram','newDesc','newMeetingPlace']){
    assert.ok(inlineScript.includes('id=\"'+field+'\"'),field);
  }
  assert.match(inlineScript,/quickPostExtras/);
  assert.match(inlineScript,/postFreeToggle/);
  assert.match(inlineScript,/solio_last_school/);
  assert.match(inlineScript,/solio_last_category/);
  assert.match(staticHtml,/#modal \.quickPostFooter\{position:sticky/);
  assert.doesNotMatch(inlineScript.slice(inlineScript.indexOf('const listingFormHTML='),inlineScript.indexOf('async function authAction(')),/id=\"newStatus\"|id=\"newCondition\"/);
});

test('registration keeps Appwrite session flow and enforces 8 characters',()=>{
  assert.match(inlineScript,/class=\"authExperience\"/);
  assert.match(inlineScript,/register\?8:6/);
  assert.match(inlineScript,/register\?"8-аас доошгүй тэмдэгт"/);
  assert.match(inlineScript,/if\(resumePost\)openModal\("post"\)/);
  assert.match(inlineScript,/signUp\(\{email,password/);
  assert.match(inlineScript,/signInWithPassword\(\{email,password/);
  assert.match(inlineScript,/resetPasswordForEmail\(/);
  assert.match(staticHtml,/#modal \.authExperience \.authWide/);
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

test('quick-post validates before uploading and saves multiple images in order',async()=>{
  const start=inlineScript.indexOf('async function saveListing(id){');
  const end=inlineScript.indexOf('async function deleteListing(',start);
  assert.ok(start>=0&&end>start,'saveListing region');
  const fields={
    newTitle:{value:'iPad 9'},
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
    inlineScript.slice(start,end)+';return saveListing');
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
  assert.equal(JSON.parse(inserted.image_urls).length,2);
  assert.equal(JSON.parse(inserted.image_urls)[1],'https://images.example/2');
  assert.equal(closed,1);
  assert.equal(refreshed,1);
});
