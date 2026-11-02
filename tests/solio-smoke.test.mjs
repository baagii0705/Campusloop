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

test('Mobile has six unique working destinations', () => {
  const nav = section('<nav class="mobileBottomNav"', '</nav>');
  assert.equal((nav.match(/<button\b/g) || []).length, 6);
  for (const id of ['bottomHome', 'bottomSchools', 'bottomWanted', 'bottomCommunity', 'bottomAccount']) {
    assert.equal((nav.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1);
  }
  assert.match(nav, /onclick="openSolioCommunity\(\)"/);
  assert.match(nav, /onclick="goMobileWanted\(\)"/);
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

test('Schools and Community have dedicated pages', () => {
  assert.match(staticHtml, /id="schoolHubGrid"/);
  assert.match(staticHtml, /id="communityPanel"/);
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
  assert.match(sw, /solio-shell-v3/);
});
