import { canonicalSchool, searchTerms, searchableListing } from './schools-data.js';
import { publicListings } from './appwrite-public.js';

export const listingID = value => typeof value === 'string' && /^[a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,35}$/.test(value);
const pageSize = 50;
const clockLag = 30_000;

export function notificationInsert(db, owner, row, watchers) {
  const school = canonicalSchool(row.school);
  const text = searchableListing(row);
  // Each saved search applies from the time it was created.
  const watch = watchers.find(item => item.created_at <= row.$createdAt &&
    (!item.school || item.school === school) && item.terms.every(term => text.includes(term)));
  if (!watch || row.user_id === owner || row.status === 'sold') return null;
  return db.prepare(`
    INSERT INTO listing_match_notifications (owner_id, listing_id, title, body, created_at)
    SELECT ?, ?, ?, ?, ? WHERE EXISTS (
      SELECT 1 FROM saved_listing_searches WHERE id=? AND owner_id=?
    ) ON CONFLICT(owner_id, listing_id) DO NOTHING`
  ).bind(owner, row.$id, 'Хайсан зар олдлоо', String(row.title || 'Зар').slice(0, 180), row.$createdAt, watch.id, owner);
}

export async function syncListingMatches(db, owner, now = Date.now()) {
  const { results } = await db.prepare(`
    SELECT id, terms_json, school, created_at FROM saved_listing_searches
    WHERE owner_id=? ORDER BY created_at, id
  `).bind(owner).all();
  if (!results.length) return false;
  const watchers = results.map(item => ({ ...item, terms: JSON.parse(item.terms_json) }));
  const cursor = await db.prepare('SELECT through_at, through_id FROM listing_match_scan WHERE owner_id=?').bind(owner).first();
  const since = cursor?.through_at || watchers[0].created_at;
  const cutoff = new Date(now - clockLag).toISOString();
  if (cutoff < since) return false;
  // The upper bound allows Appwrite writes to become readable before advancing.
  const { documents } = await publicListings([
    { method: 'greaterThanEqual', attribute: '$createdAt', values: [since] },
    { method: 'lessThanEqual', attribute: '$createdAt', values: [cutoff] },
    { method: 'select', values: ['$id','$createdAt','user_id','title','description','school','category','status'] },
    { method: 'orderAsc', attribute: '$createdAt' },
    { method: 'orderAsc', attribute: '$id' },
    { method: 'limit', values: [pageSize] },
    ...(cursor?.through_id ? [{
      method: 'or', values: [
        { method: 'greaterThan', attribute: '$createdAt', values: [since] },
        { method: 'and', values: [
          { method: 'equal', attribute: '$createdAt', values: [since] },
          { method: 'greaterThan', attribute: '$id', values: [cursor.through_id] },
        ] },
      ],
    }] : []),
  ]);
  const statements = documents.map(row => notificationInsert(db, owner, row, watchers)).filter(Boolean);
  const more = documents.length === pageSize;
  const last = documents.at(-1);
  statements.push(db.prepare(`
    INSERT INTO listing_match_scan (owner_id, through_at, through_id) VALUES (?, ?, ?)
    ON CONFLICT(owner_id) DO UPDATE SET through_at=excluded.through_at, through_id=excluded.through_id
    WHERE (excluded.through_at, excluded.through_id) >
          (listing_match_scan.through_at, listing_match_scan.through_id)
  `).bind(owner, more ? last.$createdAt : cutoff, more ? last.$id : ''));
  await db.batch(statements);
  return more;
}

export async function storeSavedSearch(db, owner, input, now = new Date()) {
  const term = typeof input.term === 'string' ? input.term.trim().replace(/\s+/g, ' ') : '';
  const scope = typeof input.school === 'string' ? input.school : '';
  const school = canonicalSchool(scope);
  const terms = searchTerms(term);
  if (term.length < 3 || term.length > 120 || !terms.length || typeof input.school !== 'string' || (scope && !school)) return null;
  const searchKey = [...terms].sort().join(' ');
  const result = await db.prepare(`
    INSERT INTO saved_listing_searches (id, owner_id, term, search_key, terms_json, school, created_at)
    SELECT ?, ?, ?, ?, ?, ?, ?
    WHERE (SELECT count(*) FROM saved_listing_searches WHERE owner_id=?) < 25
    ON CONFLICT(owner_id, search_key, school) DO NOTHING
  `).bind(crypto.randomUUID(), owner, term, searchKey, JSON.stringify(terms), school, now.toISOString(), owner).run();
  if (result.meta.changes) return 'created';
  const existing = await db.prepare('SELECT id FROM saved_listing_searches WHERE owner_id=? AND search_key=? AND school=?').bind(owner, searchKey, school).first();
  return existing ? 'exists' : 'limit';
}

export async function recordPublicListing(db, row) {
  const school = canonicalSchool(row.school);
  const { results } = await db.prepare(`
    SELECT id, owner_id, terms_json, school, created_at FROM saved_listing_searches
    WHERE school IN ('', ?) AND created_at<=? AND owner_id<>?
    ORDER BY created_at, id
  `).bind(school, row.$createdAt, row.user_id).all();
  const byOwner = new Map();
  for (const item of results) {
    if (!byOwner.has(item.owner_id)) byOwner.set(item.owner_id, []);
    byOwner.get(item.owner_id).push({ ...item, terms: JSON.parse(item.terms_json) });
  }
  const statements = [...byOwner].map(([owner, watchers]) => notificationInsert(db, owner, row, watchers)).filter(Boolean);
  for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
}
