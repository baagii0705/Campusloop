// Local-only Pages preview: uses a disposable SQLite database, never production writes.
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {onRequestGet as campus} from '../functions/api/campus.js';
import {onRequestGet as deals} from '../functions/api/deals/index.js';
import {onRequestPost as apply} from '../functions/api/deals/apply.js';
import {onRequestGet as adminGet,onRequestPost as adminPost} from '../functions/api/deals/admin.js';
const sqlite=new DatabaseSync(':memory:');sqlite.exec(await readFile('migrations/001-student-deals.sql','utf8'));
function statement(sql,params=[]){return {
 bind(...values){return statement(sql,values)},
 all:async()=>({results:sqlite.prepare(sql).all(...params)}),
 first:async()=>sqlite.prepare(sql).get(...params),
 run:async()=>({meta:sqlite.prepare(sql).run(...params)}),
 execute:async()=>/^\s*SELECT/i.test(sql)?{results:sqlite.prepare(sql).all(...params)}:{meta:sqlite.prepare(sql).run(...params)}
}}
const db={prepare:statement,batch:async statements=>{sqlite.exec('BEGIN');try{const out=[];for(const entry of statements)out.push(await entry.execute());sqlite.exec('COMMIT');return out}catch(e){sqlite.exec('ROLLBACK');throw e}}};
const root=resolve('dist'),types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://'+req.headers.host);const chunks=[];for await(const chunk of req)chunks.push(chunk);const request=new Request(url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});const context={request,env:{SPONSOR_DB:db}};let result;if(url.pathname==='/api/campus')result=await campus(context);else if(url.pathname==='/api/deals')result=await deals(context);else if(url.pathname==='/api/deals/apply')result=await apply(context);else if(url.pathname==='/api/deals/admin')result=await (req.method==='GET'?adminGet:adminPost)(context);else if(url.pathname.startsWith('/api/'))result=await fetch('https://sol1o.me'+url.pathname+url.search);if(result){res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));return}const path=resolve(root,'.'+decodeURIComponent(url.pathname));if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403);res.end();return}const file=(await stat(path)).isDirectory()?resolve(path,'index.html'):path;res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(await readFile(file))}catch{res.writeHead(404);res.end('Not found')}}).listen(Number(process.env.PORT)||4173,'0.0.0.0');
