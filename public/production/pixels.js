/* Koma offline image operations. No model, network or third-party runtime. */
(function(r,f){if(typeof module==='object'&&module.exports)module.exports=f();else r.KomaPixels=f();})(globalThis,()=>{
'use strict';
const fail=m=>{throw Error(m);};
function size(w,h,a){if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>16777216||a.length!==w*h*4)fail('Invalid RGBA dimensions');}
function fillRuns(rgba,w,h,x,y,opt={}){
 size(w,h,rgba); x=Math.floor(x);y=Math.floor(y);if(x<0||y<0||x>=w||y>=h)fail('Fill seed out of bounds');
 const threshold=opt.threshold??100,gap=Math.min(4,Math.max(0,opt.gap??0));
 const wall=new Uint8Array(w*h);for(let i=0;i<wall.length;i++){const j=i*4;wall[i]=rgba[j+3]>40&&(rgba[j]*.2126+rgba[j+1]*.7152+rgba[j+2]*.0722)<threshold?1:0;}
 // A small morphological closing bridges gaps without changing original art.
 let mask=wall;
 if(gap){const dil=new Uint8Array(w*h);for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){let v=0;for(let dy=-gap;dy<=gap&&!v;dy++)for(let dx=-gap;dx<=gap;dx++){let a=xx+dx,b=yy+dy;if(a>=0&&b>=0&&a<w&&b<h&&wall[b*w+a]){v=1;break;}}dil[yy*w+xx]=v;}
 mask=new Uint8Array(w*h);for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){let v=1;for(let dy=-gap;dy<=gap&&v;dy++)for(let dx=-gap;dx<=gap;dx++){const a=xx+dx,b=yy+dy;if(a>=0&&b>=0&&a<w&&b<h&&!dil[b*w+a]){v=0;break;}}mask[yy*w+xx]=v;}}
 if(mask[y*w+x])return {runs:[],pixels:0,touchesEdge:false};
 const seen=new Uint8Array(w*h),stack=[y*w+x],runs=[];let pixels=0,touchesEdge=false;
 while(stack.length){const pos=stack.pop(),yy=Math.floor(pos/w),xx=pos%w;if(seen[pos]||mask[pos])continue;let a=xx,b=xx;while(a>0&&!mask[yy*w+a-1]&&!seen[yy*w+a-1])a--;while(b+1<w&&!mask[yy*w+b+1]&&!seen[yy*w+b+1])b++;
  runs.push([yy,a,b+1]);pixels+=b-a+1;if(yy===0||yy===h-1||a===0||b===w-1)touchesEdge=true;
  for(let k=a;k<=b;k++){seen[yy*w+k]=1;if(yy>0&&!mask[(yy-1)*w+k]&&!seen[(yy-1)*w+k])stack.push((yy-1)*w+k);if(yy+1<h&&!mask[(yy+1)*w+k]&&!seen[(yy+1)*w+k])stack.push((yy+1)*w+k);}
 }
 return {runs,pixels,touchesEdge};
}
function grey(a,w,h){size(w,h,a);const v=new Float32Array(w*h);for(let i=0;i<v.length;i++){const j=i*4;v[i]=(a[j]*.2126+a[j+1]*.7152+a[j+2]*.0722)*(a[j+3]/255);}return v;}
// Translation-only, zero-mean normalized cross correlation, explicit confidence gate.
function trackTranslation(prev,next,w,h,box,opt={}){
 size(w,h,prev);size(w,h,next);let {x,y,width:bw,height:bh}=box;x=Math.round(x);y=Math.round(y);bw=Math.round(bw);bh=Math.round(bh);
 if(bw<4||bh<4||x<0||y<0||x+bw>w||y+bh>h)fail('Tracking box invalid');
 const radius=Math.min(48,Math.max(1,opt.radius??12)),step=Math.max(1,Math.ceil(Math.sqrt(bw*bh/1024))),A=grey(prev,w,h),B=grey(next,w,h);let vals=[],sum=0;
 for(let yy=0;yy<bh;yy+=step)for(let xx=0;xx<bw;xx+=step){let v=A[(y+yy)*w+x+xx];vals.push([xx,yy,v]);sum+=v;}
 const mean=sum/vals.length;let variance=0;for(const p of vals){p[2]-=mean;variance+=p[2]*p[2];}if(variance/vals.length<4)return{accepted:false,dx:0,dy:0,confidence:0,margin:0,reason:'textureless'};
 let best=-2,second=-2,bx=0,by=0,scores=[];
 for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){if(x+dx<0||y+dy<0||x+dx+bw>w||y+dy+bh>h)continue;let s=0,ss=0,dot=0;for(const [xx,yy,v]of vals){let z=B[(y+yy+dy)*w+x+xx+dx];s+=z;ss+=z*z;dot+=v*z;}const v=ss-s*s/vals.length,c=v>1?dot/Math.sqrt(variance*v):-1;scores.push([dx,dy,c]);if(c>best+1e-9||(Math.abs(c-best)<1e-9&&dx*dx+dy*dy<bx*bx+by*by)){best=c;bx=dx;by=dy;}}
 for(const [dx,dy,v]of scores)if(Math.abs(dx-bx)>2||Math.abs(dy-by)>2)second=Math.max(second,v);
 const confidence=Math.max(0,Math.min(1,best)),margin=best-second,accepted=confidence>=(opt.threshold??.78)&&margin>=(opt.margin??.015);
 return{accepted,dx:accepted?bx:0,dy:accepted?by:0,confidence,margin,reason:accepted?'matched':(confidence<(opt.threshold??.78)?'low-correlation':'ambiguous')};
}
function composite(base,candidate,mask){if(base.length!==candidate.length||base.length!==mask.length||base.length%4)fail('RGBA lengths differ');const out=new Uint8ClampedArray(base);for(let i=0;i<out.length;i+=4){const m=mask[i+3]/255;if(m===0)continue;const a=base[i+3]/255,b=candidate[i+3]/255,c=a*(1-m)+b*m;out[i+3]=Math.round(c*255);for(let k=0;k<3;k++)out[i+k]=c?Math.round((base[i+k]*a*(1-m)+candidate[i+k]*b*m)/c):0;}return out;}
function pointDistance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l)):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
function strokeHit(s,p,r){if(!s.points?.length)return false;for(let i=1;i<s.points.length;i++)if(pointDistance(p,s.points[i-1],s.points[i])<=r+s.width/2)return true;return Math.hypot(p[0]-s.points[0][0],p[1]-s.points[0][1])<=r+s.width/2;}
return{fillRuns,trackTranslation,composite,strokeHit};});
