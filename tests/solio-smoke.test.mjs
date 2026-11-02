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
  assert.ok(staticHtml.includes('onclick="closeModal()"'));
  assert.ok(staticHtml.includes('#modal{z-index:1000!important'));
  assert.ok(staticHtml.includes('#modal>.dialog>.close{'));
  assert.ok(staticHtml.includes('max-height:calc(100dvh - 24px)!important'));
});
