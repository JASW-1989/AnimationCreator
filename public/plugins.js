/* Original local-only animation extensions. No network, model SDK or dynamic plugin loader. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.KomaPlugins=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
let C;
const copy=x=>JSON.parse(JSON.stringify(x));
const error=s=>{throw new Error(s);};
const int=(n,lo,hi,label)=>{if(!Number.isInteger(n)||n<lo||n>hi)error('Invalid '+label+' ('+lo+'..'+hi+')');};
const finite=(n,lo,hi,label)=>{if(typeof n!=='number'||!Number.isFinite(n)||n<lo||n>hi)error('Invalid '+label);};
const idOK=s=>typeof s==='string'&&/^[a-z][a-z0-9_-]{0,63}$/.test(s);
const imageOK=s=>typeof s==='string'&&s.length<6000000&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s);
const limbs=['fore_near','fore_far','hind_near','hind_far'];
const catalog=[
 {id:'vault',name:'Local Vault',version:'0.2.0',offline:true,network:false,capabilities:['persistent-undo-redo','checkpoints','checksum-backup'],status:'builtin'},
 {id:'celstack',name:'Cel Stack',version:'0.2.0',offline:true,network:false,capabilities:['raster-cel-library','exposure-ranges','repeat','blank-cels'],status:'builtin'},
 {id:'clipshelf',name:'Clip Shelf',version:'0.2.0',offline:true,network:false,capabilities:['capture','retime','repeat','collision-check'],status:'builtin'},
 {id:'contact',name:'Contact IK',version:'0.2.0',offline:true,network:false,capabilities:['two-link-ik','world-target','ground-velocity','reach-diagnostics'],status:'builtin',scope:'Built-in cat limbs; no automatic rigging of imported art.'},
 {id:'renderpack',name:'Render Pack',version:'0.2.0',offline:true,network:false,capabilities:['lossless-apng','png-sequence','cancel','immutable-render-source'],status:'builtin'}
];
const ops=['import_cels','set_cel_range','capture_clip','apply_clip','delete_clip','set_contact','remove_contact'];
function layer(p,id){const l=p.layers.find(x=>x.id===id);if(!l)error('Unknown layer '+id);return l;}
function editable(p,id){const l=layer(p,id);if(l.locked||(l.parent&&layer(p,l.parent).locked))error('Layer or parent is locked: '+id);return l;}
function valuesAt(l,f){const v=C.evaluateLayer(l,f);if(!C.DRAWINGS[l.id])delete v.drawing;return v;}
function range(p,start,end){int(start,0,p.frames-1,'start');int(end,start,p.frames-1,'end');}
function checkCel(l){if(!l.cels||!l.exposures)error('Select a cel layer');}
function validate(p){
 for(const l of p.layers){if(l.cels===undefined&&l.exposures===undefined)continue;
  if(l.type!=='raster'||!Array.isArray(l.cels)||l.cels.length<1||l.cels.length>120)error('Invalid cel library');
  const ids=new Set();for(const a of l.cels){if(!idOK(a.id)||ids.has(a.id)||typeof a.name!=='string'||a.name.length>120||!imageOK(a.data))error('Invalid cel asset');ids.add(a.id);}
  if(!Array.isArray(l.exposures)||l.exposures.length>p.frames)error('Invalid exposures');let prev=-1;
  for(const e of l.exposures){range(p,e.start,e.end);if(e.start<=prev||!ids.has(e.cel))error('Overlapping or invalid exposure');prev=e.end;}
 }
 if(p.clips!==undefined){if(!Array.isArray(p.clips)||p.clips.length>24)error('At most 24 clips');const ids=new Set();for(const clip of p.clips){
  if(!idOK(clip.id)||ids.has(clip.id)||typeof clip.name!=='string'||clip.name.length>120)error('Invalid clip identity');ids.add(clip.id);int(clip.length,1,480,'clip length');
  if(!Array.isArray(clip.tracks)||!clip.tracks.length||clip.tracks.length>24)error('Invalid clip tracks');const tracks=new Set();
  for(const t of clip.tracks){const l=layer(p,t.layer);if(tracks.has(t.layer))error('Duplicate clip track');tracks.add(t.layer);
   if(!Array.isArray(t.keys)||t.keys.length<1||t.keys.length>480)error('Invalid clip keys');let prev=-1;
   for(const k of t.keys){int(k.frame,0,clip.length-1,'clip key');if(k.frame<=prev)error('Clip keys must be sorted and unique');prev=k.frame;
    if(!['hold','linear','ease'].includes(k.interpolation)||!k.values||Array.isArray(k.values))error('Invalid clip key values');
    for(const [prop,v]of Object.entries(k.values)){if(prop==='drawing'){if(!C.DRAWINGS[l.id]?.includes(v))error('Invalid clip drawing');}else{if(!C.TRANSFORMS[prop])error('Invalid clip property');finite(v,...C.TRANSFORMS[prop],prop);}}
   }
  }
 }}
 if(p.contacts!==undefined){if(!Array.isArray(p.contacts)||p.contacts.length>64)error('At most 64 contacts');const ids=new Set();for(const a of p.contacts){
  if(!idOK(a.id)||ids.has(a.id)||!limbs.includes(a.layer))error('Invalid contact identity');ids.add(a.id);range(p,a.start,a.end);finite(a.x,-2000,3000,'contact x');finite(a.y,-2000,3000,'contact y');
  if(!['screen','ground'].includes(a.mode))error('Invalid contact mode');
  if(p.contacts.some(b=>b!==a&&b.layer===a.layer&&b.start<=a.end&&a.start<=b.end))error('Contact ranges overlap');
 }}
}
function mergeExposures(a){const out=[];for(const e of a.sort((x,y)=>x.start-y.start)){const last=out[out.length-1];if(last&&last.cel===e.cel&&last.end+1===e.start)last.end=e.end;else out.push({...e});}return out;}
function celAt(l,f){const e=l.exposures?.find(e=>e.start<=f&&e.end>=f);return e?l.cels.find(a=>a.id===e.cel):null;}
function apply(p,c){const changes=[];
 if(c.op==='import_cels'){
  if(!idOK(c.layer)||p.layers.some(l=>l.id===c.layer))error('New cel layer ID must be unique');
  if(typeof c.name!=='string'||c.name.length>100||!Array.isArray(c.assets)||!c.assets.length||c.assets.length>120)error('Invalid import');
  int(c.start,0,p.frames-1,'start');int(c.hold,1,p.frames,'hold');if(typeof c.repeat!=='boolean')error('repeat must be boolean');
  const n=c.assets.length*c.hold;if(!c.repeat&&c.start+n>p.frames)error('Cel sequence exceeds scene; reduce hold or import fewer cels');
  const exposures=[];for(let f=c.start;f<p.frames;f+=c.hold){const i=Math.floor((f-c.start)/c.hold);if(!c.repeat&&i>=c.assets.length)break;exposures.push({start:f,end:Math.min(p.frames-1,f+c.hold-1),cel:c.assets[i%c.assets.length].id});}
  p.layers.push({id:c.layer,name:c.name,type:'raster',parent:null,visible:true,locked:false,transform:{x:0,y:0,rotation:0,scaleX:1,scaleY:1,opacity:1},keys:[],drawing:'auto',cels:copy(c.assets),exposures:mergeExposures(exposures)});
  changes.push({target:c.layer,before:null,after:{cels:c.assets.length,exposures:exposures.length,hold:c.hold,repeat:c.repeat}});
 }else if(c.op==='set_cel_range'){
  const l=editable(p,c.layer);checkCel(l);range(p,c.start,c.end);if(c.cel!==null&&!l.cels.some(a=>a.id===c.cel))error('Unknown cel');const before=copy(l.exposures),out=[];
  for(const e of l.exposures){if(e.end<c.start||e.start>c.end)out.push(e);else{if(e.start<c.start)out.push({...e,end:c.start-1});if(e.end>c.end)out.push({...e,start:c.end+1});}}
  if(c.cel!==null)out.push({start:c.start,end:c.end,cel:c.cel});l.exposures=mergeExposures(out);changes.push({target:c.layer+'.exposures',before,after:copy(l.exposures)});
 }else if(c.op==='capture_clip'){
  range(p,c.start,c.end);if(!idOK(c.id)||typeof c.name!=='string'||c.name.length>120)error('Invalid clip name');if(p.clips?.some(x=>x.id===c.id))error('Clip ID already exists');
  if(!Array.isArray(c.layers)||c.layers.length<1||c.layers.length>24||new Set(c.layers).size!==c.layers.length)error('Choose 1..24 unique layers');
  // Sampling the evaluated channels avoids changing easing when capture starts between keys.
  const tracks=c.layers.map(id=>{const l=layer(p,id);if(l.cels)error('Capture Clip stores transform/drawing tracks, not cel exposures. Use Cel Stack repeat.');return {layer:id,keys:Array.from({length:c.end-c.start+1},(_,i)=>({frame:i,values:valuesAt(l,c.start+i),interpolation:'hold'}))};});
  const clip={id:c.id,name:c.name,length:c.end-c.start+1,tracks,sampling:'one-sample-per-logical-frame'};(p.clips??=[]).push(clip);changes.push({target:'clips.'+c.id,before:null,after:{name:c.name,length:clip.length,layers:c.layers}});
 }else if(c.op==='apply_clip'){
  const clip=p.clips?.find(x=>x.id===c.id);if(!clip)error('Unknown clip');int(c.start,0,p.frames-1,'start');int(c.duration,1,p.frames,'duration');int(c.repeat,1,p.frames,'repeat');
  const end=c.start+c.duration*c.repeat-1;if(end>=p.frames)error('Repeated clip exceeds scene');if(!['error','replace'].includes(c.collision))error('Choose collision error or replace');
  for(const t of clip.tracks){const l=editable(p,t.layer),before=copy(l.keys),keys=[];
   // Deterministic nearest-sample retiming preserves original drawings (no invented morphing).
   for(let rep=0;rep<c.repeat;rep++)for(let i=0;i<c.duration;i++){const src=c.duration===1?0:Math.round(i*(clip.length-1)/(c.duration-1));const sample=t.keys.filter(k=>k.frame<=src).at(-1)||t.keys[0];keys.push({frame:c.start+rep*c.duration+i,values:copy(sample.values),interpolation:'hold'});}
   if(c.collision==='error'&&l.keys.some(k=>k.frame>=c.start&&k.frame<=end))error('Existing keys overlap '+l.id+'; explicitly choose replace');
   // Bake integer-frame outside samples as well: inserting keys into an eased
   // segment would otherwise alter frames outside the requested range.
   const outside=Array.from({length:p.frames},(_,f)=>({frame:f,values:valuesAt(l,f),interpolation:'hold'})).filter(k=>k.frame<c.start||k.frame>end);
   l.keys=[...outside,...keys].sort((a,b)=>a.frame-b.frame);
   changes.push({target:l.id+'.keys',before,after:copy(l.keys)});
  }
 }else if(c.op==='delete_clip'){
  const clip=p.clips?.find(x=>x.id===c.id);if(!clip)error('Unknown clip');p.clips=p.clips.filter(x=>x.id!==c.id);changes.push({target:'clips.'+c.id,before:clip.name,after:null});
 }else if(c.op==='set_contact'){
  editable(p,c.layer);if(!idOK(c.id)||!limbs.includes(c.layer))error('Contact applies only to built-in cat limbs');range(p,c.start,c.end);
  const a={id:c.id,layer:c.layer,start:c.start,end:c.end,x:c.x,y:c.y,mode:c.mode};const before=p.contacts?.find(x=>x.id===c.id)||null;
  if(before)editable(p,before.layer);p.contacts=(p.contacts||[]).filter(x=>x.id!==c.id);p.contacts.push(a);changes.push({target:'contacts.'+c.id,before,after:a});
 }else if(c.op==='remove_contact'){
  const a=p.contacts?.find(x=>x.id===c.id);if(!a)error('Unknown contact');editable(p,a.layer);p.contacts=p.contacts.filter(x=>x.id!==c.id);changes.push({target:'contacts.'+c.id,before:a,after:null});
 }else error('Unsupported plugin operation');return changes;
}
// Affine transforms [a,b,c,d,tx,ty], exact inverse; no accumulated raster warping.
function mul(a,b){return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
function matrix(x,y,deg,sx,sy){const r=deg*Math.PI/180,c=Math.cos(r),s=Math.sin(r);return [c*sx,s*sx,-s*sy,c*sy,x,y];}
function point(m,p){return [m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]];}
function inverse(m){const d=m[0]*m[3]-m[1]*m[2];if(Math.abs(d)<1e-12)error('Singular transform');return [m[3]/d,-m[1]/d,-m[2]/d,m[0]/d,(m[2]*m[5]-m[3]*m[4])/d,(m[1]*m[4]-m[0]*m[5])/d];}
function solveIK(root,target,l1,l2,bend=1){
 finite(l1,0.001,10000,'bone length');finite(l2,0.001,10000,'bone length');for(const v of [...root,...target])finite(v,-100000,100000,'IK coordinate');if(![1,-1].includes(bend))error('Invalid bend sign');
 const dx=target[0]-root[0],dy=target[1]-root[1],raw=Math.hypot(dx,dy),lo=Math.abs(l1-l2)+1e-7,hi=l1+l2-1e-7,d=Math.max(lo,Math.min(hi,raw));
 const angle=raw<1e-12?Math.PI/2:Math.atan2(dy,dx),alpha=Math.acos(Math.max(-1,Math.min(1,(l1*l1+d*d-l2*l2)/(2*l1*d))));
 const knee=[root[0]+Math.cos(angle+bend*alpha)*l1,root[1]+Math.sin(angle+bend*alpha)*l1],foot=[root[0]+Math.cos(angle)*d,root[1]+Math.sin(angle)*d];
 return {root:[...root],knee,foot,target:[...target],reachable:raw>=Math.abs(l1-l2)-1e-6&&raw<=l1+l2+1e-6,error:Math.hypot(foot[0]-target[0],foot[1]-target[1])};
}
function limbMatrix(p,f,id){const pose=C.poseAt(p,f),cat=C.evaluateLayer(layer(p,'cat'),pose.frame),l=C.evaluateLayer(layer(p,id),pose.frame);return mul(matrix(493+cat.x,359+pose.bob+cat.y,cat.rotation,1.14*cat.scaleX,1.14*cat.scaleY),matrix(l.x,l.y,l.rotation,l.scaleX,l.scaleY));}
function baseLeg(p,f,id){const pose=C.poseAt(p,f),front=id.startsWith('fore'),far=id.endsWith('far');const phase=(pose.phase+(front?0:.36)+(far?.5:0))%1,hip=[front?28:-48,-12],bx=front?33:-48;let x,y;
 if(phase<.52){x=bx+p.params.stride*(.5-phase/.52);y=64-pose.bob;}else{const t=(phase-.52)/.48;x=bx+p.params.stride*(-.5+t);y=64-pose.bob-Math.sin(t*Math.PI)*43;}
 const drawing=C.evaluateLayer(layer(p,id),pose.frame).drawing;if(drawing==='reach'){x=bx+53;y=47-pose.bob;}if(drawing==='tuck'){x=bx-8;y=12;}
 return {hip,foot:[x,y],l1:front?40:43,l2:front?44:46,bend:front?-1:1};
}
function solveLeg(p,f,id){const b=baseLeg(p,f,id),m=limbMatrix(p,f,id),contact=p.contacts?.find(a=>a.layer===id&&a.start<=f&&a.end>=f);let target=b.foot,worldTarget=null;
 if(contact){worldTarget=[contact.x-(contact.mode==='ground'?(f-contact.start)/p.fps*p.params.scroll:0),contact.y];target=point(inverse(m),worldTarget);}
 const s=solveIK(b.hip,target,b.l1,b.l2,b.bend);return {...s,contact:contact?.id||null,worldRoot:point(m,s.root),worldKnee:point(m,s.knee),worldFoot:point(m,s.foot),worldTarget:worldTarget||point(m,target),worldError:Math.hypot(...point(m,s.foot).map((v,i)=>v-(worldTarget||point(m,target))[i]))};
}
function contactReport(p){const rows=(p.contacts||[]).map(a=>{let unreachable=0,maxError=0;for(let f=a.start;f<=a.end;f++){const s=solveLeg(p,f,a.layer);if(!s.reachable)unreachable++;maxError=Math.max(maxError,s.worldError);}return {id:a.id,layer:a.layer,start:a.start,end:a.end,mode:a.mode,unreachableFrames:unreachable,maxTargetErrorPx:Number(maxError.toFixed(6))};});return {contacts:rows,scope:'Analytic target reach only. Contact transitions, anatomy, occlusion and visual quality require review.'};}
return {bind:core=>C=core,catalog:()=>copy(catalog),supports:op=>ops.includes(op),operations:[...ops],validate,apply,celAt,solveIK,solveLeg,contactReport,limbMatrix,mul,point,inverse,limbs};
});
