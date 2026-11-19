import {mkdir,copyFile,readFile,writeFile,rm,cp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {mergeStudyData} from '../study/guide-data.js';
import {build,transform} from 'esbuild';
import {partnerLanding,SITE_ORIGIN} from '../partner-pages.js';
import {qrSvg} from '../offer-qr.js';
const root=resolve('.'),dist=resolve(root,'dist');
await rm(dist,{recursive:true,force:true});
await mkdir(resolve(dist,'assets'),{recursive:true});
const assets=[],critical=[],paths=new Map();
async function asset(content,extension,{initial=false,main=false}={}){
 const compiled=await transform(content,{loader:extension==='css'?'css':'js',target:'es2020',charset:'utf8',legalComments:'eof',minifyWhitespace:true,minifySyntax:true,minifyIdentifiers:!main});
 const output=compiled.code,hash=createHash('sha256').update(output).digest('hex').slice(0,16),name='/assets/'+hash+'.'+extension;
 await writeFile(resolve(dist,'.'+name),output);assets.push({name,bytes:Buffer.byteLength(output),initial});if(initial)critical.push(name);return name;
}
let html=await readFile(resolve(root,'index.html'),'utf8');
const sdk=await build({entryPoints:[resolve(root,'scripts/appwrite-browser.mjs')],bundle:true,write:false,format:'iife',target:'es2020',minify:true,charset:'utf8',legalComments:'eof'});
const sdkPath=await asset(sdk.outputFiles[0].text,'js',{initial:true});
html=html.replace('<script src="https://unpkg.com/appwrite@17.0.0/dist/iife/sdk.js"></script>','<script src="'+sdkPath+'" defer></script>');
// Secondary screens load only on navigation; the service worker also fetches them on demand.
const pricingPath=await asset(await readFile('sponsor-pricing.js','utf8'),'js');
for(const file of ['board.css','student-home.css','student-home.js','school-directory.js','search-alerts.js','sponsored-banner.css','campus-hub.css','campus-hub.js','societies.css','societies.js','usability.js','vip.js','sponsored-banner.js','sponsor-application.js','admin-dashboard.css','admin-dashboard.js']){
 let content=await readFile(resolve(root,file),'utf8');if(file==='admin-dashboard.js'){const bundled=await build({entryPoints:[resolve(root,file)],bundle:true,write:false,format:'iife',target:'es2020',charset:'utf8'});content=bundled.outputFiles[0].text}if(file.endsWith('.js'))content=content.replace("import('/sponsor-pricing.js')","import('"+pricingPath+"')");
 const initial=['board.css','student-home.css','student-home.js','school-directory.js','search-alerts.js','sponsored-banner.css','sponsored-banner.js','usability.js','vip.js'].includes(file),path=await asset(content,file.endsWith('.css')?'css':'js',{initial});paths.set('/'+file,path);
 html=html.replaceAll('href="/'+file+'"','href="'+path+'"').replaceAll('src="/'+file+'"','src="'+path+'"');
}
let loader=await readFile('feature-loader.js','utf8');for(const [file,path] of paths)loader=loader.replaceAll("'"+file+"'","'"+path+"'");
const loaderPath=await asset(loader,'js',{initial:true});html=html.replace('src="/feature-loader.js"','src="'+loaderPath+'"');
const uploadPath=await asset(await readFile('image-upload.mjs','utf8'),'mjs');
for(const match of [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]){
 const script=match[1].replace("if('serviceWorker' in navigator)","if(!window.Capacitor && 'serviceWorker' in navigator)").replace("import('/image-upload.mjs')","import('"+uploadPath+"')");
 const path=await asset(script,'js',{initial:true,main:true});html=html.replace(match[0],'<script src="'+path+'" defer></script>');
}
const schoolBundle=await build({entryPoints:[resolve(root,'scripts/schools-browser.js')],bundle:true,write:false,format:'iife',target:'es2020',charset:'utf8'});
const schoolPath=await asset(schoolBundle.outputFiles[0].text,'js',{initial:true});
html=html.replace('src="/schools-browser.js"','src="'+schoolPath+'"');
await writeFile(resolve(dist,'index.html'),html);
await cp(resolve(root,'study'),resolve(dist,'study'),{recursive:true,filter:path=>!path.endsWith('/README.md')});
const studySource = resolve(root, 'study/catalog/data');
const [studySchools, studyPrograms] = await Promise.all([
  readFile(resolve(studySource, 'schools.json'), 'utf8'),
  readFile(resolve(studySource, 'programs.json.gz')),
]);
const studyData = JSON.stringify(mergeStudyData(JSON.parse(studySchools), JSON.parse(gunzipSync(studyPrograms))));
const studyDataHash = createHash('sha256').update(studyData).digest('hex').slice(0, 16);
const studyDataPath = '/assets/study-' + studyDataHash + '.json';
await writeFile(resolve(dist, '.' + studyDataPath), studyData);
const studyGuide = await build({
  entryPoints: [resolve(root, 'study/guide.js')], bundle: true, write: false, format: 'esm', target: 'es2020', charset: 'utf8'
});
const studyGuidePath = await asset(studyGuide.outputFiles[0].text, 'js');
const studyCssPath = await asset(await readFile(resolve(root, 'study/guide.css'), 'utf8'), 'css');
const studyPage = await readFile(resolve(root, 'study/index.html'), 'utf8');
await writeFile(resolve(dist, 'study/index.html'), studyPage
  .replace('/study/guide.css', studyCssPath)
  .replace('/study/guide.js', studyGuidePath)
  .replace('/study/catalog/data/guide.json', studyDataPath));
for(const file of ['manifest.webmanifest','solio-icon.svg'])await copyFile(resolve(root,file),resolve(dist,file));
// Share links and printable QR artwork work independently of the marketplace bundle.
await mkdir(resolve(dist,'partner-assets'),{recursive:true});
await writeFile(resolve(dist,'partners.html'),partnerLanding());
await writeFile(resolve(dist,'partner-assets/deals-qr.svg'),qrSvg(SITE_ORIGIN+'/#deals'));
for(const file of ['offers.css','share.js','social.png'])await copyFile(resolve(root,'partner-assets',file),resolve(dist,'partner-assets',file));
// The BSD SDK license accompanies the bundled subset; no CDN dependency at runtime.
await copyFile(resolve(root,'node_modules/appwrite/LICENSE'),resolve(dist,'THIRD-PARTY-LICENSE.txt'));
let sw=await readFile('sw.js','utf8');sw=sw.replace(/solio-shell-v\d+/,'solio-shell-v13-'+createHash('sha256').update(assets.map(a=>a.name).join(',')).digest('hex').slice(0,12));
sw=sw.replace(/const SHELL=\[[^\]]*\]/,'const SHELL='+JSON.stringify(['/','/index.html','/manifest.webmanifest','/solio-icon.svg',...critical]));await writeFile(resolve(dist,'sw.js'),sw);
await writeFile(resolve(dist,'_headers'),'/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n');
const stats={html:Buffer.byteLength(html),initial:assets.filter(a=>a.initial).reduce((n,a)=>n+a.bytes,0),deferred:assets.filter(a=>!a.initial).reduce((n,a)=>n+a.bytes,0),assets};
await writeFile(resolve(dist,'build-stats.json'),JSON.stringify(stats,null,2));console.log('Solio built: '+stats.html+' byte HTML; '+stats.initial+' bytes initial JS/CSS; '+stats.deferred+' bytes on demand.');
