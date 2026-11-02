import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const markup=html.slice(html.indexOf('</style></head>'),html.indexOf('<script src='));
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

test('Solio inline JavaScript has no syntax errors',()=>{
  assert.ok(js);
  assert.doesNotThrow(()=>new Script(js));
});

test('DOM ids are unique',()=>{
  const ids=[...markup.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.ok(ids.length>40);
  assert.equal(ids.length,new Set(ids).size);
});

test('all essential pages and tabs exist',()=>{
  const ids=['market','cards','schoolHub','schoolHubGrid','solioSearchPage',
    'solioSearchSchools','solioSearchListings','socialHub','communityPanel',
    'bottomHome','bottomSchools','bottomWanted','bottomCommunity','bottomAccount'];
  for(const id of ids) assert.ok(markup.includes('id="'+id+'"'),id);
});

test('home is clean and posting stays accessible',()=>{
  const home=markup.match(/<section class="marketHome[^]*?<\/section>/)?.[0]||'';
  assert.equal((home.match(/openModal\('post'\)/g)||[]).length,1);
  assert.ok(home.includes('goMobileSchools()'));
  assert.ok(!home.includes('openSolioCommunity()'));
  assert.ok(markup.includes('class="bottomPost"'));
});

test('categories use one eight-option bar',()=>{
  assert.equal((markup.match(/id="solioMarketCategories"/g)||[]).length,1);
  assert.equal((markup.match(/data-home-category="/g)||[]).length,8);
  assert.ok(!markup.includes('id="cats"'));
  assert.ok(!markup.includes('id="category"'));
});

test('profile notifications and Search are independent of Home',()=>{
  assert.ok(js.includes('id="profileNotifications"'));
  assert.ok(!markup.includes('id="solioNotifCount"'));
  assert.ok(!markup.includes('onclick="showSolioMatches()"'));
  assert.ok(js.includes('if(page)page.hidden=true'));
});

test('listing image loading, search and card actions are guarded',()=>{
  for(const part of [
    'function scheduleSolioMarketRender()',
    'function scheduleSolioGlobalSearch()',
    'solioCardsRoot.addEventListener',
    'solioSearchResultsRoot.addEventListener',
    'solioCardPrice(x.price)',
    'solioStatusSold',
    'index<2',
    'function loadListings(reset=true)',
    'class="solioListingError"',
  ]) assert.ok(html.includes(part),part);
});
