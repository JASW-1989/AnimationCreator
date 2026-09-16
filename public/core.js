/* Koma Studio: deterministic scene model shared by browser, server and tests. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./plugins.js'), require('./cinema.js'), require('./production/engine.js'));
  else root.KomaCore = factory(root.KomaPlugins, root.KomaCinema, root.KomaProduction);
})(typeof globalThis !== 'undefined' ? globalThis : this, function(P, Cinema, Production) {
'use strict';
const VERSION = '0.6.0-alpha', W = 960, H = 540;
const TAU = Math.PI * 2;
const clone = x => JSON.parse(JSON.stringify(x));
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const esc = x => String(x).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const num = (n) => Number(n.toFixed(4));
const TRANSFORMS = {x:[-2000,2000],y:[-2000,2000],rotation:[-720,720],scaleX:[0.1,5],scaleY:[0.1,5],opacity:[0,1]};
const PARAMS = {stride:[20,100],bounce:[0,24],cycle:[8,96],tail:[-40,40],scroll:[0,600]};
const ALLOWED_PARTS = ['forest','shadow','cat','tail','hind_far','fore_far','body','hind_near','fore_near','scarf','head','foreground'];
const DRAWINGS = {head:['open','blink','alert'],fore_near:['auto','reach','tuck'],hind_near:['auto','reach','tuck']};
const fail = (s) => {throw new Error(s);};
const finite = (n,lo,hi,label) => {if(typeof n !== 'number' || !Number.isFinite(n) || n<lo || n>hi) fail('Invalid '+label+'; expected '+lo+'..'+hi);};
const integer = (n,lo,hi,label) => {finite(n,lo,hi,label);if(!Number.isInteger(n)) fail(label+' must be an integer');};
function own(o,k) {return Object.prototype.hasOwnProperty.call(o,k);}
function safeTree(o,depth=0) {
 if(depth>24) fail('Project nesting exceeds limit');
 if(o && typeof o === 'object') for(const k of Object.keys(o)) {
  if(['__proto__','constructor','prototype'].includes(k)) fail('Unsafe object key');
  safeTree(o[k],depth+1);
 }
}
function imageOK(v) {return typeof v==='string' && v.length<6000000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v);}
function transform() {return {x:0,y:0,rotation:0,scaleX:1,scaleY:1,opacity:1};}
function makeProject() {
 const names = ['Forest / background','Contact shadow','Neko / character','Tail','Hind leg / far','Front leg / far','Body','Hind leg / near','Front leg / near','Scarf','Head / expression','Grass / foreground'];
 const layers = ALLOWED_PARTS.map((id,i)=>({id,name:names[i],type:id==='cat'?'group':'builtin',parent:['tail','hind_far','fore_far','body','hind_near','fore_near','scarf','head'].includes(id)?'cat':null,visible:true,locked:['forest','foreground'].includes(id),transform:transform(),keys:[],drawing:id==='head'?'open':'auto'}));
 layers.find(l=>l.id==='head').keys=[{frame:44,values:{drawing:'blink'},interpolation:'hold'},{frame:48,values:{drawing:'open'},interpolation:'hold'}];
 return {schema:'koma.scene/1',name:'Neko - forest run',width:W,height:H,fps:24,frames:96,exposureStep:2,params:{stride:62,bounce:8,cycle:16,tail:15,scroll:180},layers,patches:[],notes:'Original vector test fixture. Technical run cycle; not a finished hand-drawn film.'};
}
function validate(p) {
 safeTree(p);
 if(p?.production)return Production.validateProject(p);
 if(!p || p.schema!=='koma.scene/1') fail('Unsupported scene schema');
 if(typeof p.name!=='string'||p.name.length>200) fail('Invalid project name');
 if(p.width!==W||p.height!==H) fail('Prototype canvas is fixed at 960 x 540');
 integer(p.frames,2,480,'frames'); integer(p.fps,1,60,'fps');integer(p.exposureStep,1,3,'exposureStep');
 if(!p.params||!p.layers||!Array.isArray(p.layers)||p.layers.length>48) fail('Invalid scene structure');
 for(const [key,range] of Object.entries(PARAMS)) finite(p.params[key],...range,key);
 integer(p.params.cycle,8,96,'cycle');
 const ids = new Set();
 for(const l of p.layers) {
  if(typeof l.id!=='string'||!/^[a-z][a-z0-9_-]{0,63}$/.test(l.id)||ids.has(l.id)) fail('Invalid or duplicate layer id');
  ids.add(l.id);
  if(typeof l.name!=='string'||l.name.length>100)fail('Invalid layer name');
  if(!['builtin','group','raster'].includes(l.type))fail('Unknown layer type');
  if(l.type!=='raster'&&!ALLOWED_PARTS.includes(l.id))fail('Unknown builtin artwork');
  if(l.type==='raster'&&!l.cels&&!imageOK(l.data))fail('Only embedded PNG, JPEG and WebP are accepted');
  if(typeof l.visible!=='boolean'||typeof l.locked!=='boolean')fail('Invalid layer flags');
  if(l.parent!==null&&l.parent!=='cat')fail('Only the character group is supported as a parent');
  if(l.id==='cat'&&l.parent!==null)fail('Group cannot parent itself');
  for(const [key,range] of Object.entries(TRANSFORMS)) finite(l.transform?.[key],...range,'transform.'+key);
  if(!Array.isArray(l.keys)||l.keys.length>600)fail('Invalid keyframes');
  const keyIds = new Set();
  for(const key of l.keys) {
   integer(key.frame,0,p.frames-1,'keyframe');if(keyIds.has(key.frame))fail('Duplicate keyframe');keyIds.add(key.frame);
   if(!['hold','linear','ease'].includes(key.interpolation))fail('Unknown interpolation');
   if(!key.values||Array.isArray(key.values))fail('Invalid keyframe values');
   for(const [k,v] of Object.entries(key.values)) {
    if(k==='drawing') {if(!DRAWINGS[l.id]?.includes(v))fail('Unknown drawing substitution');}
    else if(own(TRANSFORMS,k))finite(v,...TRANSFORMS[k],k);else fail('Unknown animated property '+k);
   }
  }
  if(DRAWINGS[l.id]&&!DRAWINGS[l.id].includes(l.drawing))fail('Invalid default drawing');
 }
 for(const id of ALLOWED_PARTS) if(!ids.has(id))fail('Missing builtin layer '+id);
 if(!Array.isArray(p.patches)||p.patches.length>24)fail('Invalid patch list');
 for(const patch of p.patches){integer(patch.frame,0,p.frames-1,'patch frame');if(!imageOK(patch.image)||!imageOK(patch.mask))fail('Invalid patch image');}
 P.validate(p); Cinema.validate(p.cinema,p);
 if(JSON.stringify(p).length>20000000)fail('Project exceeds 20 MB prototype limit');
 return true;
}
function findLayer(p,id) {const l=p.layers.find(l=>l.id===id);if(!l)fail('Unknown layer: '+id);return l;}
function atProperty(layer,prop,f) {
 const def = prop==='drawing'?layer.drawing:layer.transform[prop];
 const keys=layer.keys.filter(k=>own(k.values,prop)).sort((a,b)=>a.frame-b.frame);
 if(!keys.length||f<keys[0].frame)return def;
 let a=keys[0],b=null;
 for(const k of keys) {if(k.frame<=f)a=k;else{b=k;break;}}
 if(!b||prop==='drawing'||a.interpolation==='hold')return a.values[prop];
 let t=(f-a.frame)/(b.frame-a.frame);if(a.interpolation==='ease')t=t*t*(3-2*t);
 return a.values[prop]+(b.values[prop]-a.values[prop])*t;
}
function evaluateLayer(l,f) {
 const out={};for(const k of Object.keys(TRANSFORMS))out[k]=atProperty(l,k,f);out.drawing=atProperty(l,'drawing',f);return out;
}
function applyCommands(project,commands) {
 if(!Array.isArray(commands)||commands.length<1||commands.length>128)fail('Expected 1..128 commands');
 safeTree(commands); const p=clone(project), changes=[];
 for(const c of commands) {
  if(!c||typeof c!=='object')fail('Invalid command');
  if(p.production){if(!Production.supports(c.op))fail('Production mode requires prod_* commands');changes.push(...Production.apply(p,c,false));continue;}
  if(p.cinema&&!Cinema.supports(c.op))fail('Cinema mode uses cinema_* commands; legacy cat commands and single-frame patches are not applied to a sequence.');
  if(Cinema.supports(c.op)){changes.push(...Cinema.apply(p,c));}
  else if(c.op==='set_param') {
   if(!own(PARAMS,c.name))fail('Unknown parameter');finite(c.value,...PARAMS[c.name],c.name);
   changes.push({target:'params.'+c.name,before:p.params[c.name],after:c.value});p.params[c.name]=c.value;
  } else if(c.op==='set_exposure') {
   integer(c.value,1,3,'exposure');changes.push({target:'exposureStep',before:p.exposureStep,after:c.value});p.exposureStep=c.value;
  } else if(c.op==='set_key') {
   const l=findLayer(p,c.layer);if(l.locked)fail('Layer is locked: '+c.layer);
   integer(c.frame,0,p.frames-1,'frame');if(!c.values||!Object.keys(c.values).length)fail('Missing key values');
   const existing=l.keys.find(k=>k.frame===c.frame);
   const before=existing?clone(existing):null;
   if(existing){existing.values={...existing.values,...c.values};existing.interpolation=c.interpolation||existing.interpolation;}
   else l.keys.push({frame:c.frame,values:clone(c.values),interpolation:c.interpolation||'linear'});
   l.keys.sort((a,b)=>a.frame-b.frame);
   changes.push({target:c.layer+'.keys['+c.frame+']',before,after:l.keys.find(k=>k.frame===c.frame)});
  } else if(c.op==='remove_key') {
   const l=findLayer(p,c.layer);if(l.locked)fail('Layer is locked');integer(c.frame,0,p.frames-1,'frame');
   changes.push({target:c.layer+'.keys['+c.frame+']',before:l.keys.find(k=>k.frame===c.frame)||null,after:null});
   l.keys=l.keys.filter(k=>k.frame!==c.frame);
  } else if(c.op==='set_layer') {
   const l=findLayer(p,c.layer);if(!['visible','locked','name','drawing'].includes(c.property))fail('Unsupported layer property');
   if(l.locked&&!['locked','visible'].includes(c.property))fail('Layer is locked');
   changes.push({target:c.layer+'.'+c.property,before:l[c.property],after:c.value});l[c.property]=c.value;
  } else if(c.op==='add_raster') {
   if(!imageOK(c.data))fail('Invalid image; SVG and remote URLs are not accepted');
   const id=c.id||'raster_'+(p.layers.length+1);if(p.layers.some(l=>l.id===id))fail('Layer id already exists');
   p.layers.push({id,name:c.name||'Imported artwork',type:'raster',parent:null,visible:true,locked:false,transform:transform(),keys:[],drawing:'auto',data:c.data});
   changes.push({target:id,before:null,after:'embedded raster artwork'});
  } else if(c.op==='add_patch') {
   integer(c.frame,0,p.frames-1,'patch frame');if(!imageOK(c.image)||!imageOK(c.mask))fail('Invalid patch images');
   p.patches.push({frame:c.frame,image:c.image,mask:c.mask,source:c.source||'user-supplied',baseRevision:c.baseRevision??null});
   changes.push({target:'patches['+c.frame+']',before:null,after:'frame-local masked replacement'});
  } else if(P.supports(c.op))changes.push(...P.apply(p,c));
  else fail('Unsupported operation: '+c.op);
 }
 validate(p);return {project:p,changes};
}
class Session {
 constructor(p=makeProject()){validate(p);this.checkpoints=[];this.project=clone(p);this.revision=0;this.history=[];this.future=[];this.log=[];this.plans=new Map();this.sequence=0;}
 check(r){if(r!==this.revision)fail('Revision conflict: expected '+r+', current '+this.revision);}
 preview(commands,expectedRevision,scope=null){this.check(expectedRevision);const result=applyCommands(this.project,commands);const id='plan-'+(++this.sequence);const plan={id,baseRevision:this.revision,commands:clone(commands),changes:result.changes};if(this.project.production){Production.Atelier.assertScope(this.project,result.project,scope,Production);plan.scope=scope?clone(scope):null;plan.impact=Production.Atelier.impact(this.project,result.project,Production);}this.plans.set(id,plan);if(this.plans.size>32)this.plans.delete(this.plans.keys().next().value);return {...clone(plan),qa:quality(result.project)};}
 commit(id,expectedRevision){this.check(expectedRevision);const plan=this.plans.get(id);if(!plan)fail('Unknown or expired plan');this.check(plan.baseRevision);if(plan.scope&&this.project.production)Production.Atelier.assertScope(this.project,applyCommands(this.project,plan.commands).project,plan.scope,Production);return this.apply(plan.commands,expectedRevision,'agent');}
 apply(commands,expectedRevision,actor='human'){this.check(expectedRevision);const r=applyCommands(this.project,commands);this.history.push(clone(this.project));if(this.history.length>30)this.history.shift();this.future=[];this.project=r.project;this.revision++;this.plans.clear();this.record(actor,r.changes);return this.state();}
 load(p,expectedRevision){this.check(expectedRevision);validate(p);this.history.push(clone(this.project));if(this.history.length>30)this.history.shift();this.future=[];this.project=clone(p);this.revision++;this.plans.clear();this.record('import',[{target:'project',after:p.name}]);return this.state();}
 undo(expectedRevision){this.check(expectedRevision);if(!this.history.length)fail('Nothing to undo');this.future.push(clone(this.project));this.project=this.history.pop();this.revision++;this.plans.clear();this.record('undo',[]);return this.state();}
 redo(expectedRevision){this.check(expectedRevision);if(!this.future.length)fail('Nothing to redo');this.history.push(clone(this.project));this.project=this.future.pop();this.revision++;this.plans.clear();this.record('redo',[]);return this.state();}
 record(actor,changes){this.log.push({revision:this.revision,actor,changes:clone(changes)});if(this.log.length>100)this.log.shift();}
 state(){return {checkpoints:this.checkpoints.map(x=>({id:x.id,name:x.name,revision:x.revision})),plugins:this.project.production?Production.catalog():P.catalog(),version:VERSION,revision:this.revision,project:clone(this.project),canUndo:!!this.history.length,canRedo:!!this.future.length,log:clone(this.log.slice(-12)),qa:quality(this.project)};}
}
function quality(p) {
 if(p.production)return Production.report(p);
 if(p.cinema)return Cinema.report(p);
 const phaseResidual=(p.frames%p.params.cycle)/p.params.cycle;
 const keys=p.layers.reduce((s,l)=>s+l.keys.length,0);
 const endpoint=[];
 for(const l of p.layers)for(const prop of Object.keys(TRANSFORMS)){const d=Math.abs(atProperty(l,prop,p.frames)-atProperty(l,prop,0));if(d>0.01)endpoint.push(l.id+'.'+prop);}
 return {checks:[
  {code:'schema',status:'pass',detail:'Scene schema and bounded commands validated.'},
  {code:'cycle',status:phaseResidual===0?'pass':'warn',detail:phaseResidual===0?'Cycle phase closes at the clip boundary. This is not a pixel-seam guarantee.':'Cycle phase does not close at the clip boundary.'},
  {code:'transform_loop',status:endpoint.length?'warn':'pass',detail:endpoint.length?'Non-closing animated properties: '+endpoint.join(', '):'Transform endpoints agree; drawing, texture and occlusion still require visual review.'},
  {code:'patch_tracking',status:p.patches.length?'warn':'info',detail:p.patches.length?'Patches are frame-local. Adjacent frames are not automatically propagated.':'No raster corrections. Manual masked import is available.'},
  {code:'art_review',status:'info',detail:'Anatomy, acting, line quality and foot contact have not been AI-approved.'}
 ],metrics:{duration:p.frames/p.fps,frames:p.frames,exposureStep:p.exposureStep,cycleDrawings:Math.ceil(p.params.cycle/p.exposureStep),keyframes:keys,layers:p.layers.length,patches:p.patches.length,aiCalls:0}};
}
function twoBone(hip,foot,l1,l2,bend) {
 let dx=foot[0]-hip[0],dy=foot[1]-hip[1];let d=Math.hypot(dx,dy);d=clamp(d,Math.abs(l1-l2)+0.001,l1+l2-0.001);
 const angle=Math.atan2(dy,dx),alpha=Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1));
 return [hip[0]+Math.cos(angle+bend*alpha)*l1,hip[1]+Math.sin(angle+bend*alpha)*l1];
}
function poseAt(p,f) {
 const sf=Math.floor(f/p.exposureStep)*p.exposureStep, phase=((sf%p.params.cycle)+p.params.cycle)%p.params.cycle/p.params.cycle;
 return {sourceFrame:f,frame:sf,phase,bob:-Math.sin(phase*TAU*2)*p.params.bounce,tail:Math.sin(phase*TAU-0.7)*12+p.params.tail};
}
function limbPath(p,pose,isFront,isFar,drawing) {
 const id=(isFront?'fore':'hind')+(isFar?'_far':'_near');
 const solved=P.solveLeg(p,pose.sourceFrame,id),hip=solved.root,k=solved.knee,[x,y]=solved.foot;
 return `<path d="M${num(hip[0])} ${hip[1]} Q${num(k[0])} ${num(k[1]-2)} ${num(k[0])} ${num(k[1])} L${num(x)} ${num(y-6)} q12 -4 14 3 q0 7 -12 7" fill="none" stroke="#353c36" stroke-width="19" stroke-linecap="round" stroke-linejoin="round"/><path d="M${num(hip[0])} ${hip[1]} Q${num(k[0])} ${num(k[1]-2)} ${num(k[0])} ${num(k[1])} L${num(x)} ${num(y-6)} q12 -4 14 3" fill="none" stroke="${isFar?'#b3936c':'#d5ae7b'}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function background(p,f,foreground=false) {
 const t=f/p.fps, scroll=t*p.params.scroll;
 if(foreground){let s='';for(let i=-1;i<17;i++){const x=i*83-(scroll*1.1%83);s+=`<path d="M${num(x)} 548 q-14 -40 -29 -53 q27 13 31 35 q8 -36 27 -41 q-20 23 -19 53" fill="#596951" opacity=".58"/>`;}return s;}
 let s=`<rect width="960" height="540" fill="#eee9d7"/><path d="M0 340 Q170 283 330 327 T690 290 T1020 312 V540 H0Z" fill="#c1caba"/><path d="M0 413 Q280 376 494 424 T960 415 V540 H0Z" fill="#dbd2b8"/><path d="M0 425 Q410 397 960 443" fill="none" stroke="#b9b296" stroke-width="2" opacity=".8"/>`;
 for(let i=-1;i<12;i++){const x=i*108-(scroll*.18%108);s+=`<path d="M${num(x)} 0 q-12 170 5 345 h18 q-13 -176 2 -345" fill="#9dac99" opacity=".24"/>`;}
 for(let i=-1;i<7;i++){const x=i*188-(scroll*.43%188);s+=`<path d="M${num(x)} -5 q12 154 -4 335 l28 8 q-8 -176 11 -348Z" fill="#718973" opacity=".42"/><path d="M${num(x+17)} 118 l-44 -51 M${num(x+18)} 184 l55 -66" stroke="#718973" stroke-width="9" fill="none" opacity=".35"/>`;}
 s+=`<path d="M0 0 H960 V80 Q790 27 681 94 Q566 53 452 101 Q266 51 139 84 Q65 45 0 107Z" fill="#7f957e" opacity=".42"/><path d="M0 0 H960 V24 Q674 67 569 27 Q363 86 241 26 Q109 68 0 25Z" fill="#4e6d59" opacity=".38"/><path d="M430 0 L244 417 L411 413 L581 0" fill="#fff5cf" opacity=".20"/>`;
 for(let i=-2;i<32;i++){const x=i*47-(scroll%47),y=462+(i%3)*19;s+=`<path d="M${num(x)} ${y} l13 -2" stroke="#b7ad8d" stroke-width="1.7" stroke-linecap="round" opacity=".52"/>`;}
 return s;
}
function renderSVG(p,f,options={}) {
 if(p.production)return Production.renderSVG(p,f,options);
 if(p.cinema)return Cinema.renderSVG(p,f,options);
 finite(f,0,p.frames,'render frame'); const pose=poseAt(p,f);const actorOnly=!!options.actorOnly;
 const ls={};for(const l of p.layers)ls[l.id]=l;
 const ink='#353c36';
 function wrap(id,art,pivot=[0,0]){const l=ls[id];if(!l||!l.visible)return '';const v=evaluateLayer(l,pose.frame);return `<g data-layer="${id}" opacity="${num(v.opacity)}" transform="translate(${num(v.x)} ${num(v.y)}) translate(${pivot[0]} ${pivot[1]}) rotate(${num(v.rotation)}) scale(${num(v.scaleX)} ${num(v.scaleY)}) translate(${-pivot[0]} ${-pivot[1]})">${art}</g>`;}
 let out='';
 if(!actorOnly)out+=wrap('forest',background(p,f));
 if(ls.cat.visible){
 const cat=evaluateLayer(ls.cat,pose.frame);
 if(!actorOnly)out+=wrap('shadow',`<ellipse cx="486" cy="437" rx="${84-Math.abs(pose.bob)*.6}" ry="9" fill="#6c735c" opacity=".19"/>`);
 let a='';
 a+=wrap('tail',`<path d="M-58 -27 C-105 -36 -123 ${num(-91-pose.tail)} -153 ${num(-64-pose.tail)}" stroke="${ink}" stroke-width="21" fill="none" stroke-linecap="round"/><path d="M-58 -27 C-105 -36 -123 ${num(-91-pose.tail)} -153 ${num(-64-pose.tail)}" stroke="#d5ae7b" stroke-width="15" fill="none" stroke-linecap="round"/><path d="M-145 ${num(-66-pose.tail)} l-8 2" stroke="#836a51" stroke-width="13" stroke-linecap="round"/>`,[-62,-25]);
 for(const id of ['hind_far','fore_far'])a+=wrap(id,limbPath(p,pose,id.startsWith('fore'),true,'auto'));
 a+=wrap('body',`<path d="M-69 -20 C-71 -48 -40 -60 -2 -50 C27 -44 51 -45 51 -17 C49 11 5 20 -33 9 C-54 4 -67 -4 -69 -20Z" fill="#d5ae7b" stroke="${ink}" stroke-width="3.5"/><path d="M-40 0 Q2 19 34 -4 Q20 18 -5 16 Q-29 13 -40 0Z" fill="#f2dfb5"/><path d="M-36 -51 l7 15 m15 -14 l7 15 M7 -45 l5 11" stroke="#987550" stroke-width="6" stroke-linecap="round"/>`);
 for(const id of ['hind_near','fore_near'])a+=wrap(id,limbPath(p,pose,id.startsWith('fore'),false,evaluateLayer(ls[id],pose.frame).drawing));
 a+=wrap('scarf',`<path d="M32 -41 Q-5 ${num(-63+Math.sin(pose.phase*TAU)*8)} -45 ${num(-48+Math.sin(pose.phase*TAU-.8)*13)} l18 13 l-21 5 Q-5 -25 40 -26Z" fill="#b65e49" stroke="${ink}" stroke-width="2.8"/><path d="M34 -50 l22 2 l-1 22 l-23 1Z" fill="#c57055" stroke="${ink}" stroke-width="2.5"/>`,[36,-35]);
 const d=evaluateLayer(ls.head,pose.frame).drawing;
 const eyes=d==='blink'?`<path d="M52 -69 q5 5 11 0" fill="none" stroke="${ink}" stroke-width="3"/>`:`<ellipse cx="59" cy="-69" rx="${d==='alert'?5:3.7}" ry="${d==='alert'?8:6.5}" fill="${ink}"/><circle cx="60" cy="-71" r="1.3" fill="#fff8e3"/>`;
 a+=wrap('head',`<path d="M22 -74 L19 -108 L45 -94 Q58 -97 69 -88 L86 -102 L85 -67 Q93 -51 79 -40 Q58 -21 31 -41 Q16 -48 22 -74Z" fill="#d5ae7b" stroke="${ink}" stroke-width="3.5" stroke-linejoin="round"/><path d="M24 -101 l3 19 l12 -11Z M81 -94 l-1 16 l-7 -7Z" fill="#c88e78"/><path d="M29 -50 Q36 -64 49 -54 Q56 -47 76 -54 Q82 -35 60 -32 Q40 -32 29 -50Z" fill="#f2dfb5"/>${eyes}<path d="M82 -61 l8 2 l-5 6Z" fill="${ink}"/><path d="M83 -53 q-5 9 -11 5 M82 -48 l12 1 M78 -43 l13 4 M34 -48 l-18 -2 M35 -42 l-17 4" fill="none" stroke="${ink}" stroke-width="1.5" stroke-linecap="round"/><path d="M46 -93 l3 9 m9 -9 l-1 9 m9 -7 l-3 7" stroke="#987550" stroke-width="4.5" stroke-linecap="round"/>`,[49,-58]);
 out+=`<g data-layer="cat" opacity="${num(cat.opacity)}" transform="translate(${num(493+cat.x)} ${num(359+pose.bob+cat.y)}) rotate(${num(cat.rotation)}) scale(${num(1.14*cat.scaleX)} ${num(1.14*cat.scaleY)})">${a}</g>`;
 }
 if(!actorOnly) {
  out+=wrap('foreground',background(p,f,true));
  for(const l of p.layers.filter(l=>l.type==='raster')){const data=l.cels?P.celAt(l,Math.floor(f))?.data:l.data;if(data)out+=wrap(l.id,`<image href="${esc(data)}" width="960" height="540" preserveAspectRatio="xMidYMid meet"/>`);}
 }
 let defs='';
 if(!actorOnly)for(const [i,patch]of p.patches.entries())if(patch.frame===Math.floor(f)){
  defs+=`<filter id="patch${i}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="0" y="0" width="960" height="540" color-interpolation-filters="sRGB"><feImage href="${esc(patch.mask)}" width="960" height="540" result="selection"/><feComposite in="SourceGraphic" in2="selection" operator="out" result="preserved"/><feImage href="${esc(patch.image)}" width="960" height="540" result="candidate"/><feComposite in="candidate" in2="selection" operator="in" result="replacement"/><feComposite in="preserved" in2="replacement" operator="arithmetic" k1="0" k2="1" k3="1" k4="0"/></filter>`;
  out=`<g filter="url(#patch${i})">${out}</g>`;
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Neko animation frame ${Math.floor(f)+1}"><defs>${defs}</defs>${out}</svg>`;
}
/* Exact unchanged bytes outside mask. Premultiplied-alpha interpolation inside. */
function compositePixels(base,candidate,mask) {
 if(base.length!==candidate.length||base.length!==mask.length||base.length%4)fail('RGBA dimensions do not match');
 const out=new Uint8ClampedArray(base);
 for(let i=0;i<base.length;i+=4){const m=mask[i+3]/255;if(m===0)continue;const ab=base[i+3]/255,ac=candidate[i+3]/255;const a=ab*(1-m)+ac*m;out[i+3]=Math.round(a*255);for(let k=0;k<3;k++)out[i+k]=a?Math.round((base[i+k]*ab*(1-m)+candidate[i+k]*ac*m)/a):0;}
 return out;
}
const api={VERSION,W,H,clone,makeProject,validate,applyCommands,Session,quality,evaluateLayer,atProperty,poseAt,renderSVG,compositePixels,DRAWINGS,PARAMS,TRANSFORMS,plugins:P,cinema:Cinema,production:Production};
P.bind(api);return api;
});
