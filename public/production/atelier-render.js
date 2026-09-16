/* Local Canvas preview worker. Both UI reviews and MCP images call this module. */
(()=>{'use strict';
const P=KomaCore.production;
async function canvasSVG(svg,w,h){const blob=new Blob([svg],{type:'image/svg+xml'}),url=URL.createObjectURL(blob);try{const im=new Image();im.src=url;await im.decode();const cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.getContext('2d').drawImage(im,0,0,w,h);return cv;}finally{URL.revokeObjectURL(url);}}
async function frame(project,opt){
 let w=project.width,h=project.height,svg;
 if(opt.asset){const a=P.findAsset(project,opt.asset);w=a.width;h=a.height;const art=a.kind==='drawing'?P.drawingSVG(a,new Map(project.production.palette.map(c=>[c.id,c.color])),'preview',{artMode:opt.mode==='diff'?'composite':opt.mode,construction:opt.mode==='rough'||opt.mode==='correction'}):`<image href="${a.data}" width="${w}" height="${h}"/>`;svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${art}</svg>`;
 }else{const mode=opt.mode==='diff'?'composite':opt.mode;svg=P.renderSVG(project,opt.frame,{artMode:mode,construction:mode==='rough'||mode==='correction',noPatches:mode!=='composite',mode:mode==='composite'?'composite':'base'});}
 const native=await canvasSVG(svg,w,h),out=document.createElement('canvas');out.width=opt.width;out.height=opt.height;const ctx=out.getContext('2d'),crop=opt.crop||[0,0,w,h];ctx.drawImage(native,...crop,0,0,out.width,out.height);return out;
}
async function render(job){const opt=job.options,base=await frame(job.project,opt);let stats={};
 if(opt.onion&&opt.asset){const at=P.locate(job.project,opt.frame),l=at.shot.layers.find(l=>P.displayCel(at.shot,l,at.local)===opt.asset);if(l){const ctx=base.getContext('2d');for(const delta of [-l.hold,l.hold])if(at.local+delta>=0&&at.local+delta<at.shot.duration){const id=P.displayCel(at.shot,l,at.local+delta);if(id&&id!==opt.asset){const ghost=await frame(job.project,{...opt,asset:id,mode:'line'});ctx.globalAlpha=.2;ctx.drawImage(ghost,0,0);}}ctx.globalAlpha=1;}}
 if(opt.onion&&!opt.asset){const ctx=base.getContext('2d'),at=P.locate(job.project,opt.frame);for(const delta of [-2,2])if(at.local+delta>=0&&at.local+delta<at.shot.duration){const ghost=await frame(job.project,{...opt,frame:opt.frame+delta,mode:'line'});ctx.globalAlpha=.18;ctx.drawImage(ghost,0,0);}ctx.globalAlpha=1;}
 if(job.comparison){const next=await frame(job.comparison,opt),a=base.getContext('2d').getImageData(0,0,base.width,base.height),b=next.getContext('2d').getImageData(0,0,next.width,next.height),out=base.getContext('2d').createImageData(base.width,base.height),crop=opt.crop||[0,0,job.project.width,job.project.height],allow=opt.allowedBox;let changed=0,inside=0,outside=0,maxDelta=0;
  for(let i=0;i<a.data.length;i+=4){const x=(i/4)%base.width,y=Math.floor(i/4/base.width),dx=crop[0]+(x+.5)*crop[2]/base.width,dy=crop[1]+(y+.5)*crop[3]/base.height,d=Math.max(...[0,1,2,3].map(k=>Math.abs(a.data[i+k]-b.data[i+k])));if(d){changed++;maxDelta=Math.max(maxDelta,d);if(allow&&dx>=allow[0]&&dy>=allow[1]&&dx<allow[0]+allow[2]&&dy<allow[1]+allow[3])inside++;else outside++;}out.data.set(d?[255,75,70,255]:[a.data[i]*.3,a.data[i+1]*.3,a.data[i+2]*.3,255],i);}
  stats={changedPixels:changed,insideAllowed:allow?inside:null,outsideAllowed:allow?outside:null,maxChannelDelta:maxDelta,comparisonSpace:'output-resolution RGBA; no claim about unsampled pixels'};
  if(opt.mode==='diff')base.getContext('2d').putImageData(out,0,0);else base.getContext('2d').drawImage(next,0,0);
 }
 return {png:base.toDataURL('image/png'),stats};
}
let working=false;
async function poll(){const S=window.KomaProductionStudio;if(!S?.ready||!S.isServer||working)return;working=true;try{const {job}=await S.api('atelier/worker');if(job){try{const result=await render(job);await S.api('atelier/render-result',{id:job.id,lease:job.lease,...result});}catch(e){await S.api('atelier/render-result',{id:job.id,lease:job.lease,error:e.message});}}}catch{}finally{working=false;}}
window.KomaAtelierRender={frame,render,poll};setInterval(poll,400);
})();
