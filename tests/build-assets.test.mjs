import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {runInNewContext} from 'node:vm';
test('trimmed local Appwrite SDK preserves the services and query/permission API used by the app',async()=>{
 const result=await build({entryPoints:['scripts/appwrite-browser.mjs'],bundle:true,write:false,format:'iife',target:'es2020',minify:true});const context={window:{},URL,URLSearchParams,Set,Map,Uint8Array,TextEncoder,TextDecoder};runInNewContext(result.outputFiles[0].text,context);const sdk=context.window.Appwrite;
 for(const service of ['Client','Account','Databases','Storage','Query','ID','Permission','Role'])assert.ok(sdk[service],service);
 assert.equal(JSON.parse(sdk.Query.equal('school','ШУТИС')).attribute,'school');assert.match(sdk.Permission.read(sdk.Role.any()),/read/);const client=new sdk.Client().setEndpoint('https://sgp.cloud.appwrite.io/v1').setProject('test');assert.equal(typeof new sdk.Account(client).createJWT,'function');assert.equal(typeof new sdk.Storage(client).createFile,'function');
 assert.ok(result.outputFiles[0].text.length<60000,'unused SDK services remain excluded');
});
test('optional features stay out of initial HTML and the service worker caches them on demand',async()=>{
 const html=await readFile('index.html','utf8'),loader=await readFile('feature-loader.js','utf8'),build=await readFile('scripts/build-mobile.mjs','utf8'),sw=await readFile('sw.js','utf8');
 assert.doesNotMatch(html,/<script src="\/(?:societies|campus-hub|sponsor-dashboard)\.js/);assert.match(loader,/societies\.js/);assert.match(build,/\.\.\.critical/);assert.match(sw,/caches\.match\(req\)/);assert.match(sw,/pathname\.startsWith\('\/api\/'\)/);assert.doesNotMatch(build,/copyFile.*ui\.css/);
});
