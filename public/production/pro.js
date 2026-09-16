/* Koma Pro 0.5. Original local algorithms. No proprietary runtime or model calls.
 * Optional project fields remain absent when an older scene is merely opened.
 * Frame ranges are end-exclusive. Source project mutation occurs only in Session drafts.
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KomaPro = factory();
})(globalThis, function() {
'use strict';
const clone = x => JSON.parse(JSON.stringify(x));
const fail = message => { throw new Error('Pro: ' + message); };
const check = (value, message) => { if (!value) fail(message); };
const number = (v, low, high, name) => check(typeof v === 'number' && Number.isFinite(v) && v >= low && v <= high, 'Invalid ' + name);
const integer = (v, low, high, name) => { number(v, low, high, name); check(Number.isInteger(v), name + ' must be an integer'); };
const ident = x => check(typeof x === 'string' && /^[a-z][a-z0-9_-]{0,63}$/.test(x), 'Invalid identifier');
const list = (a, max, name) => check(Array.isArray(a) && a.length <= max, 'Invalid ' + name);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const I = [1,0,0,1,0,0];
const operations = [
 'prod_curve_set','prod_keys_retime','prod_exposure_cycle','prod_drawing_edit',
 'prod_drawing_inbetween','prod_driver_set','prod_driver_remove','prod_driver_bake',
 'prod_skin_bind','prod_skin_weights','prod_skin_unbind','prod_mesh_soft_move',
 'prod_audio_envelope','prod_audio_split','prod_audio_crossfade',
 'prod_note_set','prod_note_remove','prod_workrange_set','prod_patch_transform'
];
const features = [
 {id:'curve-lab',name:'Curve Lab',status:'implemented',scope:'Per-channel cubic Bezier timing, curve handles and motion-path inspection'},
 {id:'timing-sheet',name:'Timing Sheet',status:'implemented',scope:'Atomic multi-layer key/exposure retime and authored drawing cycles'},
 {id:'drawing-refine',name:'Drawing Refine',status:'implemented',scope:'Stroke smoothing, endpoint pressure, vector/stroke point editing and isolated cels'},
 {id:'drawing-between',name:'Drawing Inbetween',status:'implemented',scope:'Authored matching topology only; no generated anatomy or raster inpainting'},
 {id:'corrective-driver',name:'Corrective Drivers',status:'implemented',scope:'Acyclic channel mapping, drawing swaps, delays and deterministic baking'},
 {id:'skin-weights',name:'Skin Weights',status:'implemented',scope:'Grid raster linear-blend skinning, normalized weights and soft selection'},
 {id:'similarity-track',name:'Similarity Track',status:'implemented',scope:'Two-anchor position/rotation/uniform-scale tracking; explicit confidence rejection'},
 {id:'sound-envelope',name:'Sound Automation',status:'implemented',scope:'Gain/pan envelopes, non-destructive split, crossfade and peak checks'},
 {id:'review-desk',name:'Review Desk',status:'implemented',scope:'Shot-frame notes, status, work range and deterministic production preflight'},
 {id:'batch-queue',name:'Batch Queue',status:'implemented',scope:'Frozen shot jobs, bounded sequential rendering, manifests and local disk resume'}
];
function validateCurve(c) {
 list(c,4,'Bezier controls'); check(c.length===4,'Bezier needs four numbers');
 c.forEach((v,i)=>number(v,0,1,'Bezier coordinate '+i));
 check(c[0]<=c[2],'Bezier time handles must be ordered');
}
function cubic(a,b,t) { const u=1-t; return 3*u*u*t*a+3*u*t*t*b+t*t*t; }
function bezier(t,c) {
 validateCurve(c); number(t,0,1,'normalized time');
 if(t===0||t===1)return t;
 let lo=0,hi=1,u=t;
 for(let i=0;i<30;i++){u=(lo+hi)/2;if(cubic(c[0],c[2],u)<t)lo=u;else hi=u;}
 return cubic(c[1],c[3],u);
}
function keyCurves(k) {
 if(k.curves===undefined)return;
 check(k.curves && typeof k.curves==='object' && !Array.isArray(k.curves),'Invalid curve map');
 for(const [prop,c] of Object.entries(k.curves)){
  check(Object.hasOwn(k.values,prop),'Curve must name a channel keyed at the same frame'); validateCurve(c);
 }
}
function range(start,end,d) { integer(start,0,d-1,'start');integer(end,start+1,d,'end'); }
function upsert(a,entry,key='id'){const i=a.findIndex(x=>x[key]===entry[key]);if(i<0)a.push(entry);else a[i]=entry;}
function frameInsert(a,e){upsert(a,e,'frame');a.sort((a,b)=>a.frame-b.frame);}
function refCount(p,id){let n=0;for(const s of p.production.shots)for(const l of s.layers){if(l.asset===id)n++;n+=l.exposure.filter(e=>e.asset===id).length;}return n;}

// Supported path editing uses absolute M/L/Q/C/Z. Unsupported command families
// are refused, not approximated. Values and command arity stay paired.
function parsePath(d) {
 check(typeof d==='string' && d.length<=100000,'Invalid path');
 const tokenRE=/[MLQCZ]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g;
 const tokens=d.match(tokenRE)||[];
 check(d.replace(tokenRE,'').replace(/[\s,]/g,'')==='','Node editing accepts absolute M/L/Q/C/Z only');
 const sizes={M:2,L:2,Q:4,C:6,Z:0};let i=0,out=[];
 while(i<tokens.length){let cmd=tokens[i++];check(Object.hasOwn(sizes,cmd),'Explicit path command required');
  const values=[];for(let j=0;j<sizes[cmd];j++){check(i<tokens.length&&!Object.hasOwn(sizes,tokens[i]),'Path arity mismatch');const v=Number(tokens[i++]);number(v,-100000,100000,'path value');values.push(v);}
  out.push({cmd,values});
  // SVG permits repeated coordinates after M, L, Q and C.
  while(i<tokens.length&&!Object.hasOwn(sizes,tokens[i])){
   check(cmd!=='Z','Unexpected coordinates after Z');if(cmd==='M')cmd='L';const v=[];
   for(let j=0;j<sizes[cmd];j++){check(i<tokens.length&&!Object.hasOwn(sizes,tokens[i]),'Path arity mismatch');v.push(Number(tokens[i++]));}
   v.forEach(x=>number(x,-100000,100000,'path value'));out.push({cmd,values:v});
  }
 }
 check(out.length>0&&out[0].cmd==='M','Path must start with M');return out;
}
function pathString(segments){return segments.map(s=>s.cmd+s.values.map(v=>Number(v.toFixed(5))).join(' ')).join(' ');}
function nodes(a){
 check(a?.kind==='drawing','Select an editable drawing');const out=[];
 a.shapes.forEach((s,shape)=>{
  if(s.kind==='path'){let segments;try{segments=parsePath(s.d);}catch{return;}
   segments.forEach((seg,segment)=>{for(let coordinate=0;coordinate<seg.values.length;coordinate+=2)out.push({type:'path',shape,segment,coordinate,x:seg.values[coordinate],y:seg.values[coordinate+1],control:coordinate<seg.values.length-2,matrix:s.matrix||I});});
  }else{const field=s.kind==='ellipse'?'center':'origin';out.push({type:'shape',shape,field,x:s[field][0],y:s[field][1],matrix:s.matrix||I});}
 });
 a.strokes.forEach((s,stroke)=>s.points.forEach((p,point)=>out.push({type:'stroke',stroke,point,x:p[0],y:p[1],pressure:p[2],matrix:I})));
 return out;
}
function editNode(a,node,xy){
 check(Array.isArray(xy)&&xy.length===2,'Point needs x,y');xy.forEach(x=>number(x,-100000,100000,'node coordinate'));
 if(node.type==='stroke'){integer(node.stroke,0,a.strokes.length-1,'stroke');const s=a.strokes[node.stroke];integer(node.point,0,s.points.length-1,'stroke point');s.points[node.point][0]=xy[0];s.points[node.point][1]=xy[1];if(node.pressure!==undefined){number(node.pressure,0,1,'pressure');s.points[node.point][2]=node.pressure;}}
 else if(node.type==='path'){integer(node.shape,0,a.shapes.length-1,'shape');const s=a.shapes[node.shape];check(s.kind==='path','Path required');const segs=parsePath(s.d);integer(node.segment,0,segs.length-1,'segment');const seg=segs[node.segment];integer(node.coordinate,0,seg.values.length-2,'coordinate');check(node.coordinate%2===0,'Coordinate pair required');seg.values[node.coordinate]=xy[0];seg.values[node.coordinate+1]=xy[1];s.d=pathString(segs);}
 else if(node.type==='shape'){integer(node.shape,0,a.shapes.length-1,'shape');const s=a.shapes[node.shape],field=s.kind==='ellipse'?'center':s.kind==='rect'?'origin':null;check(field&&node.field===field,'Invalid shape handle');s[field]=xy;}
 else fail('Unknown node kind');
}
function stabilize(points,amount=.5,taper=0) {
 list(points,10000,'stroke points');check(points.length>0,'Empty stroke');number(amount,0,1,'stabilization');number(taper,0,.45,'taper');
 points.forEach(p=>{check(p.length===3,'Point must include pressure');p.forEach((x,i)=>number(x,i===2?0:-100000,i===2?1:100000,'stroke point'));});
 if(amount===0&&taper===0)return clone(points);
 const out=clone(points),radius=Math.round(amount*6);
 if(radius)for(let i=1;i<points.length-1;i++){
  let sums=[0,0,0],weight=0;
  for(let j=Math.max(0,i-radius);j<=Math.min(points.length-1,i+radius);j++){
   const w=radius+1-Math.abs(j-i);weight+=w;for(let k=0;k<3;k++)sums[k]+=points[j][k]*w;
  }
  for(let k=0;k<3;k++)out[i][k]=points[i][k]*(1-amount)+sums[k]/weight*amount;
 }
 if(taper&&out.length>1){const edge=Math.max(1,(out.length-1)*taper);out.forEach((p,i)=>p[2]*=Math.min(1,i/edge,(out.length-1-i)/edge));}
 return out;
}
function interpolateDrawing(a,b,t) {
 check(a.kind==='drawing'&&b.kind==='drawing','Inbetween requires two native drawings, not bitmaps');number(t,0,1,'inbetween');
 check(a.width===b.width&&a.height===b.height,'Drawing dimensions differ');
 check(a.shapes.length===b.shapes.length&&a.strokes.length===b.strokes.length,'Drawing topology differs');
 check(!a.regions.length&&!b.regions.length,'Raster fill regions cannot be interpolated');
 const out=clone(a),lerp=(x,y)=>x+(y-x)*t,vector=(x,y)=>{check(x.length===y.length,'Coordinate count differs');return x.map((v,i)=>lerp(v,y[i]));};
 out.shapes=out.shapes.map((s,i)=>{const q=b.shapes[i];check(s.kind===q.kind&&s.fill===q.fill&&s.stroke===q.stroke,'Shape type or palette association differs');s.width=lerp(s.width,q.width);s.opacity=lerp(s.opacity??1,q.opacity??1);
  check(JSON.stringify(s.matrix||I)===JSON.stringify(q.matrix||I),'Transform art before tweening: shape matrices differ');
  if(s.kind==='path'){const x=parsePath(s.d),y=parsePath(q.d);check(x.length===y.length,'Path topology differs');s.d=pathString(x.map((v,j)=>{check(v.cmd===y[j].cmd&&v.values.length===y[j].values.length,'Path commands differ');return{cmd:v.cmd,values:vector(v.values,y[j].values)};}));}
  else if(s.kind==='ellipse'){s.center=vector(s.center,q.center);s.radii=vector(s.radii,q.radii);}else{s.origin=vector(s.origin,q.origin);s.size=vector(s.size,q.size);}return s;
 });
 out.strokes=out.strokes.map((s,i)=>{const q=b.strokes[i];check(s.mode===q.mode&&s.color===q.color&&s.points.length===q.points.length,'Stroke correspondence differs');s.width=lerp(s.width,q.width);s.points=s.points.map((p,j)=>vector(p,q.points[j]));return s;});return out;
}

function channelValue(P,s,layer,frame,channel,stack=new Set()){
 const token=layer.id+':'+channel;check(!stack.has(token),'Driver dependency cycle');stack.add(token);
 let value=P.sample(layer.keys,Math.floor(frame/layer.hold)*layer.hold,layer.transform)[channel];
 for(const d of s.drivers||[]){if(!d.enabled||d.target!==layer.id||d.channel!==channel)continue;
  const src=P.findLayer(s,d.source),input=channelValue(P,s,src,Math.max(0,frame-d.delay),d.sourceChannel,stack),t=clamp((input-d.input[0])/(d.input[1]-d.input[0]),0,1);
  value=d.output[0]+(d.output[1]-d.output[0])*(d.curve?bezier(t,d.curve):t);
 }
 stack.delete(token);return value;
}
function transform(P,s,l,f){const out=P.sample(l.keys,Math.floor(f/l.hold)*l.hold,l.transform);for(const d of s.drivers||[])if(d.enabled&&d.target===l.id&&d.channel!=='drawing')out[d.channel]=channelValue(P,s,l,f,d.channel);return out;}
function drivenCel(P,s,l,f,base){let result=base;for(const d of s.drivers||[]){if(!d.enabled||d.target!==l.id||d.channel!=='drawing')continue;const v=channelValue(P,s,P.findLayer(s,d.source),Math.max(0,f-d.delay),d.sourceChannel);for(const stop of d.stops)if(v>=stop.at)result=stop.asset;}return result;}
function skinOffsets(P,s,l,f,a){
 const skin=l.skin;if(!skin)return P.meshPoints(l.mesh,f);
 const m=l.mesh,art=skin.restWorld,inv=P.inverse(P.world(s,l,f)),offset=P.meshPoints(m,f),out=[];
 const matrices=skin.bones.map(b=>P.mul(P.world(s,P.findLayer(s,b.layer),f),b.inverseBind));
 for(let i=0;i<skin.weights.length;i++){
  const src=[i%(m.cols+1)*a.width/m.cols+offset[i][0],Math.floor(i/(m.cols+1))*a.height/m.rows+offset[i][1]],rest=P.pt(art,src),world=[0,0];
  skin.weights[i].forEach((w,j)=>{if(w){const v=P.pt(matrices[j],rest);world[0]+=v[0]*w;world[1]+=v[1]*w;}});
  const dest=P.pt(inv,world);out.push([dest[0]-i%(m.cols+1)*a.width/m.cols,dest[1]-Math.floor(i/(m.cols+1))*a.height/m.rows]);
 }return out;
}
function normalizeWeights(weights){check(Array.isArray(weights)&&weights.length>0,'No bone weights');weights.forEach(w=>number(w,0,1,'bone weight'));const total=weights.reduce((a,b)=>a+b,0);check(total>1e-12,'At least one weight must be positive');return weights.map(w=>w/total);}
function softMove(m,a,frame,index,delta,radius,P){
 const points=P.meshPoints(m,frame),n=(m.cols+1)*(m.rows+1);integer(index,0,n-1,'vertex');number(radius,0,10000,'soft radius');check(delta.length===2,'Delta needs two values');delta.forEach(v=>number(v,-10000,10000,'vertex delta'));
 const sx=index%(m.cols+1)*a.width/m.cols,sy=Math.floor(index/(m.cols+1))*a.height/m.rows;
 points.forEach((p,i)=>{const dx=i%(m.cols+1)*a.width/m.cols-sx,dy=Math.floor(i/(m.cols+1))*a.height/m.rows-sy,dist=Math.hypot(dx,dy),u=radius?clamp(1-dist/radius,0,1):(i===index?1:0),w=u*u*(3-2*u);p[0]+=delta[0]*w;p[1]+=delta[1]*w;});return points;
}
function validate(p,P){
 const q=p.production;
 for(const s of q.shots){
  for(const key of [...s.camera.keys,...s.layout.keys,...s.layout.objects.flatMap(o=>o.keys),...s.layers.flatMap(l=>l.keys)])keyCurves(key);
  const drivers=s.drivers||[];list(drivers,128,'drivers');const ids=new Set(),targets=new Set();
  for(const d of drivers){ident(d.id);check(!ids.has(d.id),'Duplicate driver');ids.add(d.id);P.findLayer(s,d.source);P.findLayer(s,d.target);check(d.source!==d.target,'Self-driving layer is not allowed');check(typeof d.enabled==='boolean','Driver enabled flag');check(Object.hasOwn(P.TRANS,d.sourceChannel),'Unknown source channel');integer(d.delay,0,120,'driver delay');
   const target=d.target+':'+d.channel;check(!targets.has(target),'Only one driver per target channel');targets.add(target);
   if(d.channel==='drawing'){list(d.stops,64,'drawing stops');check(d.stops.length>0,'Empty drawing driver');let last=-Infinity;for(const st of d.stops){number(st.at,-36000,36000,'drawing stop');check(st.at>last,'Drawing stops must be sorted');last=st.at;if(st.asset!==null)check(P.findAsset(p,st.asset).kind!=='mesh','Drawing asset required');}}
   else{check(Object.hasOwn(P.TRANS,d.channel),'Unknown target channel');check(d.input?.length===2&&d.output?.length===2,'Driver range needs two values');d.input.forEach(v=>number(v,...P.BOUNDS[d.sourceChannel],'driver input'));check(d.input[1]>d.input[0],'Driver input range must increase');d.output.forEach(v=>number(v,...P.BOUNDS[d.channel],'driver output'));if(['scaleX','scaleY'].includes(d.channel))check(d.output[0]*d.output[1]>0&&Math.min(...d.output.map(Math.abs))>=.001,'Driver scale cannot cross zero');if(d.curve)validateCurve(d.curve);}
  }
  // Reject cycles even if currently disabled, so enabling a driver cannot change validity.
  const edges=new Map();for(const d of drivers){const a=d.source+':'+d.sourceChannel,b=d.target+':'+d.channel;if(!edges.has(a))edges.set(a,[]);edges.get(a).push(b);}
  const visiting=new Set(),done=new Set();function visit(k){check(!visiting.has(k),'Driver dependency cycle');if(done.has(k))return;visiting.add(k);for(const b of edges.get(k)||[])visit(b);visiting.delete(k);done.add(k);}for(const k of edges.keys())visit(k);
  for(const l of s.layers)if(l.skin){const sk=l.skin;check(l.mesh&&P.findAsset(p,l.asset).kind==='raster','Skin requires a raster grid');integer(sk.bindFrame,0,s.duration-1,'bind frame');list(sk.bones,16,'skin bones');check(sk.bones.length>0,'No bones bound');check(new Set(sk.bones.map(b=>b.layer)).size===sk.bones.length,'Duplicate skin bone');check(sk.restWorld?.length===6,'Rest matrix required');sk.restWorld.forEach(v=>number(v,-1e7,1e7,'rest matrix'));P.inverse(sk.restWorld);
   for(const b of sk.bones){P.findLayer(s,b.layer);check(b.layer!==l.id,'Mesh cannot bind to itself');check(b.inverseBind?.length===6,'Inverse bind matrix required');b.inverseBind.forEach(v=>number(v,-1e7,1e7,'bind matrix'));P.inverse(b.inverseBind);}
   check(sk.weights.length===(l.mesh.cols+1)*(l.mesh.rows+1),'Weight topology mismatch');for(const row of sk.weights){check(row.length===sk.bones.length,'Weight bone count mismatch');row.forEach(w=>number(w,0,1,'weight'));check(Math.abs(row.reduce((a,b)=>a+b,0)-1)<1e-6,'Weights must sum to one');}
  }
 }
 for(const t of q.audio){if(t.automation!==undefined){list(t.automation,7200,'audio envelope');let last=-1;for(const k of t.automation){integer(k.frame,0,t.length,'envelope frame');check(k.frame>last,'Envelope keys must be sorted');last=k.frame;number(k.gain,0,4,'envelope gain');number(k.pan,-1,1,'envelope pan');check(['linear','hold'].includes(k.ease),'Audio envelope supports linear or hold');}}}
 for(const pch of q.patches)for(const t of pch.track){if(t.rotation!==undefined)number(t.rotation,-36000,36000,'patch rotation');if(t.scale!==undefined)number(t.scale,.1,10,'patch scale');}
 if(q.notes!==undefined){list(q.notes,500,'review notes');const ids=new Set();for(const n of q.notes){ident(n.id);check(!ids.has(n.id),'Duplicate note');ids.add(n.id);const s=P.findShot(p,n.shot);integer(n.frame,0,s.duration-1,'note frame');check(typeof n.text==='string'&&n.text.length<=2000,'Note length limit');check(['open','resolved'].includes(n.status),'Note status');check(['info','fix','blocking'].includes(n.severity),'Note severity');if(n.layer!==null)P.findLayer(s,n.layer);if(n.rect!==null){check(n.rect.length===4,'Note rectangle needs x,y,w,h');n.rect.forEach(v=>number(v,0,30000,'note rectangle'));}}}
 if(q.workrange!==undefined&&q.workrange!==null)range(q.workrange.start,q.workrange.end,p.frames);
 return true;
}
function apply(p,c,P){
 const q=p.production,s=c.shot?P.findShot(p,c.shot):null,l=c.layer?P.findLayer(s,c.layer):null;
 const editable=x=>P.editable(s,x),assetEditable=id=>P.guardAsset(p,id);
 let result={};
 if(c.op==='prod_curve_set'){
  const target=c.target==='camera'?s.camera:l;if(target===l)editable(l);integer(c.frame,0,s.duration-1,'key frame');const k=target.keys.find(k=>k.frame===c.frame);check(k&&Object.hasOwn(k.values,c.channel),'Create a key for that channel first');if(c.curve===null){if(k.curves)delete k.curves[c.channel];}else{validateCurve(c.curve);k.curves={...k.curves,[c.channel]:clone(c.curve)};}result={frame:c.frame,channel:c.channel};
 } else if(c.op==='prod_keys_retime'){
  range(c.start,c.end,s.duration);integer(c.to,0,s.duration-1,'destination');number(c.scale,.05,20,'time scale');check(['keys','exposure','both'].includes(c.kind),'Retiming kind');check(['reject','replace'].includes(c.collision||'reject'),'Collision policy');list(c.layers,128,'target layers');check(c.layers.length>0||c.camera,'Select at least one track');check(new Set(c.layers).size===c.layers.length,'Duplicate layer target');
  const tracks=[];for(const id of c.layers){const x=P.findLayer(s,id);editable(x);if(c.kind!=='exposure')tracks.push([x,'keys']);if(c.kind!=='keys')tracks.push([x,'exposure']);}if(c.camera){check(c.kind!=='exposure','Camera has no exposure track');tracks.push([s.camera,'keys']);}
  const planned=[];for(const [x,key]of tracks){const source=x[key].filter(k=>k.frame>=c.start&&k.frame<c.end),rest=x[key].filter(k=>k.frame<c.start||k.frame>=c.end),occupied=new Set(rest.map(k=>k.frame)),mapped=[];for(const k of source){const f=c.to+Math.round((c.reverse?c.end-1-k.frame:k.frame-c.start)*c.scale);integer(f,0,s.duration-1,'retimed frame');check(!mapped.some(x=>x.frame===f),'Retime collapses multiple keys onto one frame');check(!occupied.has(f)||c.collision==='replace','Destination frame already has a key');mapped.push({...clone(k),frame:f});}
   if(c.reverse&&key==='keys')check(!source.some(k=>k.curves),'Remove custom curves before reversing keys; easing handles need reauthoring');
   planned.push([x,key,[...rest.filter(k=>!mapped.some(v=>v.frame===k.frame)),...mapped].sort((a,b)=>a.frame-b.frame)]);
  }for(const [x,k,a]of planned)x[k]=a;result={tracks:planned.length};
 } else if(c.op==='prod_exposure_cycle'){
  editable(l);range(c.start,c.end,s.duration);integer(c.hold,1,12,'drawing hold');list(c.assets,256,'cycle drawings');check(c.assets.length>0,'Choose drawings');for(const id of c.assets)if(id!==null)check(P.findAsset(p,id).kind!=='mesh','Not a drawing asset');
  const after=P.cel({...l,hold:1},c.end);l.exposure=l.exposure.filter(e=>e.frame<c.start||e.frame>=c.end);for(let f=c.start,i=0;f<c.end;f+=c.hold,i++)P.putCel(l,f,c.assets[i%c.assets.length]);if(c.end<s.duration)P.putCel(l,c.end,after);result={exposures:Math.ceil((c.end-c.start)/c.hold)};
 } else if(c.op==='prod_drawing_edit'){
  let a=P.findAsset(p,c.asset);check(a.kind==='drawing','Drawing required');
  if(c.copy){editable(l);integer(c.frame,0,s.duration-1,'drawing frame');check(P.cel(l,c.frame)===a.id,'Copy-on-write source is not displayed here');ident(c.copy);check(!q.assets.some(x=>x.id===c.copy),'Duplicate drawing ID');a=clone(a);a.id=c.copy;a.name+=' / revision';q.assets.push(a);P.putCel(l,c.frame,a.id);}else{assetEditable(a.id);check(c.shared===true||refCount(p,a.id)<=1,'Shared drawing: duplicate or explicitly allow shared editing');}
  if(c.node)editNode(a,c.node,c.xy);
  if(c.stroke!==undefined){integer(c.stroke,0,a.strokes.length-1,'stroke index');const st=a.strokes[c.stroke];st.points=stabilize(st.points,c.smoothing??.5,c.taper??0);}
  check(c.node||c.stroke!==undefined,'No edit requested');result={asset:a.id};
 } else if(c.op==='prod_drawing_inbetween'){
  editable(l);integer(c.start,0,s.duration-2,'start pose');integer(c.end,c.start+2,s.duration-1,'end pose');integer(c.step,1,12,'inbetween exposure');ident(c.prefix);check(c.replace===true||!l.exposure.some(e=>e.frame>c.start&&e.frame<c.end),'Existing cels in interval; explicit replace required');
  const a=P.findAsset(p,c.from),b=P.findAsset(p,c.to);interpolateDrawing(a,b,.5);const made=[];for(let f=c.start+c.step;f<c.end;f+=c.step){const id=c.prefix+'_'+f;ident(id);check(!q.assets.some(x=>x.id===id),'Inbetween asset ID exists');let t=(f-c.start)/(c.end-c.start);if(c.curve)t=bezier(t,c.curve);const d=interpolateDrawing(a,b,t);d.id=id;d.name='Between '+a.name+' / '+f;made.push([f,d]);}check(made.length>0,'No intermediate frame selected');check(q.assets.length+made.length<=256,'Asset budget exceeded');
  l.exposure=l.exposure.filter(e=>e.frame<=c.start||e.frame>=c.end);P.putCel(l,c.start,a.id);P.putCel(l,c.end,b.id);for(const [f,d]of made){q.assets.push(d);P.putCel(l,f,d.id);}result={created:made.map(x=>x[1].id)};
 } else if(c.op==='prod_driver_set'){
  const d=clone(c.driver);editable(P.findLayer(s,d.target));if(!s.drivers)s.drivers=[];const old=s.drivers.find(x=>x.id===d.id);if(old)editable(P.findLayer(s,old.target));upsert(s.drivers,d);
 } else if(c.op==='prod_driver_remove'){
  const d=(s.drivers||[]).find(d=>d.id===c.id);check(d,'Unknown driver');editable(P.findLayer(s,d.target));s.drivers=s.drivers.filter(d=>d.id!==c.id);
 } else if(c.op==='prod_driver_bake'){
  const d=(s.drivers||[]).find(d=>d.id===c.id);check(d&&d.enabled,'Enabled driver required');range(c.start,c.end,s.duration);check(c.start===0&&c.end===s.duration,'Bake whole shot before removing live driver');const target=P.findLayer(s,d.target);editable(target);const rows=[];
  for(let f=0;f<s.duration;f++)rows.push([f,transform(P,s,target,f),drivenCel(P,s,target,f,P.cel(target,f))]);
  s.drivers=s.drivers.filter(x=>x.id!==d.id);target.hold=1;target.keys=rows.map(([frame,values])=>({frame,values,ease:'hold'}));target.exposure=rows.map(([frame,values,asset])=>({frame,asset}));result={baked:rows.length};
 } else if(c.op==='prod_skin_bind'){
  editable(l);check(l.mesh&&P.findAsset(p,l.asset).kind==='raster','Create a raster grid first');integer(c.frame,0,s.duration-1,'bind frame');list(c.bones,16,'bones');check(c.bones.length>0&&new Set(c.bones).size===c.bones.length,'Choose distinct bones');const bones=c.bones.map(id=>{check(id!==l.id,'Cannot bind mesh to itself');return{layer:id,inverseBind:P.inverse(P.world(s,P.findLayer(s,id),c.frame))};}),restWorld=P.world(s,l,c.frame),a=P.findAsset(p,l.asset);
  const origins=bones.map(b=>P.pt(P.world(s,P.findLayer(s,b.layer),c.frame),P.findLayer(s,b.layer).pivot));
  const weights=Array.from({length:(l.mesh.cols+1)*(l.mesh.rows+1)},(_,i)=>{const v=P.pt(restWorld,[i%(l.mesh.cols+1)*a.width/l.mesh.cols,Math.floor(i/(l.mesh.cols+1))*a.height/l.mesh.rows]),raw=origins.map(b=>1/Math.max(1,Math.hypot(v[0]-b[0],v[1]-b[1]))**2),sum=raw.reduce((a,b)=>a+b,0);return raw.map(w=>w/sum);});
  l.skin={bindFrame:c.frame,restWorld,bones,weights};result={vertices:weights.length,bones:bones.length};
 } else if(c.op==='prod_skin_weights'){
  editable(l);check(l.skin,'Bind mesh first');list(c.vertices,l.skin.weights.length,'vertices');check(c.vertices.length>0,'Choose vertices');const row=normalizeWeights(c.weights);check(row.length===l.skin.bones.length,'Bone count differs');for(const i of c.vertices){integer(i,0,l.skin.weights.length-1,'vertex');l.skin.weights[i]=clone(row);}
 } else if(c.op==='prod_skin_unbind'){
  editable(l);delete l.skin;
 } else if(c.op==='prod_mesh_soft_move'){
  editable(l);check(l.mesh,'Mesh required');integer(c.frame,0,s.duration-1,'mesh frame');const points=softMove(l.mesh,P.findAsset(p,l.asset),c.frame,c.vertex,c.delta,c.radius,P);frameInsert(l.mesh.keys,{frame:c.frame,points});
 } else if(c.op==='prod_audio_envelope'){
  const t=q.audio.find(t=>t.id===c.id);check(t,'Unknown audio track');t.automation=clone(c.keys);
 } else if(c.op==='prod_audio_split'){
  const t=q.audio.find(t=>t.id===c.id);check(t,'Unknown audio track');integer(c.frame,1,t.length-1,'local split frame');ident(c.newId);check(!q.audio.some(x=>x.id===c.newId),'Audio ID exists');const right=clone(t),v=audioValue(t,c.frame);check(c.frame>=t.fadeIn&&c.frame<=t.length-t.fadeOut,'Split inside an existing fade is refused; shorten the fade first');right.id=c.newId;right.name+=' / B';right.start+=c.frame;right.offset+=c.frame/p.fps;right.length-=c.frame;right.fadeIn=0;right.fadeOut=Math.min(right.fadeOut,right.length);right.automation=[{frame:0,...v,ease:[...(t.automation||[])].reverse().find(k=>k.frame<=c.frame)?.ease||'hold'},...(t.automation||[]).filter(k=>k.frame>c.frame).map(k=>({...k,frame:k.frame-c.frame}))];
  const rightSourceDuration=P.Audio.decode(P.Audio.fromData(t.data)).duration;check(right.offset<rightSourceDuration,'Split falls beyond source audio');t.length=c.frame;t.fadeOut=0;t.fadeIn=Math.min(t.fadeIn,t.length);t.automation=[...(t.automation||[]).filter(k=>k.frame<c.frame),{frame:c.frame,...v,ease:'linear'}];q.audio.splice(q.audio.indexOf(t)+1,0,right);result={right:right.id};
 } else if(c.op==='prod_audio_crossfade'){
  const a=q.audio.find(t=>t.id===c.first),b=q.audio.find(t=>t.id===c.second);check(a&&b&&a!==b&&a.shot===b.shot,'Choose two tracks with the same timeline anchor');integer(c.frames,1,Math.min(a.length,b.length),'crossfade frames');check(a.start+a.length-c.frames===b.start,'Tracks must already overlap by exactly this duration');a.fadeOut=c.frames;b.fadeIn=c.frames;
 } else if(c.op==='prod_note_set'){
  if(!q.notes)q.notes=[];upsert(q.notes,clone(c.note));
 } else if(c.op==='prod_note_remove'){
  q.notes=(q.notes||[]).filter(n=>n.id!==c.id);
 } else if(c.op==='prod_workrange_set'){
  q.workrange=c.range===null?null:clone(c.range);
 } else if(c.op==='prod_patch_transform'){
  const patch=q.patches.find(x=>x.id===c.id);check(patch,'Unknown patch');const t=patch.track.find(x=>x.frame===c.frame);check(t,'Unknown patch frame');Object.assign(t,{x:c.x,y:c.y,rotation:c.rotation,scale:c.scale,confidence:1,accepted:true});
 }else fail('Unknown operation');
 q.minimumEditor='0.5.0';return result;
}
function audioValue(track,frame){
 const keys=track.automation||[];if(!keys.length)return{gain:1,pan:0};let a=null,b=null;
 for(const k of keys){if(k.frame<=frame)a=k;else{b=k;break;}}if(!a)return{gain:1,pan:0};if(!b||a.ease==='hold')return{gain:a.gain,pan:a.pan};const t=(frame-a.frame)/(b.frame-a.frame);return{gain:a.gain+(b.gain-a.gain)*t,pan:a.pan+(b.pan-a.pan)*t};
}
function preflight(p,P){
 const messages=[];const add=(level,code,detail)=>messages.push({level,code,detail});
 try{P.validateProject(p);}catch(e){add('error','schema',e.message);return{messages,ok:false};}
 const q=p.production;
 for(const s of q.shots){for(const l of s.layers){
  if(l.skin&&l.exposure.some(e=>e.asset&&e.asset!==l.asset))add('warning','skin_substitution',s.name+' / '+l.name+': changed cel uses the same mesh binding; verify dimensions and weights');
  for(const key of l.keys){if(key.curves&&key.ease==='hold')add('warning','held_curve',s.name+' / '+l.name+': curve on a hold key has no effect');}
  if(l.mesh){const a=q.assets.find(a=>a.id===l.asset);if(a)for(const k of l.mesh.keys){let flipped=0;const xy=[];for(let y=0;y<=l.mesh.rows;y++)for(let x=0;x<=l.mesh.cols;x++){const i=y*(l.mesh.cols+1)+x;xy.push([x*a.width/l.mesh.cols+k.points[i][0],y*a.height/l.mesh.rows+k.points[i][1]]);}for(let y=0;y<l.mesh.rows;y++)for(let x=0;x<l.mesh.cols;x++){const i=y*(l.mesh.cols+1)+x;for(const [u,v,w]of [[i,i+1,i+l.mesh.cols+1],[i+1,i+l.mesh.cols+2,i+l.mesh.cols+1]])if((xy[v][0]-xy[u][0])*(xy[w][1]-xy[u][1])-(xy[v][1]-xy[u][1])*(xy[w][0]-xy[u][0])<=0)flipped++;}if(flipped)add('warning','mesh_fold',s.name+' / '+l.name+' F'+k.frame+': '+flipped+' folded/degenerate triangles');}}
 }
 for(const n of (q.notes||[]).filter(n=>n.shot===s.id&&n.status==='open'))add(n.severity==='blocking'?'error':'warning','open_note',s.name+' F'+n.frame+': '+n.text);
 }
 for(const t of q.audio){const limit=t.shot?P.findShot(p,t.shot).duration:p.frames;if(t.start+t.length>limit)add('warning','audio_tail',t.name+': audio extends past its anchor/sequence');}
 for(const pa of q.patches)if(pa.track.some(t=>!t.accepted))add('warning','rejected_tracking',pa.id+': unaccepted samples are intentionally omitted');
 add('info','artistic_review','Numerical checks do not certify acting, anatomy, line quality or model identity.');return{ok:!messages.some(x=>x.level==='error'),messages};
}
return {operations,features,supports:op=>operations.includes(op),validateCurve,keyCurves,bezier,parsePath,pathString,nodes,editNode,stabilize,interpolateDrawing,refCount,channelValue,transform,drivenCel,skinOffsets,normalizeWeights,softMove,validate,apply,audioValue,preflight};
});
