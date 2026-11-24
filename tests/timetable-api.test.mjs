import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { onRequestGet, onRequestOptions, onRequestPost } from '../functions/api/timetable/index.js';

test('timetable lazily imports verified preferences and guards concurrent changes across devices', async t => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../migrations/006-student-timetables.sql', import.meta.url), 'utf8'));
  t.after(() => sqlite.close());
  let pendingUpdates = [];
  let synchronizeNextPair = true;
  const bind = (sql, parameters) => ({
    async first() {
      if (sql.startsWith('UPDATE') && synchronizeNextPair) {
        await new Promise(resolve => {
          pendingUpdates.push(resolve);
          if (pendingUpdates.length === 2) {
            synchronizeNextPair = false;
            pendingUpdates.forEach(release => release());
            pendingUpdates = [];
          }
        });
      }
      return sqlite.prepare(sql).get(...parameters);
    },
    async run() { return sqlite.prepare(sql).run(...parameters); }
  });
  const db = { prepare: sql => ({ bind: (...params) => bind(sql, params) }) };
  const legacy = { id: 'legacy', name: 'Электроник', day: 1, start: '08:00', end: '09:00', room: '305' };
  const accounts = {
    student: { $id: 'student', prefs: { solioTimetable: [legacy], otherPrivateSetting: 'secret' } },
    other: { $id: 'other', prefs: {} }
  };
  const token = id => id.padEnd(24, 'z');
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (_url, options) => {
    const account = Object.entries(accounts).find(([id]) => options.headers['X-Appwrite-JWT'] === token(id))?.[1];
    return account ? Response.json(account) : new Response(null, { status: 401 });
  };
  const context = (input, { id = 'student', owner = id, origin = 'https://sol1o.me' } = {}) => ({
    env: { SPONSOR_DB: db },
    request: new Request('https://sol1o.me/api/timetable', {
      method: input ? 'POST' : 'GET',
      headers: { Origin: origin, Authorization: 'Bearer ' + token(id), 'X-Solio-Timetable-Owner': owner },
      ...(input ? { body: JSON.stringify(input) } : {}),
    })
  });

  assert.equal((await onRequestGet(context(null, { id: 'anonymous' }))).status, 401);
  assert.equal((await onRequestGet(context(null, { id: 'other', owner: 'student' }))).status, 401);
  assert.equal((await onRequestGet(context(null, { origin: 'https://unrelated.example' }))).status, 403);
  assert.equal(onRequestOptions(context(null, { origin: 'https://unrelated.example' })).status, 403);
  const native = { origin: 'capacitor://localhost' };
  const preflight = onRequestOptions(context(null, native));
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), native.origin);
  assert.match(preflight.headers.get('Access-Control-Allow-Headers'), /Authorization/);
  const initial = await onRequestGet(context(null, native));
  assert.equal(initial.headers.get('Access-Control-Allow-Origin'), native.origin);
  assert.equal(initial.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await initial.json(), { lessons: [legacy], revision: 0 });
  accounts.student.prefs.solioTimetable = [];

  const proposal = (id, revision) => ({ action: 'create', id, revision, lesson: { ...legacy, name: id } });
  const versions = await Promise.all(['device-a', 'device-b'].map(id => onRequestPost(context(proposal(id, 0)))));
  assert.deepEqual(versions.map(result => result.status).sort(), [200, 409]);
  const rejection = await versions.find(result => result.status === 409).json();
  assert.equal(rejection.revision, 1);
  assert.equal(rejection.lessons.length, 2);
  const rejectedId = rejection.lessons.some(lesson => lesson.id === 'device-a') ? 'device-b' : 'device-a';
  const retried = await onRequestPost(context(proposal(rejectedId, 1)));
  assert.equal(retried.status, 200);
  assert.equal((await retried.json()).revision, 2);
  const lostResponseRetry = await onRequestPost(context(proposal(rejectedId, 1)));
  assert.equal((await lostResponseRetry.json()).revision, 2);
  assert.deepEqual(await (await onRequestGet(context(null, { id: 'other' }))).json(), { lessons: [], revision: 0 });
  assert.equal((await onRequestPost(context({ action: 'delete', id: 'legacy', revision: 1 }))).status, 409);
  const deleted = await onRequestPost(context({ action: 'delete', id: 'legacy', revision: 2 }));
  assert.equal(deleted.status, 200);
  assert.deepEqual((await deleted.json()).lessons.map(x => x.id).sort(), ['device-a', 'device-b']);
});
