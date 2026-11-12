import {onRequestGet as getSociety} from './index.js';
import {eventCalendar} from '../../../event-calendar.js';
import {response} from '../../../sponsor-api-utils.js';
export async function onRequestGet(context){
 const url=new URL(context.request.url),id=url.searchParams.get('id')||'';
 if(!/^[a-zA-Z0-9_-]{1,70}$/.test(id))return response({error:'Эвентийн дугаар буруу байна.'},400);
 url.searchParams.set('kind','event');
 const result=await getSociety({...context,request:new Request(url,{headers:context.request.headers})});
 if(!result.ok)return result;
 const {item}=await result.json();
 return new Response(eventCalendar(item),{headers:{'Content-Type':'text/calendar; charset=utf-8','Content-Disposition':'attachment; filename="sol1o-'+id+'.ics"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
