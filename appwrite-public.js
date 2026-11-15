// Public Appwrite reads use the same document permissions as an anonymous visitor.
const project = '6ae367b80007a4d31918';
const base = 'https://sgp.cloud.appwrite.io/v1/databases/public/collections/listings/documents';

export async function publicListings(queries = [], { id, fetcher = fetch } = {}) {
  const url = new URL(base + (id ? '/' + encodeURIComponent(id) : ''));
  for (const query of queries) url.searchParams.append('queries[]', JSON.stringify(query));
  const response = await fetcher(url, {
    headers: { 'X-Appwrite-Project': project, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (id && response.status === 404) return null;
  if (!response.ok) throw Error('Public listings unavailable (' + response.status + ')');
  const data = await response.json();
  if (!id && !Array.isArray(data.documents)) throw Error('Invalid listings response');
  return data;
}
