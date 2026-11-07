// Keep feature pages and administration out of the initial marketplace bundle.
(()=>{
'use strict';
const features={
 campus:{script:'/campus-hub.js',style:'/campus-hub.css'},
 societies:{script:'/societies.js',style:'/societies.css'},
 sponsor:{script:'/sponsor-dashboard.js'}
};
const pending=new Map(),ready=new Set();
let intent=0;window.SolioCancelFeatureNavigation=()=>{intent++};
function navigate(name,fn){const current=++intent;invoke(name,()=>{if(current===intent)fn()})}
async function load(name){
 if(ready.has(name))return;
 if(pending.has(name))return pending.get(name);
 const feature=features[name];
 const promise=(async()=>{
  let link;
  if(feature.style){link=document.createElement('link');link.rel='stylesheet';link.href=feature.style;await new Promise((resolve,reject)=>{link.onload=resolve;link.onerror=()=>{link.remove();reject(Error('Style failed'))};document.head.append(link)})}
  await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=feature.script;script.onload=resolve;script.onerror=()=>{script.remove();link?.remove();reject(Error('Feature failed'))};document.body.append(script)});
  ready.add(name);
 })().catch(error=>{pending.delete(name);throw error});
 pending.set(name,promise);return promise;
}
async function invoke(name,fn){try{await load(name);fn()}catch{toast('Хэсгийг ачаалж чадсангүй. Товчийг дахин дарж оролдоно уу.')}}
window.SolioCampus={open:()=>navigate('campus',()=>window.SolioCampus.open()),deals:()=>navigate('campus',()=>window.SolioCampus.deals()),leave(){},restoreModalRoute(){}};
window.SolioSocieties={open:options=>navigate('societies',()=>window.SolioSocieties.open(options)),leave(){},restoreModalRoute(){}};
window.SolioSponsorOpen=placement=>invoke('sponsor',()=>window.SolioSponsorOpen(placement));
function route(){const hash=location.hash;if(['#campus','#deals'].includes(hash)&&!ready.has('campus'))invoke('campus',()=>{});if((hash==='#societies'||hash.startsWith('#societies/'))&&!ready.has('societies'))invoke('societies',()=>{})}
window.addEventListener('popstate',route);route();
if(new URLSearchParams(location.search).has('sponsor'))invoke('sponsor',()=>{});
const panel=document.getElementById('adminPanel');
new MutationObserver(()=>{if(!panel.hidden&&isCampusAdmin())for(const name of Object.keys(features))invoke(name,()=>{})}).observe(panel,{attributes:true,attributeFilter:['hidden']});
})();
