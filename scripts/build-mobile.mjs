import {mkdir,copyFile,readFile,writeFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve('.'),dist=resolve(root,'dist');
await rm(dist,{recursive:true,force:true});
await mkdir(resolve(dist,'assets'),{recursive:true});
const assets=[];
async function asset(content,extension){
  const hash=createHash('sha256').update(content).digest('hex').slice(0,16);
  const name='/assets/'+hash+'.'+extension;
  await writeFile(resolve(dist,'.'+name),content);
  assets.push(name);
  return name;
}
let html=await readFile(resolve(root,'index.html'),'utf8');
// Content-address linked styles and scripts too: returning visitors may still
// have the previous service worker and its cached /board.css in their browser.
const pricingModule=await asset(await readFile(resolve(root,'sponsor-pricing.js'),'utf8'),'js');
for(const file of ['ui.css','board.css','campus-hub.css','campus-hub.js','sponsored-banner.css','sponsored-banner.js','sponsor-dashboard.js']){
  let content=await readFile(resolve(root,file),'utf8');
  if(file.endsWith('.js'))content=content.replace("import('/sponsor-pricing.js')","import('"+pricingModule+"')");
  const name=await asset(content,file.endsWith('.css')?'css':'js');
  html=html.replaceAll('href="/'+file+'"','href="'+name+'"').replaceAll('src="/'+file+'"','src="'+name+'"');
}
// Cache application CSS/JS separately; preserve stylesheet cascade order.
for(const match of [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)]){
  const name=await asset(match[1],'css');
  html=html.replace(match[0],'<link rel="stylesheet" href="'+name+'">');
}
const uploadModule=await asset(await readFile(resolve(root,'image-upload.mjs'),'utf8'),'mjs');
for(const match of [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]){
  let script=match[1].replace("if('serviceWorker' in navigator)","if(!window.Capacitor && 'serviceWorker' in navigator)");
  script=script.replace("import('/image-upload.mjs')","import('"+uploadModule+"')");
  const name=await asset(script,'js');
  html=html.replace(match[0],'<script src="'+name+'" defer></script>');
}
html=html.replace('<script src="https://unpkg.com/appwrite@17.0.0/dist/iife/sdk.js">','<script src="https://unpkg.com/appwrite@17.0.0/dist/iife/sdk.js" defer>');
// Start the public feed while the account SDK downloads. No private data cache.
const early="<script>window.solioFeedRequest=fetch('/api/public/listings?offset=0&limit=24',{credentials:'omit',cache:'no-store'}).catch(()=>null);</script>";
html=html.replace('</head>',early+'</head>');
await writeFile(resolve(dist,'index.html'),html);
const files=['manifest.webmanifest','solio-icon.svg','ui.css','board.css','campus-hub.css','campus-hub.js','sponsored-banner.css','sponsored-banner.js','sponsor-dashboard.js','sponsor-pricing.js'];
for(const file of files)await copyFile(resolve(root,file),resolve(dist,file));
let sw=await readFile(resolve(root,'sw.js'),'utf8');
sw=sw.replace('solio-shell-v9','solio-shell-v9-'+createHash('sha256').update(assets.join(',')).digest('hex').slice(0,12));
sw=sw.replace(/const SHELL=\[[^\]]*\]/,'const SHELL='+JSON.stringify(['/', '/index.html', '/manifest.webmanifest', '/solio-icon.svg', ...assets]));
await writeFile(resolve(dist,'sw.js'),sw);
await writeFile(resolve(dist,'_headers'),'/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n');
console.log('Solio web assets built: '+Buffer.byteLength(html)+' byte HTML; '+assets.length+' versioned, cacheable assets.');
