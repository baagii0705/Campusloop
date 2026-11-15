import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { canonicalSchool, directory, schoolFromPath, schoolUrl } from '../schools-data.js';
import { societyQuery } from '../societies-data.js';
import { listingQueries, onRequestGet as feed } from '../functions/api/public/[collection].js';
import { onRequestGet as schoolRoute } from '../functions/schools/[slug].js';
import { onRequestGet, onRequestPost } from '../functions/api/saved-searches/index.js';

const migration = await readFile(new URL('../migrations/005-saved-searches.sql', import.meta.url), 'utf8');
function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(migration);
  sqlite.exec(migration);
  function statement(sql, values = []) {
    return {
      bind: (...params) => statement(sql, params),
      run: async () => ({ meta: sqlite.prepare(sql).run(...values) }),
      first: async () => sqlite.prepare(sql).get(...values),
      all: async () => ({ results: sqlite.prepare(sql).all(...values) }),
      execute: async () => /^\s*SELECT\b/i.test(sql)
        ? { results: sqlite.prepare(sql).all(...values) } : { meta: sqlite.prepare(sql).run(...values) },
    };
  }
  return { prepare: statement, batch: async statements => {
    sqlite.exec('BEGIN');
    try {
      const results = [];
      for (const item of statements) results.push(await item.execute());
      sqlite.exec('COMMIT');
      return results;
    } catch (error) {
      sqlite.exec('ROLLBACK');
      throw error;
    }
  } };
}

test('school links round trip for every existing school and collapse aliases', async () => {
  for (const school of directory) assert.equal(schoolFromPath(schoolUrl(school) + '/'), school);
  assert.equal(schoolFromPath('/schools/must'), 'ШУТИС');
  assert.equal(schoolFromPath('/schools/num'), 'МУИС');
  assert.equal(canonicalSchool('Санхүү эдийн засгийн их сургууль'), 'СЭЗИС');
  const known = await schoolRoute({ request: new Request('https://sol1o.me/schools/num?tab=club'), env: { ASSETS: {
    fetch: url => new Response(url.pathname),
  } } });
  assert.equal(await known.text(), '/');
  assert.equal((await schoolRoute({ request: new Request('https://sol1o.me/schools/missing') })).status, 404);
});

test('school listings and societies keep exact scope through pagination', async () => {
  const all = listingQueries(new URLSearchParams(), 48, 24);
  assert.ok(!all.some(x => x.attribute === 'school'), 'legacy unassigned listings remain visible');
  const filtered = listingQueries(new URLSearchParams({ school: 'СЭЗИС', q: 'ИНЖЕНЕРИЙН   ШУГАМ' }), 48, 24, ['old-vip']);
  assert.deepEqual(filtered.find(x => x.attribute === 'school').values, ['СЭЗИС', 'Санхүү эдийн засгийн их сургууль', 'Санхүү, эдийн засгийн их сургууль']);
  assert.deepEqual(filtered.find(x => x.attribute === '$id').values, ['old-vip']);
  assert.equal(filtered.filter(x => x.method === 'or').length, 2);
  for (const kind of ['club', 'event']) {
    const strict = societyQuery(new URL('https://sol1o.me/api/societies?' + new URLSearchParams({ kind, school: 'МУИС', school_only: '1' })));
    assert.match(strict.sql, /school IN \(\?,\?\)/);
    assert.doesNotMatch(strict.sql, /\.school=''/);
    assert.match(strict.sql, /\.status='published'/);
    assert.equal(strict.params[0], 'МУИС');
  }
  const response = await feed({ request: new Request('https://sol1o.me/api/public/listings?school=unknown'), params: { collection: 'listings' } });
  assert.equal(response.status, 400);
});

