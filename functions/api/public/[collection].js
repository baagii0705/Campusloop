// Public, read-only Cloudflare Pages proxy. No API keys, cookies or user data.
const PROJECT='6ae367b80007a4d31918';
const DATABASE='public';
const ALLOWED=new Set(['listings','sponsored_ads']);
export async function onRequestGet({request,params}){
 const collection=params.collection;
 if(!ALLOWED.has(collection))return new Response('Not found',{status:404});
 const incoming=new URL(request.url);
 const offset=Math.max(0,Math.min(10000,Number.parseInt(incoming.searchParams.get('offset')||'0',10)||0));
 const limit=Math.max(1,Math.min(100,Number.parseInt(incoming.searchParams.get('limit')||'24',10)||24));
 const queries=[JSON.stringify({method:'limit',values:[limit]}),JSON.stringify({method:'offset',values:[offset]})];
 if(collection==='listings')queries.push(JSON.stringify({method:'orderDesc',attribute:'created_at'}));
 const endpoints=['https://sgp.cloud.appwrite.io/v1','https://cloud.appwrite.io/v1'];
 let failure='upstream unavailable';
 for(const endpoint of endpoints){
  try{
   const u=new URL(endpoint+'/databases/'+DATABASE+'/collections/'+collection+'/documents');
   for(const q of queries)u.searchParams.append('queries[]',q);
   const response=await fetch(u,{headers:{'X-Appwrite-Project':PROJECT,'Accept':'application/json'},signal:AbortSignal.timeout(8000)});
   if(response.ok){
    const body=await response.json();
    return Response.json({documents:body.documents||[],total:body.total||0},{headers:{'Cache-Control':'public, max-age=15'}});
   }
   failure='Appwrite HTTP '+response.status;
   if(response.status===401||response.status===403)return Response.json({error:'Public collection access denied'},{status:502});
  }catch(e){failure=String(e?.message||e)}
 }
 return Response.json({error:'Public ads temporarily unavailable',detail:failure},{status:502,headers:{'Cache-Control':'no-store'}});
}