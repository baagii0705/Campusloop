import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext,Script} from 'node:vm';
const html=readFileSync('index.html','utf8'),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const source=(start,end)=>script.slice(script.indexOf(start),script.indexOf(end,script.indexOf(start)));

test('login continuation opens the requested UI once and cancelling discards it',()=>{
 const auth=source('let solioAfterAuth=','function openModal(');
 const close=source('function closeModal(','function filterWantedRequests');
 const classList={remove(){},contains(){return false}};
 const context={session:null,document:{getElementById:()=>({classList}),querySelector:()=>({classList})},requestAnimationFrame:fn=>fn(),window:{},location:{hash:''},solioModalReturnFocus:null,opened:[],openModal:mode=>context.opened.push(mode)};
 const api=runInNewContext(auth+close+';({requireSolioAccount,finishSolioAuthentication,closeModal})',context);
 let resumes=0;
 api.requireSolioAccount(()=>resumes++,'Эвент нэмэх');assert.equal(resumes,0);assert.deepEqual(context.opened,['login']);
 context.session={user:{id:'owner'}};api.finishSolioAuthentication();api.finishSolioAuthentication();assert.equal(resumes,1);
 context.session=null;api.requireSolioAccount(()=>resumes++,'Клуб бүртгүүлэх');api.closeModal();context.session={};api.finishSolioAuthentication();assert.equal(resumes,1);
 api.requireSolioAccount(()=>resumes++,'Миний зарууд');assert.equal(resumes,2);
});

test('closing a listing preserves the underlying search route',()=>{
 let restored;
 const close=source('function closeModal(','function filterWantedRequests');
 const classList={remove(){},contains(){return false}};
 const fn=runInNewContext(close+';closeModal',{solioAfterAuth:null,solioPendingPostAfterAuth:false,solioModalReturnFocus:null,solioListingReturnHash:'#search',document:{getElementById:()=>({classList}),querySelector:()=>({classList})},location:{hash:'#listing-123',pathname:'/',search:''},history:{replaceState:(a,b,url)=>restored=url},window:{matchMedia:()=>({addEventListener(){}})},requestAnimationFrame:fn=>fn()});
 fn();assert.equal(restored,'/#search');
 const handler=source("const solioSearchResultsRoot=","const solioSearchSchoolsRoot=");assert.doesNotMatch(handler,/leaveSolioSearch|history.replaceState/);
});

test('listing status changes remain owner-scoped and use validated Mongolian choices',async()=>{
 let captured,writes=0;const row={id:'l',user_id:'owner',status:'available'};
 const chain={update(data){writes++;assert.equal(data.status,'sold');return this},eq(field,value){if(field==='user_id')assert.equal(value,'owner');return this},then(resolve){resolve({error:null})}};
 const context={session:{user:{id:'other'}},listings:[row],db:{from:()=>chain},SolioUX:{listingForm(...args){captured=args}},toast(){},render(){}};
 const fn=runInNewContext(source('function changeSolioListingStatus(', 'async function openSolioNotifications')+';changeSolioListingStatus',context);
 fn('l');assert.equal(captured,undefined);context.session.user.id='owner';fn('l');assert.match(captured[2],/Зарагдсан/);
 await assert.rejects(captured[4](new Map([['status','injected']])));assert.equal(writes,0);
 await captured[4](new Map([['status','sold']]));assert.equal(writes,1);assert.equal(row.status,'sold');
});

test('offer form prevents own offers and rejects invalid amounts before writing',async()=>{
 let captured,writes=0;
 const context={session:{user:{id:'buyer'}},listings:[{id:'l',user_id:'seller',price:5000}],db:{from:()=>({insert:async row=>{writes++;assert.equal(row.buyer_id,'buyer');return {error:null}}})},SolioUX:{listingForm(...args){captured=args}},toast(){}};
 const fn=runInNewContext(source('function makeOffer(', 'async function shareListing')+';makeOffer',context);
 fn('l');await assert.rejects(captured[4](new Map([['amount','-2'],['message','']])));assert.equal(writes,0);
 await captured[4](new Map([['amount','4500'],['message','Hello']]));assert.equal(writes,1);
 captured=null;context.session.user.id='seller';fn('l');assert.equal(captured,null);
});

test('all feature menu and creation chooser parse and cover existing product destinations',()=>{
 const ux=readFileSync('usability.js','utf8');assert.doesNotThrow(()=>new Script(ux));
 for(const action of ['openSolioWanted','openSolioCommunity','showSavedListings','goMyListings','SolioCampus.open','SolioCampus.deals','SolioCampus.apply','SolioSocieties.open','SolioSocieties.create','SolioSponsorOpen'])assert.ok(ux.includes(action),action);
 assert.doesNotMatch(ux,/fetch\(/,'opening the menu adds no data request');
});

test('a failed filtered listing read cannot silently become an unrelated first-page listing',async()=>{
 let fetched=0;const sdk={Query:{equal:()=>'{"method":"equal"}'},Client:class{setEndpoint(){return this}setProject(){return this}},Databases:class{async listDocuments(){throw Error('Failed to fetch')}}};
 const fn=runInNewContext(source('async function appwriteExecute(', 'const appwriteStorageApi=')+';appwriteExecute',{
  APPWRITE_CONFIG:{databaseId:'public',projectId:'test'},Appwrite:sdk,appwriteDatabases:new sdk.Databases(),appwriteError:message=>({error:{message}}),fetch:async()=>{fetched++;return {ok:true,json:async()=>({documents:[{$id:'unrelated'}]})}},normalizeAppwriteDocument:x=>x
 });
 const result=await fn({collection:'listings',operation:'select',filters:[{field:'id',value:'wanted-id'}],queries:[],orFilters:[],single:true});assert.ok(result.error);assert.equal(fetched,0);
});
