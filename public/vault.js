/* Portable session persistence. IndexedDB transactions in browsers, authenticated local files in Node. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'));else root.KomaVault=factory(root.KomaCore);})(typeof globalThis!=='undefined'?globalThis:this,function(C){
'use strict';
const LIMIT=64000000,HISTORY_BUDGET=32000000;
const clone=C.clone, fail=s=>{throw new Error(s);};
function safe(o,d=0){if(d>32)fail('Session nesting exceeds limit');if(o&&typeof o==='object')for(const k of Object.keys(o)){if(['__proto__','constructor','prototype'].includes(k))fail('Unsafe session key');safe(o[k],d+1);}}
function snapshot(s){
 const history=clone(s.history),future=clone(s.future);let trimmed=0;
 while(history.length+future.length>1&&JSON.stringify([history,future]).length>HISTORY_BUDGET){if(history.length>1)history.shift();else future.shift();trimmed++;}
 const value={schema:'koma.session/2',revision:s.revision,project:clone(s.project),history,future,log:clone(s.log),checkpoints:clone(s.checkpoints||[]),plans:[...s.plans.values()].map(clone),sequence:s.sequence,historyTrimmed:(s.historyTrimmed||0)+trimmed};
 if(JSON.stringify(value).length>LIMIT)fail('Session exceeds 64 MB; export checkpoint and remove large checkpoints/assets');return value;
}
function restore(v){safe(v);if(!v||v.schema!=='koma.session/2'||!Number.isSafeInteger(v.revision)||v.revision<0)fail('Invalid session');
 if(JSON.stringify(v).length>LIMIT)fail('Session exceeds 64 MB');const s=new C.Session(v.project);
 for(const key of ['history','future']){if(!Array.isArray(v[key])||v[key].length>30)fail('Invalid history');for(const p of v[key])C.validate(p);s[key]=clone(v[key]);}
 if(!Array.isArray(v.log)||v.log.length>100)fail('Invalid audit log');
 for(const l of v.log){if(!Number.isSafeInteger(l.revision)||l.revision>v.revision||typeof l.actor!=='string'||!Array.isArray(l.changes))fail('Invalid audit entry');}
 if(!Array.isArray(v.checkpoints)||v.checkpoints.length>8)fail('Invalid checkpoints');const ids=new Set();
 for(const a of v.checkpoints){if(typeof a.id!=='string'||ids.has(a.id)||typeof a.name!=='string'||a.name.length>80||!Number.isSafeInteger(a.revision)||a.revision<0||a.revision>v.revision)fail('Invalid checkpoint');C.validate(a.project);ids.add(a.id);}
 if(!Array.isArray(v.plans)||v.plans.length>32)fail('Invalid plans');
 s.revision=v.revision;s.log=clone(v.log);s.checkpoints=clone(v.checkpoints);s.sequence=Number.isSafeInteger(v.sequence)&&v.sequence>=0?v.sequence:0;s.historyTrimmed=v.historyTrimmed||0;
 for(const plan of v.plans){if(typeof plan.id!=='string'||s.plans.has(plan.id)||plan.baseRevision!==s.revision)fail('Invalid plan');const r=C.applyCommands(s.project,plan.commands);s.plans.set(plan.id,{id:plan.id,baseRevision:plan.baseRevision,commands:clone(plan.commands),changes:r.changes});}
 return s;
}
function checkpoint(s,name,r){s.check(r);if(typeof name!=='string'||!name.trim()||name.length>80)fail('Checkpoint name required (1..80 characters)');if(s.checkpoints.length>=8)fail('At most 8 checkpoints; remove one before creating another');
 const cp={id:'cp-'+s.revision+'-'+(++s.sequence),name:name.trim(),revision:s.revision,project:clone(s.project)};s.checkpoints.push(cp);s.revision++;s.plans.clear();s.record('checkpoint',[{target:'checkpoint.'+cp.id,after:cp.name}]);return cp.id;
}
function restoreCheckpoint(s,id,r){s.check(r);const cp=s.checkpoints.find(x=>x.id===id);if(!cp)fail('Unknown checkpoint');s.load(cp.project,r);s.log.at(-1).actor='restore-checkpoint';return s.state();}
function removeCheckpoint(s,id,r){s.check(r);if(!s.checkpoints.some(x=>x.id===id))fail('Unknown checkpoint');s.checkpoints=s.checkpoints.filter(x=>x.id!==id);s.revision++;s.plans.clear();s.record('remove-checkpoint',[{target:'checkpoint.'+id,after:null}]);}
function importSnapshot(s,value,r){s.check(r);const restored=restore(value);restored.revision=Math.max(s.revision,restored.revision)+1;restored.plans.clear();restored.record('restore-session',[{target:'session',after:restored.project.name}]);Object.assign(s,restored);return s.state();}
let dbPromise;
function db(){if(typeof indexedDB==='undefined')return Promise.reject(new Error('IndexedDB unavailable. Use local server or export session JSON.'));return dbPromise??=new Promise((resolve,reject)=>{const r=indexedDB.open('koma-local-vault-v2',1);r.onupgradeneeded=()=>r.result.createObjectStore('sessions');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function loadBrowser(){
 const d=await db();
 return new Promise((resolve,reject)=>{
  const tx=d.transaction('sessions','readonly'),st=tx.objectStore('sessions'),r=st.get('current');
  r.onsuccess=()=>{
   if(!r.result){resolve(null);return;}
   try{restore(r.result);resolve({snapshot:r.result,recovered:false});}
   catch{
    const b=st.get('previous');
    b.onsuccess=()=>{try{restore(b.result);resolve({snapshot:b.result,recovered:true});}catch{reject(new Error('Both browser snapshots failed validation. Export available data; do not overwrite.'));}};
    b.onerror=()=>reject(b.error);
   }
  };
  r.onerror=()=>reject(r.error);tx.onabort=()=>reject(tx.error||new Error('Local load aborted'));
 });
}
async function saveBrowser(value){restore(value);const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('sessions','readwrite'),st=tx.objectStore('sessions'),get=st.get('current');get.onsuccess=()=>{if(get.result)st.put(get.result,'previous');st.put(value,'current');};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('Local save failed'));tx.onabort=()=>reject(tx.error||new Error('Local save aborted'));});}
return {LIMIT,snapshot,restore,importSnapshot,checkpoint,restoreCheckpoint,removeCheckpoint,loadBrowser,saveBrowser};
});
