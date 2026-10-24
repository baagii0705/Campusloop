import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
const root=resolve('.');const dist=resolve(root,'dist');await mkdir(dist,{recursive:true});
let html=await readFile(resolve(root,'index.html'),'utf8');
// Mobile bundle must not register the web-only service worker.
html=html.replace("if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(err=>console.warn('Solio PWA:',err)))}","if(!window.Capacitor && 'serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(err=>console.warn('Solio PWA:',err)))}");
await writeFile(resolve(dist,'index.html'),html);
for(const file of ['manifest.webmanifest','solio-icon.svg','sw.js'])await copyFile(resolve(root,file),resolve(dist,file));
console.log('Solio web assets copied to dist/.');
