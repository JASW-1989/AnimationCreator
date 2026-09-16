/* Two-anchor similarity tracking. Deliberately bounded: no optical flow,
 * perspective reconstruction or automatic occlusion recovery. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.KomaTrack=factory();})(globalThis,()=>{
'use strict';
const fail=s=>{throw Error('Track: '+s);};
function gray(a,w,h){if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>16777216||a.length!==w*h*4)fail('Invalid dimensions');const g=new Float32Array(w*h);for(let i=0;i<g.length;i++)g[i]=(a[i*4]*.2126+a[i*4+1]*.7152+a[i*4+2]*.0722)*a[i*4+3]/255;return g;}
function sample(g,w,h,x,y){if(x<0||y<0||x>=w-1||y>=h-1)return null;const ix=Math.floor(x),iy=Math.floor(y),u=x-ix,v=y-iy,k=iy*w+ix;return g[k]*(1-u)*(1-v)+g[k+1]*u*(1-v)+g[k+w]*(1-u)*v+g[k+w+1]*u*v;}
function matchAnchor(A,B,w,h,reference,predicted,rotation=0,scale=1,opt={}){
 const radius=opt.radius??16,half=opt.half??5,threshold=opt.threshold??.8,marginThreshold=opt.margin??.025;
 if(!Number.isInteger(radius)||radius<1||radius>48||!Number.isInteger(half)||half<2||half>12)fail('Search bounds invalid');
 let vals=[],sum=0,ss=0;const rad=rotation*Math.PI/180,co=Math.cos(rad)*scale,si=Math.sin(rad)*scale;
 for(let y=-half;y<=half;y++)for(let x=-half;x<=half;x++){const a=sample(A,w,h,reference[0]+x,reference[1]+y);if(a===null)return{accepted:false,reason:'reference-out-of-bounds',confidence:0};vals.push([x,y,a]);sum+=a;ss+=a*a;}
 const mean=sum/vals.length,variance=ss-sum*sum/vals.length;
 if(variance/vals.length<4)return{accepted:false,reason:'textureless',confidence:0};
 vals=vals.map(([x,y,a])=>[co*x-si*y,si*x+co*y,a-mean]);
 function corr(x,y){let sm=0,sq=0,dot=0;for(const [dx,dy,a]of vals){const b=sample(B,w,h,x+dx,y+dy);if(b===null)return -2;sm+=b;sq+=b*b;dot+=a*b;}const v=sq-sm*sm/vals.length;return v>1?dot/Math.sqrt(variance*v):-2;}
 const scores=[];let best=-2,bx=predicted[0],by=predicted[1];
 for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
  const x=Math.round(predicted[0])+dx,y=Math.round(predicted[1])+dy,c=corr(x,y);scores.push([x,y,c]);
  if(c>best+1e-10){best=c;bx=x;by=y;}
 }
 let second=-2;for(const [x,y,c]of scores)if(Math.abs(x-bx)>2||Math.abs(y-by)>2)second=Math.max(second,c);
 // Parabolic subpixel peak, only after a valid local maximum.
 const fit=(l,c,r)=>{const den=l-2*c+r;return den<-.00001?Math.max(-.75,Math.min(.75,.5*(l-r)/den)):0;};
 if(best>-.5){bx+=fit(corr(bx-1,by),best,corr(bx+1,by));by+=fit(corr(bx,by-1),corr(bx,by),corr(bx,by+1));}
 const confidence=Math.max(0,Math.min(1,best)),margin=best-second;
 const accepted=confidence>=threshold&&margin>=marginThreshold;
 return{accepted,point:[bx,by],confidence,margin,reason:accepted?'matched':confidence<threshold?'low-correlation':'ambiguous'};
}
function solve(reference,observed){
 if(reference.length!==2||observed.length!==2)fail('Two anchor pairs required');
 const [a,b]=reference,[c,d]=observed,ux=b[0]-a[0],uy=b[1]-a[1],vx=d[0]-c[0],vy=d[1]-c[1],den=ux*ux+uy*uy;
 if(den<36)fail('Tracking anchors must be at least six pixels apart');
 const co=(ux*vx+uy*vy)/den,si=(ux*vy-uy*vx)/den,scale=Math.hypot(co,si),rotation=Math.atan2(si,co)*180/Math.PI;
 return{matrix:[co,si,-si,co,c[0]-co*a[0]+si*a[1],c[1]-si*a[0]-co*a[1]],scale,rotation};
}
const point=(m,p)=>[m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]];
function trackSimilarity(reference,next,w,h,box,previous=null,opt={}){
 const A=gray(reference,w,h),B=gray(next,w,h),anchors=opt.anchors||[[box.x+box.width*.25,box.y+box.height*.5],[box.x+box.width*.75,box.y+box.height*.5]];
 if(anchors.length!==2||anchors.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v))))fail('Invalid anchors');
 let transform=previous||{matrix:[1,0,0,1,0,0],rotation:0,scale:1},matches=[];
 for(let pass=0;pass<2;pass++){
  matches=anchors.map(a=>matchAnchor(A,B,w,h,a,point(transform.matrix,a),transform.rotation,transform.scale,{...opt,radius:pass===0?(opt.radius??16):3}));
  if(matches.some(m=>!m.accepted))return{accepted:false,confidence:Math.min(...matches.map(m=>m.confidence)),reason:matches.find(m=>!m.accepted).reason,matches};
  transform=solve(anchors,matches.map(m=>m.point));
 }
 const relative=previous?transform.scale/previous.scale:transform.scale;let delta=transform.rotation-(previous?.rotation||0);delta=((delta+540)%360)-180;
 if(transform.scale<.1||transform.scale>10||relative<(opt.minStepScale??.7)||relative>(opt.maxStepScale??1.4)||Math.abs(delta)>(opt.maxStepRotation??25))return{accepted:false,confidence:Math.min(...matches.map(m=>m.confidence)),reason:'transform-jump',matches};
 const origin=point(transform.matrix,[box.x,box.y]);return{...transform,x:origin[0],y:origin[1],accepted:true,confidence:Math.min(...matches.map(m=>m.confidence)),reason:'two-anchor-match',matches};
}
return{gray,sample,matchAnchor,solve,point,trackSimilarity};
});
