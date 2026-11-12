// Read only public Appwrite collections. Explicit projections keep contact data out of feeds.
export const CAMPUS_SECTIONS = {
  listings: ['title','description','price','school','category','status','image_url','image_urls','created_at'],
  wanted_posts: ['title','details','budget','school','created_at'],
  campus_posts: ['content','school','created_at']
};
export function campusItem(collection, row) {
  const kind = {listings:'listing',wanted_posts:'wanted',campus_posts:'post'}[collection];
  const id = String(row.$id || row.id || '');
  if (!kind || !id) return null;
  const date = new Date(row.created_at || row.$createdAt);
  const item = {id,kind,school:String(row.school || ''),created_at:Number.isFinite(+date)?date.toISOString():''};
  if (kind === 'listing') {
    Object.assign(item,{title:String(row.title || ''),description:String(row.description || ''),category:String(row.category || ''),status:String(row.status || 'available'),price:row.price == null?null:Number(row.price),image_url:String(row.image_url || ''),image_urls:row.image_urls || '[]'});
  } else if (kind === 'wanted') Object.assign(item,{title:String(row.title || ''),details:String(row.details || ''),budget:row.budget == null?null:Number(row.budget)});
  else item.content = String(row.content || '');
  return item;
}
export async function readCampusSection(collection, school, offset, fetcher=fetch) {
  if (!Object.hasOwn(CAMPUS_SECTIONS,collection)) throw Error('Unknown campus section');
  const url = new URL('https://sgp.cloud.appwrite.io/v1/databases/public/collections/'+collection+'/documents');
  const queries = [
    {method:'equal',attribute:'school',values:[school]},
    {method:'orderDesc',attribute:'created_at'},
    {method:'limit',values:[13]},
    {method:'offset',values:[offset]},
    {method:'select',values:['$id','$createdAt',...CAMPUS_SECTIONS[collection]]}
  ];
  for (const query of queries) url.searchParams.append('queries[]',JSON.stringify(query));
  const res = await fetcher(url,{headers:{'X-Appwrite-Project':'6ae367b80007a4d31918',Accept:'application/json'},signal:AbortSignal.timeout(8000)});
  if (!res.ok) throw Error('Campus data unavailable');
  const body = await res.json();
  if (!Array.isArray(body.documents)) throw Error('Invalid campus response');
  return {items:body.documents.slice(0,12).map(row=>campusItem(collection,row)).filter(Boolean),total:Number(body.total)||0,has_more:body.documents.length>12};
}
