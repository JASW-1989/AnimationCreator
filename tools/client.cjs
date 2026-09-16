'use strict';
const fs=require('node:fs'),path=require('node:path');
function settings(){const f=path.join(process.env.KOMA_DATA_DIR?path.resolve(process.env.KOMA_DATA_DIR):path.join(__dirname,'..','.local'),'session.json');if(!fs.existsSync(f))throw new Error('Start Koma first: node server.cjs');const s=JSON.parse(fs.readFileSync(f,'utf8'));const u=new URL(s.url);if(u.hostname!=='127.0.0.1'||u.protocol!=='http:')throw new Error('Only loopback sessions are accepted');return s;}
async function request(route,body,extraHeaders={}){const s=settings();const r=await fetch(s.url+route,{method:body?'POST':'GET',headers:{'X-Koma-Token':s.token,'Content-Type':'application/json',...extraHeaders},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});const text=await r.text();if(!r.ok){try{throw new Error(JSON.parse(text).error);}catch(e){throw e;}}return r.headers.get('content-type').startsWith('application/json')?JSON.parse(text):text;}
module.exports={request};
