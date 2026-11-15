// Public, read-only Cloudflare Pages proxy. Appwrite controls document visibility.
import { canonicalSchool, schoolValues, searchTerms } from '../../../schools-data.js';

const PROJECT = '6ae367b80007a4d31918';
const ALLOWED = new Set(['listings', 'sponsored_ads']);
const cache = { 'Cache-Control': 'public, max-age=15' };

export function listingQueries(params, offset, limit, activeIDs) {
  const filters = [
    { method: 'limit', values: [limit] },
    { method: 'offset', values: [offset] },
    { method: 'orderDesc', attribute: 'created_at' },
  ];
  const school = canonicalSchool(params.get('school'));
  if (school) filters.push({ method: 'equal', attribute: 'school', values: schoolValues(school) });
  const category = params.get('category')?.trim().slice(0, 80);
  if (category) filters.push({ method: 'equal', attribute: 'category', values: [category] });
  for (const term of searchTerms(params.get('q'))) {
    filters.push({ method: 'or', values: ['title', 'description', 'school', 'category'].map(attribute => ({
      method: 'contains', attribute, values: [term],
    })) });
  }
  if (params.get('filter') === 'free') filters.push({ method: 'equal', attribute: 'price', values: [0] });
  if (activeIDs?.length) filters.push({ method: 'equal', attribute: '$id', values: activeIDs });
  return filters;
}

async function upstream(collection, queries) {
  for (const endpoint of ['https://sgp.cloud.appwrite.io/v1', 'https://cloud.appwrite.io/v1']) {
    try {
      const url = new URL(endpoint + '/databases/public/collections/' + collection + '/documents');
      for (const query of queries) url.searchParams.append('queries[]', JSON.stringify(query));
      const response = await fetch(url, {
        headers: { 'X-Appwrite-Project': PROJECT, Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) return response.json();
      if (response.status === 401 || response.status === 403) break;
    } catch (error) {
      console.warn('Public feed:', error.message);
    }
  }
  throw Error('Public collection unavailable');
}

export async function onRequestGet({ request, params, env }) {
  const collection = params.collection;
  if (!ALLOWED.has(collection)) return new Response('Not found', { status: 404 });
  const query = new URL(request.url).searchParams;
  const offset = Math.max(0, Math.min(10000, Number.parseInt(query.get('offset'), 10) || 0));
  const limit = Math.max(1, Math.min(100, Number.parseInt(query.get('limit'), 10) || 24));
  if (collection === 'listings' && query.has('school') && !canonicalSchool(query.get('school'))) {
    return Response.json({ error: 'Сургууль олдсонгүй.' }, { status: 400 });
  }
  const queries = collection === 'listings' ? listingQueries(query, offset, limit) :
    [{ method: 'limit', values: [limit] }, { method: 'offset', values: [offset] }];
  try {
    const active = collection === 'listings' && !offset && env?.SPONSOR_DB ?
      env.SPONSOR_DB.prepare("SELECT listing_id FROM vip_requests WHERE status='active' AND expires_at>? ORDER BY requested_at DESC LIMIT 100")
        .bind(new Date().toISOString()).all().catch(() => ({ results: [] })) : Promise.resolve({ results: [] });
    const [body, vip] = await Promise.all([upstream(collection, queries), active]);
    const ids = vip.results.map(row => row.listing_id);
    const extra = ids.length ? await upstream(collection, listingQueries(query, 0, 100, ids)).catch(() => ({ documents: [] })) : { documents: [] };
    const documents = body.documents || [];
    const vipDocuments = (extra.documents || []).filter(row => row.status !== 'sold');
    return Response.json({ documents, vip_documents: vipDocuments, total: body.total || 0 }, { headers: cache });
  } catch {
    return Response.json({ error: 'Зарууд түр ачаалагдсангүй.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