test('saved searches are private, matching schools receive one notification and read state persists', async () => {
  const db = database();
  const call = (owner, body, origin = 'https://sol1o.me') => {
    const request = new Request('https://sol1o.me/api/saved-searches', {
      method: body ? 'POST' : 'GET',
      headers: { Origin: origin, ...(owner ? { Authorization: 'Bearer ' + owner.padEnd(24, '_') } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return (body ? onRequestPost : onRequestGet)({ request, env: { SPONSOR_DB: db } });
  };
  const previous = globalThis.fetch;
  const rows = new Map();
  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    if (path.endsWith('/account')) return Response.json({ $id: options.headers['X-Appwrite-JWT'].replace(/_+$/, '') });
    if (path.endsWith('/documents')) return Response.json({ documents: [] });
    const listing = rows.get(path.split('/').at(-1));
    return listing ? Response.json(listing) : new Response(null, { status: 404 });
  };
  try {
    const alert = { action: 'save', term: 'Инженерийн зургийн шугам', school: 'ШУТИС' };
    assert.equal((await call('', alert)).status, 401);
    assert.equal((await call('buyer', alert, 'https://example.org')).status, 403);
    assert.equal((await call('buyer', alert)).status, 201);
    assert.equal((await call('buyer', { ...alert, term: '  ШУГАМ ЗУРГИЙН ИНЖЕНЕРИЙН ' })).status, 200);
    assert.equal((await call('buyer', { ...alert, term: 'зургийн шугам' })).status, 201);
    assert.equal((await call('numuser', { ...alert, school: 'МУИС' })).status, 201);
    assert.equal((await call('allschools', { ...alert, school: '' })).status, 201);
    const { searches } = await (await call('buyer')).json();
    assert.equal(searches.length, 2);
    assert.ok(searches.every(row => row.school === 'ШУТИС' && !Object.hasOwn(row, 'owner_id')));
    await call('intruder', { action: 'delete', id: searches[0].id });
    assert.equal((await (await call('buyer')).json()).searches.length, 2);
    const created = new Date(Date.now() + 1000).toISOString();
    for (const [id, school] of [['must-listing', 'ШУТИС'], ['num-listing', 'МУИС']]) {
      rows.set(id, { $id: id, $createdAt: created, school, user_id: 'seller', title: 'Инженерийн зургийн шугам', status: 'available' });
      assert.equal((await call('intruder', { action: 'publish', id })).status, 404);
      assert.equal((await call('seller', { action: 'publish', id })).status, 200);
      assert.equal((await call('seller', { action: 'publish', id })).status, 200);
    }
    const inbox = owner => call(owner, { action: 'inbox' }).then(response => response.json());
    assert.deepEqual((await inbox('buyer')).notifications.map(x => x.listing_id), ['must-listing']);
    assert.deepEqual((await inbox('numuser')).notifications.map(x => x.listing_id), ['num-listing']);
    assert.equal((await inbox('allschools')).unread, 2);
    assert.equal((await inbox('intruder')).unread, 0);
    await call('intruder', { action: 'read', id: 'must-listing' });
    assert.equal((await inbox('buyer')).unread, 1);
    await call('buyer', { action: 'read', id: 'must-listing' });
    await call('seller', { action: 'publish', id: 'must-listing' });
    assert.equal((await inbox('buyer')).unread, 0);
    assert.equal((await inbox('buyer')).notifications.length, 1);
    await call('buyer', { action: 'delete', id: searches[0].id });
    assert.equal((await (await call('buyer')).json()).searches.length, 1);
  } finally { globalThis.fetch = previous; }
});

test('inbox recovers missed publications and retries the same time window after a fetch failure', async () => {
  const db = database();
  const { storeSavedSearch, syncListingMatches } = await import('../saved-listing-searches.js');
  await storeSavedSearch(db, 'buyer', { term: 'Инженерийн шугам', school: 'ШУТИС' }, new Date('2026-11-01T12:00:00Z'));
  const time = '2026-11-01T12:01:00.000Z';
  const listings = Array.from({ length: 53 }, (_, i) => ({
    $id: 'listing-' + String(i).padStart(3, '0'), $createdAt: time, school: i === 52 ? 'МУИС' : 'ШУТИС',
    user_id: 'seller', title: i === 50 ? 'Өөр бараа' : 'Инженерийн шугам',
  }));
  const previous = globalThis.fetch;
  let unavailable = true, requests = 0;
  globalThis.fetch = async url => {
    requests++;
    if (unavailable) return new Response(null, { status: 503 });
    const query = new URL(url).searchParams.getAll('queries[]').map(JSON.parse);
    const lower = query.find(x => x.method === 'greaterThanEqual').values[0];
    const filter = query.find(x => x.method === 'or');
    const after = filter?.values[1].values[1].values[0] || '';
    return Response.json({ documents: listings.filter(row =>
      row.$createdAt > lower || row.$createdAt === lower && row.$id > after).slice(0, 50) });
  };
  try {
    const now = Date.parse('2026-11-01T12:02:00Z');
    await assert.rejects(syncListingMatches(db, 'buyer', now));
    assert.equal(await db.prepare('SELECT * FROM listing_match_scan').first(), undefined);
    unavailable = false;
    assert.equal(await syncListingMatches(db, 'buyer', now), true);
    assert.equal(await syncListingMatches(db, 'buyer', now), false);
    assert.equal((await db.prepare('SELECT count(*) AS count FROM listing_match_notifications').first()).count, 51);
    assert.equal(await syncListingMatches(db, 'buyer', now), false);
    assert.equal((await db.prepare('SELECT count(*) AS count FROM listing_match_notifications').first()).count, 51);
    assert.equal(requests, 4);
  } finally { globalThis.fetch = previous; }
});

test('school event tab returns upcoming and past public events for that school only', async () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(await readFile(new URL('../migrations/002-clubs-events.sql', import.meta.url), 'utf8'));
  const insert = sqlite.prepare(`
    INSERT INTO society_events (id, owner_id, title, school, category, description, location, starts_at, ends_at,
      price_note, search_text, status, created_at)
    VALUES (?, 'owner', 'Event', ?, 'Технологи', 'description', '101', ?, ?, 'Үнэгүй', 'event', ?, ?)
  `);
  insert.run('old', 'МУИС', '2026-11-01T12:00:00.000Z', '2026-11-01T13:00:00.000Z', 'published', '2026-10-01');
  insert.run('next', 'МУИС', '2026-11-03T12:00:00.000Z', '2026-11-03T13:00:00.000Z', 'published', '2026-10-01');
  insert.run('other', 'ШУТИС', '2026-11-03T12:00:00.000Z', '2026-11-03T13:00:00.000Z', 'published', '2026-10-01');
  insert.run('pending', 'МУИС', '2026-11-03T12:00:00.000Z', '2026-11-03T13:00:00.000Z', 'pending', '2026-10-01');
  const query = societyQuery(new URL('https://sol1o.me/api/societies?kind=event&school_only=1&school=МУИС&scope=school'), new Date('2026-11-02'));
  assert.deepEqual(sqlite.prepare(query.sql).all(...query.params).map(row => row.id), ['next', 'old']);
});
