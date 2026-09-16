/* Koma Atelier 0.6: drawing provenance, safe paint, staged review and edits.
 * This is authoring infrastructure, not an anatomy/image-generation model. */
(function(r,f){if(typeof module==='object'&&module.exports)module.exports=f(require('./atelier-paint.js'));else r.KomaAtelier=f(r.KomaAtelierPaint);})(globalThis,function(Paint){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x)),check=(v,s)=>{if(!v)throw Error('Atelier: '+s);},hash=Paint.stamp;
const PLANES=['rough','line','correction','shadow','highlight'];
const STAGES={lookdev:[],board:['lookdev'],layout:['board'],animation:['layout'],cleanup:['animation'],paint:['cleanup','lookdev'],background:['lookdev','layout'],composite:['paint','background'],sound:['board'],delivery:['composite','sound']};
const idSchema={type:'string',pattern:'^[a-z][a-z0-9_-]{0,63}$'},text={type:'string',maxLength:2000},bool={type:'boolean'},num=(min=-100000,max=100000)=>({type:'number',minimum:min,maximum:max}),int=(min=0,max=3600)=>({type:'integer',minimum:min,maximum:max}),en=values=>({type:'string',enum:values}),array=(items,maxItems=128,minItems=0)=>({type:'array',items,maxItems,minItems}),obj=(properties,required=Object.keys(properties))=>({type:'object',properties,required,additionalProperties:false}),xy={type:'array',items:num(),minItems:2,maxItems:2},point3={type:'array',prefixItems:[num(),num(),num(0,1)],items:false,minItems:3,maxItems:3};
const strokeSchema=obj({id:idSchema,mode:en(['ink','erase']),color:idSchema,width:num(.1,200),points:array(point3,10000,1),plane:en(PLANES),group:idSchema},['id','mode','color','width','points']);
const shapeBase={id:idSchema,fill:{anyOf:[idSchema,en(['none']),{type:'null'}]},stroke:{anyOf:[idSchema,en(['none']),{type:'null'}]},width:num(0,200),opacity:num(0,1),plane:en(PLANES),matrix:{type:'array',items:num(),minItems:6,maxItems:6}};
const shapeSchema={anyOf:[obj({...shapeBase,kind:{const:'path'},d:{type:'string',maxLength:100000}},['kind','d','fill','stroke','width']),obj({...shapeBase,kind:{const:'ellipse'},center:xy,radii:xy},['kind','center','radii','fill','stroke','width']),obj({...shapeBase,kind:{const:'rect'},origin:xy,size:xy},['kind','origin','size','fill','stroke','width'])]};
const selector=obj({shapes:array(int(0,4999)),strokes:array(idSchema)},[]);
const schemas={};
function spec(name,fields,required=Object.keys(fields)){schemas[name]=obj({op:{const:name},...fields},['op',...required]);}
spec('atelier_enable',{acceptLegacy:bool},[]);
spec('atelier_drawing_fork',{asset:idSchema,id:idSchema,shot:idSchema,layer:idSchema,start:int(),end:int(1),name:text},['asset','id','shot','layer','start','end']);
spec('atelier_strokes_add',{asset:idSchema,strokes:array(strokeSchema,64,1),shared:bool},['asset','strokes']);
spec('atelier_shapes_add',{asset:idSchema,shapes:array(shapeSchema,64,1),shared:bool},['asset','shapes']);
spec('atelier_lane_set',{asset:idSchema,selection:selector,plane:en(PLANES),shared:bool},['asset','selection','plane']);
spec('atelier_selection_transform',{asset:idSchema,selection:selector,matrix:{type:'array',items:num(),minItems:6,maxItems:6},shared:bool},['asset','selection','matrix']);
spec('atelier_region_seed',{asset:idSchema,id:idSchema,color:idSchema,seed:xy,gap:int(0,3),shared:bool},['asset','id','color','seed']);
spec('atelier_regions_rebuild',{asset:idSchema,regions:array(idSchema),shared:bool},['asset']);
spec('atelier_region_resolve',{asset:idSchema,id:idSchema,fingerprint:text,shared:bool},['asset','id','fingerprint']);
spec('atelier_region_remove',{asset:idSchema,id:idSchema,shared:bool},['asset','id']);
spec('atelier_line_inbetween',{shot:idSchema,layer:idSchema,from:idSchema,to:idSchema,start:int(),end:int(1),step:int(1,12),prefix:idSchema,replace:bool,paintPolicy:en(['none','seeded'])},['shot','layer','from','to','start','end','step','prefix']);
spec('atelier_reference_set',{id:idSchema,asset:idSchema,kind:en(['pose','turnaround','palette','layout','style','reference']),name:text,notes:text,character:idSchema},['id','asset','kind','name']);
spec('atelier_reference_remove',{id:idSchema});
spec('atelier_character_set',{id:idSchema,name:text,notes:text,palette:array(idSchema,256),proportions:obj({headRatio:num(.1,100),height:num(.1,100000)},[])},['id','name']);
spec('atelier_part_set',{id:idSchema,shot:idSchema,layer:idSchema,role:text,character:idSchema},['id','shot','layer','role']);
spec('atelier_relationship_set',{id:idSchema,from:idSchema,to:idSchema,kind:en(['contact','occlusion','costume','shadow','follow']),note:text},['id','from','to','kind']);
spec('atelier_relationship_remove',{id:idSchema});
spec('atelier_anchor_set',{asset:idSchema,id:idSchema,point:xy,kind:en(['joint','contact','reference']),shared:bool},['asset','id','point','kind']);
spec('atelier_align_anchor',{shot:idSchema,source:idSchema,target:idSchema,sourceAnchor:idSchema,targetAnchor:idSchema,frame:int(),ease:en(['hold','linear','ease'])},['shot','source','target','sourceAnchor','targetAnchor','frame']);
spec('atelier_pose_mark',{shot:idSchema,frame:int(),kind:en(['key','breakdown','inbetween']),note:text},['shot','frame','kind','note']);
spec('atelier_board_set',{shot:idSchema,action:text,dialogue:text,cameraIntent:text},['shot','action']);
spec('atelier_light_set',{shot:idSchema,direction:{type:'array',items:num(-1,1),minItems:3,maxItems:3},note:text},['shot','direction']);
spec('atelier_plane_review',{asset:idSchema,plane:en(['shadow','highlight']),lineHash:text,reviewer:text,note:text},['asset','plane','lineHash','reviewer']);
spec('atelier_stage_review',{shot:idSchema,stage:en(Object.keys(STAGES)),status:en(['submitted','approved','changes_requested']),reviewer:text,note:text,expectedFingerprint:text},['shot','stage','status','reviewer','expectedFingerprint']);
const operations=Object.keys(schemas);
function validateValue(v,s,path='command'){
 if(s.anyOf){check(s.anyOf.some(schema=>{try{validateValue(v,schema,path);return true;}catch{return false;}}),'Unsupported structure at '+path);return;}
 if(s.const!==undefined)check(v===s.const,'Expected '+s.const+' at '+path);
 if(s.enum)check(s.enum.includes(v),'Unknown value at '+path);
 if(s.type==='null'){check(v===null,'Null required at '+path);return;}
 if(s.type==='object'){check(v&&typeof v==='object'&&!Array.isArray(v),'Object required at '+path);for(const key of s.required||[])check(Object.hasOwn(v,key),'Missing '+path+'.'+key);for(const key of Object.keys(v)){check(Object.hasOwn(s.properties,key)||s.additionalProperties!==false,'Unknown field '+path+'.'+key);if(s.properties[key])validateValue(v[key],s.properties[key],path+'.'+key);}}
 else if(s.type==='array'){check(Array.isArray(v)&&v.length>=(s.minItems||0)&&v.length<=(s.maxItems??100000),'Array budget at '+path);v.forEach((x,i)=>{const sub=s.prefixItems?.[i]||s.items;check(sub!==false,'Too many items at '+path);if(sub)validateValue(x,sub,path+'['+i+']');});}
 else if(s.type==='string'){check(typeof v==='string'&&v.length<=(s.maxLength??64000),'Text required at '+path);if(s.pattern)check(new RegExp(s.pattern).test(v),'Invalid identifier at '+path);}
 else if(s.type==='boolean')check(typeof v==='boolean','Boolean required at '+path);
 else if(s.type==='number'||s.type==='integer'){check(typeof v==='number'&&Number.isFinite(v)&&v>=(s.minimum??-Infinity)&&v<=(s.maximum??Infinity),'Numeric bounds at '+path);if(s.type==='integer')check(Number.isInteger(v),'Integer required at '+path);}
}
function ensure(p){return p.production.atelier||(p.production.atelier={schema:'koma.atelier/1',references:[],characters:[],parts:[],relationships:[],poses:[],boards:[],lights:[],reviews:[]});}
function unique(list,item){const i=list.findIndex(x=>x.id===item.id);if(i<0)list.push(item);else list[i]=item;}
function content(a){const o=clone(a);delete o.atelier;for(const s of [...(o.shapes||[]),...(o.strokes||[]),...(o.regions||[])]){delete s.atelier;delete s.proposal;}return o;}
function markAsset(a){if(!a.atelier)a.atelier={schema:'koma.drawing/1',revision:1,lineRevision:1,lineHash:Paint.lineStamp(a),anchors:[],history:[]};return a.atelier;}
function begin(p){const state=new Map((p.production?.assets||[]).filter(a=>a.kind==='drawing').map(a=>[a.id,{line:Paint.lineStamp(a),content:hash(content(a)),regions:new Map(a.regions.map(r=>[r.id,hash(r.runs)])),meta:clone(a.atelier||{}),planes:new Map(PLANES.map(plane=>[plane,hash({shapes:a.shapes.filter(s=>(s.plane||'line')===plane),strokes:a.strokes.filter(s=>(s.plane||'line')===plane)})]))}]));state.shots=(p.production?.shots||[]).map(s=>({id:s.id,duration:s.duration}));return state;}
function finish(p,before,commands=[]){
 if(!p.production)return;
 for(const a of p.production.assets){if(a.kind!=='drawing')continue;const old=before.get(a.id),line=Paint.lineStamp(a),changed=!old||old.content!==hash(content(a)),lineChanged=old&&old.line!==line;
  if(changed||a.atelier){const meta=markAsset(a),oldStamp=meta.lineHash;meta.revision=(old?.meta.revision||0)+(changed?1:0)||1;meta.lineRevision=(old?.meta.lineRevision||0)+(!old||lineChanged?1:0)||1;meta.lineHash=line;
   if(changed){meta.history=[...(meta.history||[]),{revision:meta.revision,lineHash:line,operations:[...new Set(commands.map(c=>c.op))]}].slice(-24);}
   for(const r of a.regions){if(!r.atelier){const inherited=old?.regions.has(r.id)&&old.regions.get(r.id)===hash(r.runs);r.atelier={status:inherited&&lineChanged?'stale':'ready',sourceLineHash:inherited&&lineChanged?old.line:line,algorithm:'manual-runs',review:'unreviewed'};}
    if(r.atelier.sourceLineHash!==line){r.atelier.status='stale';r.atelier.review='needs_review';}
   }
   for(const plane of ['shadow','highlight']){const hasPlane=[...a.shapes,...a.strokes].some(s=>s.plane===plane);if(!hasPlane)continue;meta.planes=meta.planes||{};
    const planeStamp=hash({shapes:a.shapes.filter(s=>s.plane===plane),strokes:a.strokes.filter(s=>s.plane===plane)}),planeChanged=old?.planes.get(plane)!==planeStamp;
    const rec=meta.planes[plane]||{sourceLineHash:lineChanged&&!planeChanged?(oldStamp||old.line):line,status:'needs_review'};
    if(rec.sourceLineHash!==line||rec.fingerprint&&rec.fingerprint!==planeFingerprint(p,a,plane)){rec.status='stale';}else if(planeChanged){rec.status='needs_review';delete rec.approvedBy;}
    meta.planes[plane]=rec;
   }
  }
 }
 if(p.production.atelier){const q=ensure(p),shots=p.production.shots;
  // Shot deletion/trim must not leave impossible authoring metadata. Session
  // history keeps the prior version; copying a shot never copies approvals.
  for(const c of commands)if(c.op==='prod_shot_resize'){
   const old=before.shots?.find(s=>s.id===c.shot),now=shots.find(s=>s.id===c.shot);
   if(old&&now){const marks=new Map();for(const pose of q.poses){if(pose.shot!==c.shot){marks.set(pose.id,pose);continue;}const frame=c.mode==='scale'?Math.round(pose.frame*(now.duration-1)/Math.max(1,old.duration-1)):pose.frame;if(frame<now.duration)marks.set(c.shot+'_'+frame,{...pose,id:c.shot+'_'+frame,frame});}q.poses=[...marks.values()];}
  }
  for(const key of ['poses','boards','lights','reviews'])q[key]=q[key].filter(r=>shots.some(s=>s.id===r.shot));
  q.parts=q.parts.filter(r=>shots.some(s=>s.id===r.shot&&s.layers.some(l=>l.id===r.layer)));
  q.relationships=q.relationships.filter(r=>q.parts.some(p=>p.id===r.from)&&q.parts.some(p=>p.id===r.to));
  q.references=q.references.filter(r=>p.production.assets.some(a=>a.id===r.asset));
  for(const rec of q.reviews){if(rec.status==='approved'&&rec.fingerprint!==stageFingerprint(p,rec.shot,rec.stage)){rec.status='needs_review';rec.reason='Upstream content changed; previous approval preserved in history';}}}
}
function adopt(p,accept=false){const q=ensure(p);for(const a of p.production.assets)if(a.kind==='drawing'){markAsset(a).layered=true;for(const r of a.regions)if(!r.atelier)r.atelier={status:accept?'ready':'unverified',sourceLineHash:Paint.lineStamp(a),algorithm:'legacy-import',review:'unreviewed'};}return q;}
function validate(p,P){
 const q=p.production.atelier;if(q){check(q.schema==='koma.atelier/1','Unsupported atelier schema');for(const key of ['references','characters','parts','relationships','poses','boards','lights','reviews'])check(Array.isArray(q[key])&&q[key].length<=2048,'Invalid '+key);
  for(const key of ['references','characters','parts','relationships'])check(new Set(q[key].map(x=>x.id)).size===q[key].length,'Duplicate '+key);
  for(const r of q.references){P.findAsset(p,r.asset);if(r.character)check(q.characters.some(c=>c.id===r.character),'Missing reference character');}
  for(const r of q.parts){P.findLayer(P.findShot(p,r.shot),r.layer);if(r.character)check(q.characters.some(c=>c.id===r.character),'Missing part character');}
  for(const r of q.relationships)check(q.parts.some(x=>x.id===r.from)&&q.parts.some(x=>x.id===r.to)&&r.from!==r.to,'Relationship requires two different known parts');
  for(const r of q.reviews){P.findShot(p,r.shot);check(Object.hasOwn(STAGES,r.stage)&&['approved','submitted','changes_requested','needs_review'].includes(r.status),'Invalid review');}
  for(const r of q.poses)check(r.frame>=0&&r.frame<P.findShot(p,r.shot).duration,'Pose marker outside shot');
 }
 for(const a of p.production.assets)if(a.kind==='drawing'){
  if(a.atelier){check(a.atelier.schema==='koma.drawing/1','Invalid drawing provenance');check(Array.isArray(a.atelier.anchors)&&a.atelier.anchors.length<=128,'Anchor budget');check(a.atelier.lineHash===Paint.lineStamp(a),'Stored line fingerprint is stale');}
  for(const s of [...a.shapes,...a.strokes])if(s.plane!==undefined)check(PLANES.includes(s.plane),'Invalid drawing plane');
  for(const r of a.regions)if(r.atelier){check(['ready','stale','unverified'].includes(r.atelier.status),'Invalid region state');if(r.atelier.seed)check(r.atelier.seed.length===2&&r.atelier.seed.every(Number.isFinite),'Invalid fill seed');}
 }
 return true;
}
function assetEdit(p,c,P){const a=P.findAsset(p,c.asset);check(a.kind==='drawing','Native drawing required');P.guardAsset(p,a.id);markAsset(a).layered=true;check(c.shared===true||P.Pro.refCount(p,a.id)<=1,'Shared asset: fork a local cel or explicitly allow shared edit');return a;}
function selection(a,sel){const shapes=(sel.shapes||[]).map(i=>{check(a.shapes[i],'Unknown shape');return a.shapes[i];}),strokes=(sel.strokes||[]).map(id=>{const s=a.strokes.find(s=>s.id===id);check(s,'Unknown stroke');return s;});check(shapes.length+strokes.length>0,'Empty selection');return {shapes,strokes};}
function apply(p,c,P){
 validateValue(c,schemas[c.op]);const q=ensure(p);let result={},s=c.shot?P.findShot(p,c.shot):null;
 if(c.op==='atelier_enable'){adopt(p,c.acceptLegacy===true);return {adopted:true,legacyApproval:false};}
 if(c.op==='atelier_drawing_fork'){
  const a=P.findAsset(p,c.asset),l=P.findLayer(s,c.layer);P.editable(s,l);check(a.kind==='drawing','Fork native drawing only');check(!p.production.assets.some(x=>x.id===c.id),'Asset ID already exists');check(c.start<c.end&&c.end<=s.duration,'Invalid end-exclusive range');check(c.start%l.hold===0&&(c.end===s.duration||c.end%l.hold===0),'Range must align with drawing hold');check(P.displayCel(s,l,c.start)===a.id,'Source drawing not displayed at range start');
  const copy=clone(a);copy.id=c.id;copy.name=c.name||a.name+' / local';markAsset(copy).parentId=a.id;p.production.assets.push(copy);const next=c.end<s.duration?P.cel(l,c.end):null;l.exposure=l.exposure.filter(e=>e.frame<c.start||e.frame>=c.end);P.putCel(l,c.start,copy.id);if(c.end<s.duration)P.putCel(l,c.end,next);result={asset:copy.id,parent:a.id};
 }else if(c.op==='atelier_strokes_add'||c.op==='atelier_shapes_add'){
  const a=assetEdit(p,c,P);if(c.strokes){const ids=new Set(a.strokes.map(s=>s.id));for(const st of c.strokes){check(!ids.has(st.id),'Stroke ID exists');ids.add(st.id);a.strokes.push(clone(st));}}else a.shapes.push(...clone(c.shapes));result={asset:a.id};
 }else if(c.op==='atelier_lane_set'){const a=assetEdit(p,c,P),sel=selection(a,c.selection);for(const x of [...sel.shapes,...sel.strokes])x.plane=c.plane;
 }else if(c.op==='atelier_selection_transform'){
  const a=assetEdit(p,c,P),sel=selection(a,c.selection);check(Math.abs(c.matrix[0]*c.matrix[3]-c.matrix[1]*c.matrix[2])>1e-8,'Singular selection transform');for(const x of sel.shapes)x.matrix=P.mul(c.matrix,x.matrix||[1,0,0,1,0,0]);for(const x of sel.strokes)x.points=x.points.map(pt=>[...P.pt(c.matrix,pt),pt[2]]);
 }else if(c.op==='atelier_region_seed'){
  const a=assetEdit(p,c,P);check(p.production.palette.some(x=>x.id===c.color),'Unknown color');const region=Paint.seeded(a,c);for(const other of a.regions){if(other.id===c.id||!other.atelier?.seed)continue;check(!region.runs.some(([y,x,e])=>Math.floor(other.atelier.seed[1])===y&&other.atelier.seed[0]>=x&&other.atelier.seed[0]<e),'Seed conflicts with another region assignment');}unique(a.regions,region);result={region:c.id,area:region.atelier.area};
 }else if(c.op==='atelier_regions_rebuild'){const a=assetEdit(p,c,P),r=Paint.rebuild(a,c.regions);a.regions=r.asset.regions;result={updated:r.updated,pending:r.pending};
 }else if(c.op==='atelier_region_resolve'){const a=assetEdit(p,c,P);Paint.resolve(a,c.id,c.fingerprint);
 }else if(c.op==='atelier_region_remove'){const a=assetEdit(p,c,P);check(a.regions.some(r=>r.id===c.id),'Unknown region');a.regions=a.regions.filter(r=>r.id!==c.id);
 }else if(c.op==='atelier_line_inbetween'){
  const l=P.findLayer(s,c.layer);P.editable(s,l);check(c.start<c.end-1&&c.end<s.duration,'Need two endpoints and an intermediate frame');check(c.replace||!l.exposure.some(e=>e.frame>c.start&&e.frame<c.end),'Interval already contains drawing exposures');const a=P.findAsset(p,c.from),b=P.findAsset(p,c.to);check(a.kind==='drawing'&&b.kind==='drawing','Native endpoint drawings required');
  const only=a=>{const x=clone(a);x.regions=[];x.shapes=x.shapes.filter(s=>(s.plane||'line')==='line');x.strokes=x.strokes.filter(s=>(s.plane||'line')==='line');return x;},aa=only(a),bb=only(b);P.Pro.interpolateDrawing(aa,bb,.5);const made=[];
  for(let f=c.start+c.step;f<c.end;f+=c.step){const t=(f-c.start)/(c.end-c.start),d=P.Pro.interpolateDrawing(aa,bb,t);d.id=c.prefix+'_'+f;check(!p.production.assets.some(x=>x.id===d.id),'Inbetween ID exists');d.name='Line inbetween '+f;delete d.atelier;markAsset(d).parents=[a.id,b.id];
   if(c.paintPolicy==='seeded')for(const region of a.regions){const other=b.regions.find(r=>r.id===region.id&&r.color===region.color);if(!other?.atelier?.seed||!region.atelier?.seed)continue;const seed=region.atelier.seed.map((v,i)=>v+(other.atelier.seed[i]-v)*t);try{const seeded=Paint.seeded(d,{id:region.id,color:region.color,seed,gap:region.atelier.gap||0});const conflicts=d.regions.filter(r=>r.atelier?.seed&&seeded.runs.some(([y,x,e])=>Math.floor(r.atelier.seed[1])===y&&r.atelier.seed[0]>=x&&r.atelier.seed[0]<e));for(const r of conflicts)r.atelier.status='stale';check(!conflicts.length,'Merged interpolated color ownership');d.regions.push(seeded);}catch{const r=clone(region);r.atelier={...r.atelier,status:'stale',seed};d.regions.push(r);}}
   p.production.assets.push(d);made.push([f,d.id]);
  }check(made.length,'No intermediate frame');l.exposure=l.exposure.filter(e=>e.frame<=c.start||e.frame>=c.end);P.putCel(l,c.start,a.id);P.putCel(l,c.end,b.id);for(const [f,id]of made)P.putCel(l,f,id);result={created:made.map(x=>x[1]),scope:'Matching clean-line topology, not generated motion'};
 }else if(c.op==='atelier_reference_set'){P.findAsset(p,c.asset);unique(q.references,{id:c.id,asset:c.asset,kind:c.kind,name:c.name,notes:c.notes||'',...(c.character?{character:c.character}:{})});
 }else if(c.op==='atelier_reference_remove')q.references=q.references.filter(r=>r.id!==c.id);
 else if(c.op==='atelier_character_set'){unique(q.characters,{id:c.id,name:c.name,notes:c.notes||'',palette:c.palette||[],proportions:c.proportions||{}});
 }else if(c.op==='atelier_part_set'){P.findLayer(s,c.layer);unique(q.parts,{id:c.id,shot:c.shot,layer:c.layer,role:c.role,...(c.character?{character:c.character}:{})});
 }else if(c.op==='atelier_relationship_set'){unique(q.relationships,{id:c.id,from:c.from,to:c.to,kind:c.kind,note:c.note||''});
 }else if(c.op==='atelier_relationship_remove')q.relationships=q.relationships.filter(r=>r.id!==c.id);
 else if(c.op==='atelier_anchor_set'){const a=assetEdit(p,c,P);unique(markAsset(a).anchors,{id:c.id,point:clone(c.point),kind:c.kind});
 }else if(c.op==='atelier_align_anchor'){
  const src=P.findLayer(s,c.source),dst=P.findLayer(s,c.target);P.editable(s,dst);check(c.frame<s.duration,'Frame outside shot');const find=(l,id)=>{const a=P.findAsset(p,P.displayCel(s,l,c.frame)),pt=a.atelier?.anchors.find(x=>x.id===id);check(pt,'Anchor missing from displayed drawing');return P.pt(P.world(s,l,c.frame),pt.point);};
  const from=find(src,c.sourceAnchor),to=find(dst,c.targetAnchor),inv=dst.parent?P.inverse(P.world(s,P.findLayer(s,dst.parent),c.frame)):[1,0,0,1,0,0],a=P.pt(inv,from),b=P.pt(inv,to),v=P.effectiveTransform(s,dst,c.frame);P.putKey(dst.keys,c.frame,{x:v.x+a[0]-b[0],y:v.y+a[1]-b[1]},c.ease||'linear');result={residualBefore:Math.hypot(from[0]-to[0],from[1]-to[1])};
 }else if(c.op==='atelier_pose_mark'){check(c.frame<s.duration,'Frame outside shot');const row={id:c.shot+'_'+c.frame,shot:c.shot,frame:c.frame,kind:c.kind,note:c.note};unique(q.poses,row);
 }else if(c.op==='atelier_board_set'){unique(q.boards,{id:c.shot,shot:c.shot,action:c.action,dialogue:c.dialogue||'',cameraIntent:c.cameraIntent||''});
 }else if(c.op==='atelier_light_set'){check(Math.hypot(...c.direction)>.001,'Light direction cannot be zero');unique(q.lights,{id:c.shot,shot:c.shot,direction:clone(c.direction),note:c.note||'',mode:'authored-shading-reference-not-automatic-lighting'});
 }else if(c.op==='atelier_plane_review'){
  const a=P.findAsset(p,c.asset);check(a.kind==='drawing'&&Paint.lineStamp(a)===c.lineHash,'Line fingerprint changed');const meta=markAsset(a);check([...a.shapes,...a.strokes].some(s=>s.plane===c.plane),'No artwork in this shading plane');meta.planes=meta.planes||{};meta.planes[c.plane]={sourceLineHash:c.lineHash,status:'approved',approvedBy:c.reviewer,note:c.note||'',fingerprint:planeFingerprint(p,a,c.plane)};
 }else if(c.op==='atelier_stage_review'){
  const fingerprint=stageFingerprint(p,c.shot,c.stage);check(c.expectedFingerprint===fingerprint,'Stage fingerprint changed; refresh before review');check(c.reviewer.trim(),'Reviewer required');
  if(c.status==='approved'){for(const dep of STAGES[c.stage])check(stageStatus(p,c.shot,dep)==='approved','Upstream '+dep+' is not approved');const blocks=blockingForStage(p,c.shot,c.stage);check(!blocks.length,'Stage blocked: '+blocks.join('; '));}
  const id=c.shot+'_'+c.stage,old=q.reviews.find(r=>r.id===id);unique(q.reviews,{id,shot:c.shot,stage:c.stage,status:c.status,reviewer:c.reviewer,note:c.note||'',fingerprint,history:[...(old?.history||[]),...(old?[{status:old.status,fingerprint:old.fingerprint,reviewer:old.reviewer,note:old.note}]:[])].slice(-24)});
 }else throw Error('Atelier: Unknown operation');
 p.production.minimumEditor='0.6.0';return result;
}
function stageInputs(p,shotId){
 const q=p.production,at=q.atelier||{},shot=q.shots.find(s=>s.id===shotId);check(shot,'Unknown review shot');const used=new Set(shot.layers.flatMap(l=>[l.asset,...l.exposure.map(e=>e.asset)]).filter(Boolean)),assets=q.assets.filter(a=>used.has(a.id)),art=assets.map(content);
 const layers=shot.layers.map(l=>clone(l)),refs=(at.references||[]).map(r=>({...r,assetHash:hash(content(q.assets.find(a=>a.id===r.asset)||{}))}));
 return {lookdev:{characters:at.characters||[],refs,palette:q.palette},board:{boards:(at.boards||[]).filter(x=>x.shot===shotId),duration:shot.duration,fps:p.fps},layout:{camera:shot.camera,layout:shot.layout,positions:layers.map(l=>({id:l.id,parent:l.parent,transform:l.transform,pivot:l.pivot}))},animation:{layers,rigs:shot.rigs,drivers:shot.drivers||[],poses:(at.poses||[]).filter(x=>x.shot===shotId)},cleanup:{lines:assets.filter(a=>a.kind==='drawing').map(a=>({id:a.id,line:Paint.lineData(a)})),rasters:assets.filter(a=>a.kind==='raster').map(content)},paint:{art,palette:q.palette,lights:(at.lights||[]).filter(x=>x.shot===shotId)},background:{assets:shot.layers.filter(l=>l.guide||/back|bg|environment/i.test(l.name)).map(l=>art.find(a=>a.id===l.asset)),layout:shot.layout},composite:{layers,camera:shot.camera,patches:q.patches.filter(x=>x.shot===shotId),background:q.background,width:p.width,height:p.height},sound:q.audio.filter(t=>!t.shot||t.shot===shotId),delivery:{fps:p.fps,frames:p.frames,order:q.shots.map(s=>({id:s.id,duration:s.duration})),notes:(q.notes||[]).filter(n=>n.shot===shotId)}};
}
function stageFingerprint(p,shot,stage){check(Object.hasOwn(STAGES,stage),'Unknown stage');const inputs=stageInputs(p,shot),visit=x=>({stage:x,input:inputs[x],upstream:STAGES[x].map(visit)});return hash(visit(stage));}
function stageStatus(p,shot,stage){const r=p.production.atelier?.reviews.find(r=>r.shot===shot&&r.stage===stage);if(!r)return 'draft';return r.status==='approved'&&r.fingerprint!==stageFingerprint(p,shot,stage)?'needs_review':r.status;}
function planeFingerprint(p,a,plane){const used=new Set([...a.shapes.filter(s=>s.plane===plane).flatMap(s=>[s.fill,s.stroke]),...a.strokes.filter(s=>s.plane===plane).map(s=>s.color)]);const shots=p.production.shots.filter(s=>s.layers.some(l=>l.asset===a.id||l.exposure.some(e=>e.asset===a.id))).map(s=>s.id);return hash({line:Paint.lineStamp(a),art:{shapes:a.shapes.filter(s=>s.plane===plane),strokes:a.strokes.filter(s=>s.plane===plane)},colors:p.production.palette.filter(c=>used.has(c.id)),lights:(p.production.atelier?.lights||[]).filter(l=>shots.includes(l.shot))});}
function blockingForStage(p,shot,stage){const stages=new Set();function walk(x){stages.add(x);STAGES[x].forEach(walk);}walk(stage);const out=[];
 if(stages.has('paint')){const s=p.production.shots.find(s=>s.id===shot),used=new Set(s.layers.flatMap(l=>[l.asset,...l.exposure.map(e=>e.asset)]));for(const a of p.production.assets)if(used.has(a.id)&&a.kind==='drawing'){
  for(const r of a.regions)if(r.atelier&&(r.atelier.status!=='ready'||r.atelier.sourceLineHash!==Paint.lineStamp(a)))out.push(a.id+'/'+r.id+' requires color-region review');
  for(const [plane,rec]of Object.entries(a.atelier?.planes||{}))if(rec.status!=='approved'||rec.sourceLineHash!==Paint.lineStamp(a))out.push(a.id+'/'+plane+' requires shading review');
 }}
 if(stage==='delivery')for(const n of p.production.notes||[])if(n.shot===shot&&n.severity==='blocking'&&n.status==='open')out.push('Open blocking note '+n.id);return out;
}
function pipeline(p,shot){return Object.entries(STAGES).map(([stage,deps])=>({stage,dependencies:deps,status:stageStatus(p,shot,stage),fingerprint:stageFingerprint(p,shot,stage),blocking:blockingForStage(p,shot,stage)}));}
function diagnostics(p){const messages=[];for(const a of p.production.assets)if(a.kind==='drawing'){
 for(const r of a.regions)if(r.atelier&&(r.atelier.status!=='ready'||r.atelier.sourceLineHash!==Paint.lineStamp(a)))messages.push({level:'error',code:'paint_'+r.atelier.status,asset:a.id,region:r.id,detail:'Saved fill is not current. Reseed/rebuild and inspect.'});
 for(const [plane,rec]of Object.entries(a.atelier?.planes||{}))if(rec.status==='stale')messages.push({level:'error',code:'shade_stale',asset:a.id,detail:plane+' depends on an older line version'});
 }
 for(const r of p.production.atelier?.reviews||[])if(stageStatus(p,r.shot,r.stage)==='needs_review')messages.push({level:'warning',code:'approval_stale',detail:r.shot+'/'+r.stage+' needs renewed review'});return messages;
}
function prepareDrawing(a,mode='composite',construction=false){
 if(mode==='composite'&&!construction&&!a.shapes.some(s=>s.plane)&&!a.strokes.some(s=>s.plane)&&!a.regions.some(r=>r.atelier?.status!=='ready'&&r.atelier))return a;
 const out={...a},isPlane=s=>s.plane||'line',pick=s=>mode==='composite'?(construction||!['rough','correction'].includes(isPlane(s))):mode==='flat'||mode==='regions'?isPlane(s)==='line':mode==='line'?isPlane(s)==='line':isPlane(s)===mode;
 out.shapes=a.shapes.filter(pick).map(s=>{if(mode==='line'||mode==='rough'||mode==='correction')return{...s,fill:'none'};if(mode==='flat'||mode==='regions')return {...s,stroke:'none'};return s;});
 out.strokes=['flat','regions'].includes(mode)?[]:a.strokes.filter(pick);
 out.regions=['composite','flat','regions'].includes(mode)?a.regions.filter(r=>!r.atelier||['ready','unverified'].includes(r.atelier.status)&&r.atelier.sourceLineHash===Paint.lineStamp(a)):[];
 return out;
}
function projectView(p,mode='composite',construction=false){if(!p.production)return p;return {...p,production:{...p.production,assets:p.production.assets.map(a=>a.kind==='drawing'?prepareDrawing(a,mode,construction):a)}};}
function impact(before,after,P){
 const aAssets=new Map(before.production.assets.map(a=>[a.id,hash(content(a))])),bAssets=new Map(after.production.assets.map(a=>[a.id,hash(content(a))])),changedAssets=[...new Set([...aAssets.keys(),...bAssets.keys()])].filter(id=>aAssets.get(id)!==bAssets.get(id)),affected=[];
 const palChanged=hash(before.production.palette)!==hash(after.production.palette),allShots=[...new Set([...before.production.shots,...after.production.shots].map(s=>s.id))];
 for(const id of allShots){const a=before.production.shots.find(s=>s.id===id),b=after.production.shots.find(s=>s.id===id);if(!a||!b){affected.push({shot:id,layer:'*',range:[0,(a||b).duration],reasons:['shot added or removed']});continue;}
  const changed=new Set();const reasons=new Map();const add=(id,why)=>{changed.add(id);reasons.set(id,[...(reasons.get(id)||[]),why]);};
  for(const l of b.layers){const old=a.layers.find(x=>x.id===l.id);if(!old||hash(old)!==hash(l))add(l.id,'layer data');if([l.asset,...l.exposure.map(e=>e.asset)].some(id=>changedAssets.includes(id)))add(l.id,'referenced artwork');if(palChanged&&[l.asset,...l.exposure.map(e=>e.asset)].some(id=>after.production.assets.find(a=>a.id===id)?.kind==='drawing'))add(l.id,'palette');}
  const global=hash(a.camera)!==hash(b.camera)||hash(a.layout)!==hash(b.layout)||before.width!==after.width||before.height!==after.height||before.production.background!==after.production.background||a.duration!==b.duration||before.fps!==after.fps||hash(a.layers.map(l=>l.id))!==hash(b.layers.map(l=>l.id))||hash(a.rigs)!==hash(b.rigs)||hash(a.drivers||[])!==hash(b.drivers||[])||hash(before.production.shots.map(s=>({id:s.id,duration:s.duration})))!==hash(after.production.shots.map(s=>({id:s.id,duration:s.duration})))||hash(before.production.patches.filter(p=>p.shot===id))!==hash(after.production.patches.filter(p=>p.shot===id))||after.production.patches.filter(p=>p.shot===id).some(p=>changedAssets.includes(p.image)||changedAssets.includes(p.mask));
  if(global)for(const l of b.layers)add(l.id,'camera/layout/order/patch/output');let grew=true;while(grew){grew=false;for(const l of b.layers){if(changed.has(l.id))continue;if(changed.has(l.parent)||changed.has(l.matte?.layer)||(b.drivers||[]).some(d=>d.target===l.id&&changed.has(d.source))||(l.skin?.bones||[]).some(bone=>changed.has(bone.layer))){add(l.id,'parent/matte/driver/skin dependency');grew=true;}}}
  for(const l of a.layers)if(!b.layers.some(x=>x.id===l.id))add(l.id,'layer removed');for(const layer of changed)affected.push({shot:id,layer,range:[0,Math.max(a.duration,b.duration)],reasons:[...new Set(reasons.get(layer))]});
 }
 const graph=after.production.atelier||before.production.atelier||{parts:[],relationships:[]},partIds=new Set(graph.parts.filter(pt=>affected.some(x=>x.shot===pt.shot&&x.layer===pt.layer)).map(pt=>pt.id)),related=graph.relationships.filter(r=>partIds.has(r.from)||partIds.has(r.to));
 return {changedAssets,affected,related,invalidated:diagnostics(after),rangePolicy:'Conservative whole-shot dependency bounds, not per-pixel motion detection',pixelVerification:'Requires rendered before/after evidence; unchanged source is not a pixel guarantee'};
}
function assertScope(before,after,scope,P){if(!scope)return;check(scope&&typeof scope==='object','Invalid scope');const report=impact(before,after,P),allowed=new Set([...(scope.targets||[]),...(scope.related||[])]),protect=new Set(scope.protect||[]);check(scope.shot&&allowed.size,'Scope requires a shot and target layers');P.findShot(before,scope.shot);for(const layer of [...allowed,...protect])P.findLayer(P.findShot(before,scope.shot),layer);
 for(const row of report.affected){if(row.shot!==scope.shot)throw Error('Atelier: Modification affects another shot '+row.shot);check(!protect.has(row.layer),'Protected layer would be affected: '+row.layer);check(allowed.has(row.layer),'Related layer not authorized: '+row.layer);}
 if(scope.start!==undefined||scope.end!==undefined){check(Number.isInteger(scope.start)&&Number.isInteger(scope.end)&&scope.start>=0&&scope.end>scope.start,'Invalid scoped frame range');const a=P.findShot(before,scope.shot),b=P.findShot(after,scope.shot);check(scope.end<=a.duration&&a.duration===b.duration,'Scoped edit cannot change shot duration');
  function sample(p,s,l,f){const asset=P.displayCel(s,l,f),a=p.production.assets.find(a=>a.id===asset);return hash({asset:asset&&content(a),world:P.world(s,l,f),camera:P.cameraMatrix(p,s,f,l.depth),opacity:P.effectiveTransform(s,l,f).opacity,visible:l.visible,effects:l.effects,palette:p.production.palette});}
  for(const id of allowed){const l=P.findLayer(a,id),r=P.findLayer(b,id);for(let f=0;f<a.duration;f++)if(f<scope.start||f>=scope.end)check(sample(before,a,l,f)===sample(after,b,r,f),'Edit alters evaluated content outside requested frame range');}
 }
}
return {VERSION:'0.6.0-alpha',Paint,PLANES,STAGES,schemas,operations,validateValue,validate,ensure,adopt,content,markAsset,begin,finish,apply,prepareDrawing,projectView,stageFingerprint,stageStatus,pipeline,blockingForStage,diagnostics,impact,assertScope};
});
