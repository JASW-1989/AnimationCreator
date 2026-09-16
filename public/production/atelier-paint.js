/* Deterministic, bounded native-line region analysis. Original implementation.
 * No canvas, network, trained weights or binary dependencies. Pixel centers are
 * sampled identically by Node and the browser. Unsupported path syntax fails. */
(function(r,f){if(typeof module==='object'&&module.exports)module.exports=f(require('./pro.js'));else r.KomaAtelierPaint=f(r.KomaPro);})(globalThis,function(Pro){
'use strict';
const check=(v,s)=>{if(!v)throw Error('Paint: '+s);}, clone=x=>JSON.parse(JSON.stringify(x));
const mulPoint=(m,p)=>[m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]];
const plane=s=>s.plane||'line';
function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().filter(k=>value[k]!==undefined).map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
function stamp(value){const text=canonical(value);let a=2166136261,b=2246822519;for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b^text.charCodeAt(i),3266489917);}return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');}
function lineData(a){return {width:a.width,height:a.height,shapes:(a.shapes||[]).filter(s=>plane(s)==='line').map(s=>{const x=clone(s);delete x.fill;delete x.stroke;delete x.atelier;delete x.opacity;return x;}),strokes:(a.strokes||[]).filter(s=>plane(s)==='line').map(s=>{const x=clone(s);delete x.color;delete x.atelier;return x;})};}
const lineStamp=a=>stamp(lineData(a));
function flatten(shape){
 let paths=[],path=[],pos=[0,0],start=[0,0];const add=p=>{path.push(p);pos=p;};
 const finish=()=>{if(path.length)paths.push(path);path=[];};
 if(shape.kind==='rect'){const [x,y]=shape.origin,[w,h]=shape.size;paths=[[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]]];}
 else if(shape.kind==='ellipse'){const [x,y]=shape.center,[rx,ry]=shape.radii;paths=[Array.from({length:129},(_,i)=>[x+Math.cos(i*Math.PI/64)*rx,y+Math.sin(i*Math.PI/64)*ry])];}
 else if(shape.kind==='path'){
  for(const seg of Pro.parsePath(shape.d)){const v=seg.values;
   if(seg.cmd==='M'){finish();start=[v[0],v[1]];add(start);}
   else if(seg.cmd==='L')add(v.slice(0,2));
   else if(seg.cmd==='Z')add([...start]);
   else {const p0=pos.slice(),end=v.slice(-2),length=Math.hypot(end[0]-pos[0],end[1]-pos[1])+v.reduce((s,x,i)=>s+(i%2?0:Math.hypot(v[i]-pos[0],v[i+1]-pos[1])),0),count=Math.min(512,Math.max(12,Math.ceil(length/2)));
    for(let i=1;i<=count;i++){const t=i/count,u=1-t;add(seg.cmd==='Q'?[u*u*p0[0]+2*u*t*v[0]+t*t*v[2],u*u*p0[1]+2*u*t*v[1]+t*t*v[3]]:[u*u*u*p0[0]+3*u*u*t*v[0]+3*u*t*t*v[2]+t*t*t*v[4],u*u*u*p0[1]+3*u*u*t*v[1]+3*u*t*t*v[3]+t*t*t*v[5]]);}
   }
  }finish();
 } else throw Error('Paint: Unsupported shape kind');
 return paths.map(path=>shape.matrix?path.map(p=>mulPoint(shape.matrix,p)):path);
}
function rasterBarrier(a,gap=0){
 check(a.kind==='drawing','Native drawing required; trace raster reference on a clean-line layer first');
 const w=a.width,h=a.height;check(Number.isInteger(w)&&Number.isInteger(h)&&w*h<=2097152,'Line-analysis budget is 2,097,152 native pixels');check(Number.isInteger(gap)&&gap>=0&&gap<=3,'Gap closing must be 0..3 native pixels');
 const barrier=new Uint8Array(w*h);let visited=0;
 function segment(p,q,width,erase=false){
  const r=Math.max(.71,width/2),x0=Math.max(0,Math.floor(Math.min(p[0],q[0])-r)),x1=Math.min(w-1,Math.ceil(Math.max(p[0],q[0])+r)),y0=Math.max(0,Math.floor(Math.min(p[1],q[1])-r)),y1=Math.min(h-1,Math.ceil(Math.max(p[1],q[1])+r));
  visited+=(x1-x0+1)*(y1-y0+1);check(visited<64000000,'Line rasterization work budget exceeded');
  const dx=q[0]-p[0],dy=q[1]-p[1],d=dx*dx+dy*dy;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const t=d?Math.max(0,Math.min(1,((x+.5-p[0])*dx+(y+.5-p[1])*dy)/d)):0,ex=x+.5-p[0]-t*dx,ey=y+.5-p[1]-t*dy;if(ex*ex+ey*ey<=r*r)barrier[y*w+x]=erase?0:1;}
 }
 for(const s of a.shapes||[])if(plane(s)==='line')for(const path of flatten(s)){for(let i=1;i<path.length;i++)segment(path[i-1],path[i],s.width||1);}
 for(const s of a.strokes||[])if(plane(s)==='line'){const p=s.points;if(p.length===1)segment(p[0],p[0],s.width*(.15+.85*p[0][2]),s.mode==='erase');for(let i=1;i<p.length;i++)segment(p[i-1],p[i],s.width*(.15+.85*(p[i-1][2]+p[i][2])/2),s.mode==='erase');}
 if(gap){const src=barrier.slice();for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(!src[y*w+x]){let hit=false;for(let d=1;d<=gap;d++){if(x>=d&&x+d<w&&src[y*w+x-d]&&src[y*w+x+d])hit=true;if(y>=d&&y+d<h&&src[(y-d)*w+x]&&src[(y+d)*w+x])hit=true;}if(hit)barrier[y*w+x]=1;}}
 return {width:w,height:h,barrier};
}
function components(a,gap=0){
 const {width:w,height:h,barrier}=rasterBarrier(a,gap),labels=new Int32Array(w*h),queue=new Int32Array(w*h),regions=[];let id=0;
 for(let i=0;i<labels.length;i++){if(barrier[i]||labels[i])continue;id++;let head=0,tail=1,area=0,touches=false,minX=w,minY=h,maxX=0,maxY=0;queue[0]=i;labels[i]=id;
  while(head<tail){const k=queue[head++],x=k%w,y=Math.floor(k/w);area++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);if(!x||!y||x===w-1||y===h-1)touches=true;
   const next=[];if(x)next.push(k-1);if(x<w-1)next.push(k+1);if(y)next.push(k-w);if(y<h-1)next.push(k+w);
   for(const j of next)if(!barrier[j]&&!labels[j]){labels[j]=id;queue[tail++]=j;}
  }regions.push({id,area,touches,bounds:[minX,minY,maxX+1,maxY+1]});
 }
 return {width:w,height:h,labels,regions,lineHash:lineStamp(a),gap};
}
function runsFor(map,id){const runs=[];for(let y=0;y<map.height;y++){let begin=-1;for(let x=0;x<=map.width;x++){const inside=x<map.width&&map.labels[y*map.width+x]===id;if(inside&&begin<0)begin=x;if(!inside&&begin>=0){runs.push([y,begin,x]);begin=-1;}}}return runs;}
function componentAt(map,seed){check(Array.isArray(seed)&&seed.length===2&&seed.every(Number.isFinite),'Seed requires x,y');const x=Math.floor(seed[0]),y=Math.floor(seed[1]);check(x>=0&&y>=0&&x<map.width&&y<map.height,'Seed outside drawing');const id=map.labels[y*map.width+x];check(id>0,'Seed lies on line; choose a point inside the region');const info=map.regions[id-1];check(!info.touches,'Open region reaches image edge; fix the line or reseed');check(info.area>=2,'Region too small');return info;}
function seeded(a,{id,color,seed,gap=0}){const map=components(a,gap),info=componentAt(map,seed);return {id,color,runs:runsFor(map,info.id),atelier:{status:'ready',seed:seed.slice(),gap,sourceLineHash:map.lineHash,algorithm:'native-seed-v1',area:info.area,review:'unreviewed'}};}
function inspect(a){const states=(a.regions||[]).map(r=>({id:r.id,status:r.atelier?.sourceLineHash===lineStamp(a)?r.atelier?.status||'unverified':'stale',color:r.color,seed:r.atelier?.seed||null}));return {lineHash:lineStamp(a),regions:states};}
function rebuild(a,regionIds=null){
 if(regionIds)for(const id of regionIds)check(a.regions.some(r=>r.id===id),'Unknown region '+id);
 const out=clone(a),targets=regionIds?new Set(regionIds):null,maps=new Map(),pending=[],proposals=[];let updated=0;
 for(const r of out.regions){if(targets&&!targets.has(r.id))continue;const meta=r.atelier||{},gap=meta.gap||0;let proposal;
  try{check(meta.seed,'Legacy fill has no seed; use explicit reseed');if(!maps.has(gap))maps.set(gap,components(a,gap));const map=maps.get(gap),info=componentAt(map,meta.seed),hits=new Map();let oldArea=0;
   for(const [y,x,e]of r.runs)for(let xx=x;xx<e;xx++){oldArea++;const label=map.labels[y*map.width+xx];if(label)hits.set(label,(hits.get(label)||0)+1);}
   const overlap=hits.get(info.id)||0,score=overlap/Math.max(1,oldArea+info.area-overlap),significant=[...hits].filter(([id,count])=>!map.regions[id-1].touches&&count>=Math.max(4,oldArea*.08));
   const reasons=[];if(significant.length>1)reasons.push('split');if(score<.55)reasons.push('large_change');
   proposal={runs:runsFor(map,info.id),sourceLineHash:map.lineHash,component:info.id,gap,seed:meta.seed,score,area:info.area,reasons};proposals.push({r,proposal,map});
  }catch(e){r.atelier={...meta,status:'stale',error:e.message};delete r.proposal;pending.push({id:r.id,reason:e.message});}
 }
 // Multiple seeds in the same new region are a merge, even if one fill wasn't
 // selected for rebuild. Never resolve this collision by array order.
 for(const row of proposals){const {r,proposal:v,map}=row;for(const other of out.regions){if(other.id===r.id||!other.atelier?.seed)continue;try{if(componentAt(map,other.atelier.seed).id===v.component)v.reasons.push('merge');}catch{}}
  v.reasons=[...new Set(v.reasons)];v.fingerprint=stamp({asset:a.id,region:r.id,line:v.sourceLineHash,seed:v.seed,runs:v.runs});
  if(!v.reasons.length){r.runs=v.runs;r.atelier={...r.atelier,sourceLineHash:v.sourceLineHash,status:'ready',score:v.score,area:v.area,review:'unreviewed'};delete r.proposal;updated++;}
  else{r.proposal=v;r.atelier={...r.atelier,status:'stale'};pending.push({id:r.id,reason:v.reasons.join(', '),fingerprint:v.fingerprint});}
 }
 return {asset:out,updated,pending};
}
function resolve(a,id,fingerprint){const r=a.regions.find(x=>x.id===id);check(r?.proposal,'No pending region proposal');const v=r.proposal;check(v.fingerprint===fingerprint,'Proposal fingerprint mismatch');check(v.sourceLineHash===lineStamp(a),'Line changed since region proposal');check(!v.reasons.includes('merge'),'Merged region cannot be auto-resolved; remove conflicting assignment and reseed');r.runs=clone(v.runs);r.atelier={...r.atelier,status:'ready',sourceLineHash:v.sourceLineHash,area:v.area,review:'manual_geometry_acceptance'};delete r.proposal;}
return {canonical,stamp,lineStamp,lineData,flatten,rasterBarrier,components,runsFor,componentAt,seeded,inspect,rebuild,resolve};
});
