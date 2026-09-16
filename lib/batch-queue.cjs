'use strict';
/* Durable bounded jobs, not a background renderer. A connected browser worker
 * explicitly claims work. Server restart pauses active work and preserves frames. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const C=require('../public/core.js'),{atomic}=require('./store.cjs'),{BlobStore}=require('./blob-store.cjs');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const copy=x=>JSON.parse(JSON.stringify(x));
class BatchQueue {
 constructor(dir,cache){
  this.dir=dir;this.cache=cache;this.blobs=new BlobStore(path.join(dir,'assets'));this.sources=path.join(dir,'sources');this.queues=path.join(dir,'queues');
  fs.mkdirSync(this.sources,{recursive:true});fs.mkdirSync(this.queues,{recursive:true});
  for(const f of fs.readdirSync(this.queues).filter(f=>/^[a-f0-9]{32}\.json$/.test(f))){
   const q=this.read(f.slice(0,-5));let changed=false;for(const j of q.jobs)if(j.status==='running'){j.status='paused';delete j.lease;changed=true;}
   if(changed){q.status='paused';this.save(q);}
  }
 }
 file(id){if(!/^[a-f0-9]{32}$/.test(id))throw Error('Invalid queue ID');return path.join(this.queues,id+'.json');}
 read(id){const f=this.file(id);if(fs.statSync(f).size>2000000)throw Error('Queue manifest too large');const envelope=JSON.parse(fs.readFileSync(f,'utf8'));if(sha(JSON.stringify(envelope.payload))!==envelope.sha256)throw Error('Queue checksum mismatch');const q=envelope.payload;if(q.id!==id||!Array.isArray(q.jobs))throw Error('Queue identity mismatch');return q;}
 save(q){const payload=copy(q);atomic(this.file(q.id),JSON.stringify({sha256:sha(JSON.stringify(payload)),payload}));}
 source(id){const q=this.read(id);if(!/^[a-f0-9]{64}$/.test(q.source))throw Error('Invalid source hash');const f=path.join(this.sources,q.source+'.json');if(fs.statSync(f).size>50000000)throw Error('Oversized queue source');const p=this.blobs.unpack(JSON.parse(fs.readFileSync(f,'utf8')));if(sha(JSON.stringify(p))!==q.source)throw Error('Frozen source checksum mismatch');C.validate(p);return p;}
 public(q){const out=copy(q);for(const j of out.jobs){delete j.lease;if(j.renderId){const record=this.cache.job(j.renderId);j.completed=record.frames.filter(f=>this.cache.cached(f.key)).length;if(j.status==='completed'&&j.completed!==j.end-j.start)j.status='needs-repair';}else j.completed=0;}if(out.jobs.some(j=>j.status==='needs-repair'))out.status='paused';return out;}
 list(){return fs.readdirSync(this.queues).filter(f=>/^[a-f0-9]{32}\.json$/.test(f)).map(f=>this.public(this.read(f.slice(0,-5)))).sort((a,b)=>b.created.localeCompare(a.created));}
 create(project,revision,jobs){
  C.validate(project);if(!project.production)throw Error('Production project required');
  const preflight=C.production.preflight(project);if(!preflight.ok)throw Error('Resolve blocking review notes before queueing');
  if(!Array.isArray(jobs)||!jobs.length||jobs.length>32)throw Error('Queue needs 1..32 jobs');
  if(fs.readdirSync(this.queues).filter(f=>f.endsWith('.json')).length>=64)throw Error('Queue archive has 64 entries; remove completed queues first');
  let total=0;const prepared=jobs.map((j,i)=>{const {start,end,width,height}=j;
   if(![start,end,width,height].every(Number.isInteger)||start<0||end>project.frames||end<=start||end-start>600||width<64||height<64||width>4096||height>4096)throw Error('Invalid queue frame range or dimensions');
   if(typeof j.name!=='string'||j.name.length>120)throw Error('Invalid job name');total+=end-start;return{id:'job_'+i,name:j.name,start,end,width,height,status:'queued',renderId:null};
  });if(total>3600)throw Error('Queue exceeds 3600 frames');
  const source=sha(JSON.stringify(project)),file=path.join(this.sources,source+'.json');
  if(!fs.existsSync(file))atomic(file,JSON.stringify(this.blobs.pack(project)));
  const q={id:crypto.randomBytes(16).toString('hex'),version:C.VERSION,source,sourceRevision:revision,created:new Date().toISOString(),status:'queued',jobs:prepared};
  this.save(q);return this.public(q);
 }
 getJob(q,id){const j=q.jobs.find(j=>j.id===id);if(!j)throw Error('Unknown queue job');return j;}
 claim(id,job){const q=this.read(id),j=this.getJob(q,job);if(j.status==='running')throw Error('Job already leased; pause it before reclaiming');if(j.status==='completed'&&this.cache.job(j.renderId).frames.every(f=>this.cache.cached(f.key)))throw Error('Job already completed');
  const record=this.cache.begin(this.source(id),q.sourceRevision,j);j.renderId=record.id;j.status='running';j.lease=crypto.randomBytes(24).toString('hex');q.status='running';this.save(q);return{job:copy(j),source:q.source,sourceRevision:q.sourceRevision,cached:record.cached};
 }
 put(id,job,lease,frame,png){const q=this.read(id),j=this.getJob(q,job);if(j.status!=='running'||typeof lease!=='string'||lease!==j.lease)throw Error('Stale or invalid render lease');return this.cache.put(j.renderId,frame,png);}
 finish(id,job,lease){const q=this.read(id),j=this.getJob(q,job);if(j.status!=='running'||lease!==j.lease)throw Error('Stale render lease');const record=this.cache.job(j.renderId);if(!record.frames.every(f=>this.cache.cached(f.key)))throw Error('Job has missing or corrupt frames');j.status='completed';delete j.lease;q.status=q.jobs.every(j=>j.status==='completed')?'completed':'queued';this.save(q);return this.public(q);}
 pause(id){const q=this.read(id);for(const j of q.jobs)if(j.status==='running'||j.status==='queued'){j.status='paused';delete j.lease;}q.status=q.jobs.every(j=>j.status==='completed')?'completed':'paused';this.save(q);return this.public(q);}
 remove(id){const q=this.read(id);if(q.jobs.some(j=>j.status==='running'))throw Error('Pause before removing queue');fs.unlinkSync(this.file(id));return{removed:id,cacheRetained:true};}
}
module.exports={BatchQueue};
