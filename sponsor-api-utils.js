// Common validators and auth for Solio sponsored ads. Never expose admin data from public routes.
export const response=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function originOK(request){const origin=request.headers.get('Origin');return !origin||origin===new URL(request.url).origin}
export async function readJSON(request, max = 8192) {
  const tooLarge = 'Хүсэлтийн хэмжээ хэтэрсэн';
  if (Number(request.headers.get('Content-Length')) > max) throw Error(tooLarge);
  const reader = request.body?.getReader();
  if (!reader) throw Error('JSON буруу байна');
  const decoder = new TextDecoder();
  let size = 0;
  let raw = '';
  try {
    while (true) {
      const {value, done} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        void reader.cancel().catch(() => {});
        throw Error(tooLarge);
      }
      raw += decoder.decode(value, {stream: true});
    }
    raw += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  let obj;
  try { obj = JSON.parse(raw); } catch { throw Error('JSON буруу байна'); }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw Error('Хүсэлтийн формат буруу');
  return obj;
}
export const clean=(x,max=160)=>String(x??'').replace(/[\u0000-\u001F\u007F]/g,' ').trim().slice(0,max);
export function safeURL(value,allowEmpty=false){const s=clean(value,2048);if(!s&&allowEmpty)return '';try{const u=new URL(s);if(u.protocol!=='https:'||u.username||u.password||['localhost','127.0.0.1','0.0.0.0','::1'].includes(u.hostname)||u.hostname.endsWith('.local'))return null;return u.href}catch{return null}}
export function safeDate(s){if(s===null||s===undefined||s==='')return null;const d=new Date(s);if(!Number.isFinite(d.valueOf()))throw Error('Огноо буруу байна');return d.toISOString()}
export function checkDateRange(start,end){if(start&&end&&end<=start)throw Error('Дуусах өдөр эхлэх өдрөөс хойш байх ёстой')}
// Verify the JWT with Appwrite; never trust an owner ID or role from a request body.
export async function verifiedUser(request,{includePrefs=false}={}){
 const bearer=request.headers.get('Authorization')||'';
 if(!/^Bearer [A-Za-z0-9._-]{20,3000}$/.test(bearer))return null;
 try{
  const check=await fetch('https://sgp.cloud.appwrite.io/v1/account',{headers:{'X-Appwrite-Project':'6ae367b80007a4d31918','X-Appwrite-JWT':bearer.slice(7),'Accept':'application/json'},signal:AbortSignal.timeout(9000)});
  if(!check.ok)return null;
  const user=await check.json();
  return typeof user.$id==='string'&&user.$id?{id:user.$id,admin:Array.isArray(user.labels)&&user.labels.includes('admin'),...(includePrefs?{prefs:user.prefs}:{})}:null;
 }catch{return null}
}
export async function requireAdmin(request){return (await verifiedUser(request))?.admin===true}

export function binding(context){if(!context.env?.SPONSOR_DB)throw Error('SPONSOR_DB binding missing');return context.env.SPONSOR_DB}
