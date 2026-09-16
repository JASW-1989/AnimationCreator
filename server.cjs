'use strict';
const http=require('node:http'), fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Core=require('./public/core.js'),Vault=require('./public/vault.js'),{Store}=require('./lib/store.cjs');
const ROOT=__dirname, DIR=process.env.KOMA_DATA_DIR?path.resolve(process.env.KOMA_DATA_DIR):path.join(ROOT,'.local'), PORT=Number(process.env.KOMA_PORT||4173);
if(!Number.isInteger(PORT)||PORT<1024||PORT>65535)throw new Error('Invalid KOMA_PORT');
fs.mkdirSync(DIR,{recursive:true,mode:0o700});
const lock=path.join(DIR,'server.lock');
if(fs.existsSync(lock)) {let pid;try{pid=Number(fs.readFileSync(lock,'utf8'));process.kill(pid,0);}catch(e){if(e.code==='ESRCH'||!pid)fs.unlinkSync(lock);else throw e;}if(fs.existsSync(lock))throw new Error('A Koma server is already active for this project.');}
fs.writeFileSync(lock,String(process.pid),{flag:'wx',mode:0o600});
const store=new Store(DIR);
const renderCache=new (require('./lib/render-cache.cjs').RenderCache)(path.join(DIR,'render-cache')); 
const batchQueue=new (require('./lib/batch-queue.cjs').BatchQueue)(path.join(DIR,'batch-queue'),renderCache);
const editLease=new (require('./lib/edit-lease.cjs').EditLease)();
const previewBroker=new (require('./lib/preview-broker.cjs').PreviewBroker)();
let session;
try {session=store.load();if(!session){const legacy=path.join(DIR,'project.json');if(fs.existsSync(legacy)){const v=JSON.parse(fs.readFileSync(legacy,'utf8'));session=new Core.Session(v.project);session.revision=v.revision||0;store.save(session);}else session=new Core.Session();}}
catch(e){fs.unlinkSync(lock);throw e;}
let view={frame:0,revision:0};
const TOKEN=crypto.randomBytes(32).toString('hex'), origin='http://127.0.0.1:'+PORT;
const config={url:origin,token:TOKEN,pid:process.pid};
fs.writeFileSync(path.join(DIR,'session.json'),JSON.stringify(config),{mode:0o600});
function transaction(fn){const draft=Vault.restore(Vault.snapshot(session));const out=fn(draft);store.save(draft);session=draft;return out;}
const state=()=>({...session.state(),view,vault:store.recovery,editLease:editLease.status()});
function send(res,code,data,type='application/json; charset=utf-8') {res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'"});res.end(type.startsWith('application/json')?JSON.stringify(data):data);}
async function readBody(req){let n=0,buf=[];for await(const b of req){n+=b.length;if(n>70000000)throw new Error('Request exceeds 70 MB limit');buf.push(b);}return JSON.parse(Buffer.concat(buf).toString('utf8')||'{}');}
const server=http.createServer(async(req,res)=>{
 try {
  if(req.headers['sec-fetch-site']==='cross-site')return send(res,403,{error:'Cross-site request rejected'});
  if(!['127.0.0.1:'+PORT,'localhost:'+PORT].includes(req.headers.host))return send(res,403,{error:'Host rejected'});
  if(req.headers.origin&&!['http://127.0.0.1:'+PORT,'http://localhost:'+PORT].includes(req.headers.origin))return send(res,403,{error:'Cross-origin request rejected'});
  const u=new URL(req.url,origin);
  if(u.pathname.startsWith('/api/')) {
   if(req.headers['x-koma-token']!==TOKEN)return send(res,401,{error:'Missing local session token'});
   if(req.method==='GET') {
    if(u.pathname==='/api/atelier/worker')return send(res,200,previewBroker.claim());
    if(u.pathname==='/api/edit-lease')return send(res,200,editLease.status());
    if(u.pathname==='/api/atelier/schema')return send(res,200,{version:Core.VERSION,commands:Core.production.Atelier.schemas,stages:Core.production.Atelier.STAGES});
    if(u.pathname==='/api/state')return send(res,200,state());
    if(u.pathname==='/api/queue/list')return send(res,200,{queues:batchQueue.list()});
    if(u.pathname==='/api/queue/source')return send(res,200,batchQueue.source(u.searchParams.get('id')));
    if(u.pathname==='/api/preflight')return send(res,200,session.project.production?Core.production.preflight(session.project):{ok:false,messages:[{level:'error',code:'legacy',detail:'Load a production project'}]});
    if(u.pathname==='/api/qa')return send(res,200,session.project.production?Core.quality(session.project):{...Core.quality(session.project),contact:Core.plugins.contactReport(session.project)});
    if(u.pathname==='/api/render/frame')return send(res,200,renderCache.read(u.searchParams.get('job'),Number(u.searchParams.get('frame'))));
    if(u.pathname==='/api/plugins')return send(res,200,{plugins:session.project.production?Core.production.catalog():Core.plugins.catalog(),operations:[...Core.plugins.operations,...Core.cinema.operations,...Core.production.operations],proExtensions:Core.production.Pro.features,cinemaExtensions:["Shot Board","Multiplane Camera","Composite Review"]});
    if(u.pathname==='/api/snapshot')return send(res,200,Vault.snapshot(session));
    if(u.pathname==='/api/frame')return send(res,200,Core.renderSVG(session.project,Number(u.searchParams.get('frame')||0)),'image/svg+xml');
    return send(res,404,{error:'Unknown route'});
   }
   if(req.method!=='POST')return send(res,405,{error:'Only GET and POST are supported'});
   if(!String(req.headers['content-type']).startsWith('application/json'))return send(res,415,{error:'application/json required'});
   const body=await readBody(req);let result;
   if(u.pathname==='/api/edit-lease/acquire')return send(res,200,editLease.acquire(body.owner,body.purpose,body.seconds));
   if(u.pathname==='/api/edit-lease/renew')return send(res,200,editLease.renew(body.lease,body.seconds));
   if(u.pathname==='/api/edit-lease/release')return send(res,200,editLease.release(body.lease));
   if(u.pathname==='/api/atelier/render')return send(res,200,await previewBroker.request(session,body));
   if(u.pathname==='/api/atelier/render-result')return send(res,200,previewBroker.complete(body));
   if(u.pathname==='/api/atelier/read'){session.check(body.expectedRevision);const P=Core.production,A=P.Atelier,p=session.project;if(!p.production)throw Error('Production project required');const a=body.asset?P.findAsset(p,body.asset):null;return send(res,200,{revision:session.revision,asset:a?(body.geometry? a : {...P.summary(a),lineHash:a.kind==='drawing'?A.Paint.lineStamp(a):null}):null,atelier:p.production.atelier||null,pipeline:body.shot?A.pipeline(p,body.shot):null,diagnostics:A.diagnostics(p)});}
   const writes=new Set(['/api/commit','/api/command','/api/undo','/api/redo','/api/load','/api/restore-session','/api/checkpoint','/api/restore-checkpoint','/api/remove-checkpoint']);
   if(writes.has(u.pathname))editLease.check(req.headers['x-koma-lease']);
   if(u.pathname==='/api/queue/create'){session.check(body.expectedRevision);return send(res,200,batchQueue.create(session.project,session.revision,body.jobs));}
   if(u.pathname==='/api/queue/claim')return send(res,200,batchQueue.claim(body.id,body.job));
   if(u.pathname==='/api/queue/put')return send(res,200,batchQueue.put(body.id,body.job,body.lease,body.frame,body.png));
   if(u.pathname==='/api/queue/finish')return send(res,200,batchQueue.finish(body.id,body.job,body.lease));
   if(u.pathname==='/api/queue/pause')return send(res,200,batchQueue.pause(body.id));
   if(u.pathname==='/api/queue/remove')return send(res,200,batchQueue.remove(body.id));
   if(u.pathname==='/api/render/start'){session.check(body.expectedRevision);return send(res,200,renderCache.begin(session.project,session.revision,body));}
   if(u.pathname==='/api/render/put')return send(res,200,renderCache.put(body.job,body.frame,body.png));
   if(u.pathname==='/api/preview')result=transaction(s=>s.preview(body.commands,body.expectedRevision,body.scope||null));
   else if(u.pathname==='/api/commit'){transaction(s=>s.commit(body.planId,body.expectedRevision));result=state();}
   else if(u.pathname==='/api/command'){transaction(s=>s.apply(body.commands,body.expectedRevision));result=state();}
   else if(u.pathname==='/api/undo'){transaction(s=>s.undo(body.expectedRevision));result=state();}
   else if(u.pathname==='/api/redo'){transaction(s=>s.redo(body.expectedRevision));result=state();}
   else if(u.pathname==='/api/load'){transaction(s=>s.load(body.project,body.expectedRevision));view.frame=Math.min(view.frame,session.project.frames-1);result=state();}
   else if(u.pathname==='/api/restore-session'){transaction(s=>Vault.importSnapshot(s,body.snapshot,body.expectedRevision));result=state();}
   else if(u.pathname==='/api/checkpoint'){transaction(s=>Vault.checkpoint(s,body.name,body.expectedRevision));result=state();}
   else if(u.pathname==='/api/restore-checkpoint'){transaction(s=>Vault.restoreCheckpoint(s,body.id,body.expectedRevision));result=state();}
   else if(u.pathname==='/api/remove-checkpoint'){transaction(s=>Vault.removeCheckpoint(s,body.id,body.expectedRevision));result=state();}
   else if(u.pathname==='/api/view'){if(!Number.isInteger(body.frame)||body.frame<0||body.frame>=session.project.frames)throw new Error('Invalid frame');view={frame:body.frame,revision:view.revision+1};result={view};}
   else return send(res,404,{error:'Unknown route'});
   return send(res,200,result);
  }
  if(req.method!=='GET')return send(res,405,{error:'Method not allowed'});
  if(u.pathname==='/session.js')return send(res,200,'window.KOMA_TOKEN='+JSON.stringify(TOKEN)+';','text/javascript');
  const files={'/cinema-art.js':'cinema-art.js','/cinema.js':'cinema.js','/cinema-ui.js':'cinema-ui.js','/cinema-ui.css':'cinema-ui.css','/':'production.html','/index.html':'production.html','/legacy.html':'index.html','/production.html':'production.html','/core.js':'core.js','/app.js':'app.js','/style.css':'style.css','/plugins.js':'plugins.js','/vault.js':'vault.js','/apng.js':'apng.js','/plugin-ui.js':'plugin-ui.js','/plugin-ui.css':'plugin-ui.css'};
  for(const f of ['atelier-paint.js','atelier.js','atelier-render.js','atelier-ui.js','atelier-ui.css','atelier-demo.js','pro.js','tracking.js','pro-ui.js','pro-ui.css','space.js','engine.js','audio.js','pixels.js','demo.js','media.js','ui.js','ui.css'])files['/production/'+f]='production/'+f;
  if(!files[u.pathname])return send(res,404,{error:'Not found'});
  const f=files[u.pathname],ext=path.extname(f),type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'}[ext];
  return send(res,200,fs.readFileSync(path.join(ROOT,'public',f)),type);
 }catch(e){if(!res.headersSent)send(res,e.message.startsWith('Revision conflict')?409:400,{error:e.message});}
});
server.requestTimeout=15000;server.headersTimeout=10000;
let cleaning=false;
function cleanup(){if(cleaning)return;cleaning=true;previewBroker.close();try{if(fs.readFileSync(lock,'utf8')===String(process.pid))fs.unlinkSync(lock);}catch{}try{fs.unlinkSync(path.join(DIR,'session.json'));}catch{}}
process.on('exit',cleanup);for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>server.close(()=>{cleanup();process.exit(0);}));
server.on('error',e=>{console.error(e.message);cleanup();process.exit(1);});
server.listen(PORT,'127.0.0.1',()=>console.log('Koma Studio '+Core.VERSION+'\nOpen '+origin+'\nLocal only; P0-P2 production plugins and legacy workspace; no model calls. Ctrl+C to stop.'));
