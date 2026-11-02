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
    'bottomHome','bottomSchools','bottomWanted','bottomSearch','bottomCommunity','bottomAccount'];
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

test('Wanted has its own page and remains separate from Search and Community',()=>{
  const nav=markup.slice(markup.indexOf('<nav class="mobileBottomNav"'),markup.indexOf('</nav>',markup.indexOf('<nav class="mobileBottomNav"'))+6);
  const school=nav.indexOf('id="bottomSchools"');
  const wanted=nav.indexOf('id="bottomWanted"');
  const post=nav.indexOf('class="bottomPost"');
  const search=nav.indexOf('id="bottomSearch"');
  assert.ok(school>=0&&school<wanted&&wanted<post&&post<search);
  assert.ok(nav.includes('onclick="openSolioWanted()"'));
  assert.ok(nav.includes('onclick="goMobileSearch()"'));
  assert.ok(nav.includes('onclick="openSolioCommunity()"'));
  assert.ok(markup.includes('id="wantedPanel"'));
  assert.ok(js.includes('if(location.hash==="#wanted")'));
  assert.ok(js.includes('function openSolioWanted()'));
});

test('profile modal sits above sticky header and close button stays visible on iPhone',()=>{
  assert.ok(markup.includes('id="modal" role="presentation"'));
  assert.ok(markup.includes('class="dialog" role="dialog" aria-modal="true"'));
  assert.ok(markup.includes('class="close" type="button" aria-label="Цонх хаах"'));
  assert.ok(markup.includes('onclick="closeModal()"'));
  const style=html.slice(0,html.indexOf('</style>'));
  assert.ok(style.includes('#modal{z-index:1000!important'));
  assert.ok(style.includes('#modal>.dialog>.close{'));
  assert.ok(style.includes('position:sticky!important'));
  assert.ok(style.includes('max-height:calc(100dvh - 24px)!important'));
});
