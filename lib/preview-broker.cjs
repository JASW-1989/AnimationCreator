'use strict';
const crypto=require('node:crypto'),Core=require('../public/core.js');
const digest=p=>crypto.createHash('sha256').update(JSON.stringify(p)).digest('hex');
/** Requests are synchronous from MCP's perspective. A currently open local UI
 * renders the frozen request. No worker means an explicit error, never a fake image. */
class PreviewBroker {
 constructor(){this.jobs=new Map();this.heartbeat=0;}
 async request(session,options){
  session.check(options.expectedRevision);if(Date.now()-this.heartbeat>7000)throw Error('No active local preview worker. Open this server in the Koma browser workspace.');
  if(this.jobs.size>=4)throw Error('Preview queue is full');const project=Core.clone(session.project);if(!project.production)throw Error('Production project required');
  const P=Core.production,opt={frame:options.frame??0,mode:options.mode||'composite',width:options.width||960,height:options.height||540,asset:options.asset||null,crop:options.crop||null,allowedBox:options.allowedBox||null,onion:options.onion||false};
  if(!Number.isInteger(opt.frame)||opt.frame<0||opt.frame>=project.frames)throw Error('Invalid preview frame');if(!['composite','line','flat','rough','correction','shadow','highlight','regions','diff'].includes(opt.mode))throw Error('Invalid preview mode');
  if(!Number.isInteger(opt.width)||!Number.isInteger(opt.height)||opt.width<32||opt.height<32||opt.width>2048||opt.height>2048||opt.width*opt.height>2097152)throw Error('Preview is limited to 2,097,152 output pixels');
  const a=opt.asset?P.findAsset(project,opt.asset):null;if(a&&a.kind==='mesh')throw Error('Select a 2D asset or scene frame');let logical=[a?.width||project.width,a?.height||project.height];
  for(const box of [opt.crop,opt.allowedBox].filter(Boolean)){if(!Array.isArray(box)||box.length!==4||box.some(v=>!Number.isFinite(v))||box[0]<0||box[1]<0||box[2]<=0||box[3]<=0||box[0]+box[2]>logical[0]||box[1]+box[3]>logical[1])throw Error('Invalid preview crop/allowed box');}
  const crop=opt.crop||[0,0,...logical];opt.crop=crop;let comparison=null;
  if(options.planId){const plan=session.plans.get(options.planId);if(!plan||plan.baseRevision!==session.revision)throw Error('Unknown or stale preview plan');comparison=Core.applyCommands(project,plan.commands).project;}
  if(opt.mode==='diff'&&!comparison)throw Error('Difference view needs a reviewed plan ID');
  const id='preview_'+crypto.randomBytes(12).toString('hex'),lease=crypto.randomBytes(16).toString('hex'),metadata={requestId:id,revision:session.revision,sourceHash:digest(project),candidateHash:comparison?digest(comparison):null,frame:opt.frame,asset:opt.asset,space:opt.asset?'asset-local':'scene',crop,output:[opt.width,opt.height],imageToDocument:[crop[2]/opt.width,0,0,crop[3]/opt.height,crop[0],crop[1]],lineHash:a?.kind==='drawing'?P.Atelier.Paint.lineStamp(a):null,mode:opt.mode};
  if(opt.asset){const {shot,local}=P.locate(project,opt.frame),l=shot.layers.find(l=>P.displayCel(shot,l,local)===a.id);if(l)metadata.assetToScene=P.mul(P.cameraMatrix(project,shot,local,l.depth),P.world(shot,l,local));}
  return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{this.jobs.delete(id);reject(Error('Preview worker timeout; no image was produced'));},25000);this.jobs.set(id,{id,lease,project,comparison,options:opt,metadata,claimed:false,resolve,reject,timeout});});
 }
 claim(){this.heartbeat=Date.now();const job=[...this.jobs.values()].find(j=>!j.claimed);if(!job)return {job:null};job.claimed=true;return {job:{id:job.id,lease:job.lease,project:job.project,comparison:job.comparison,options:job.options,metadata:job.metadata}};}
 complete(body){const j=this.jobs.get(body.id);if(!j||j.lease!==body.lease)throw Error('Unknown preview lease');clearTimeout(j.timeout);this.jobs.delete(j.id);
  if(body.error){j.reject(Error('Preview render failed: '+String(body.error).slice(0,300)));return {accepted:false};}
  try{if(typeof body.png!=='string'||body.png.length>16000000||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(body.png))throw Error('Invalid PNG response');const data=Buffer.from(body.png.split(',')[1],'base64');if(data.length<24||data.toString('hex',0,8)!=='89504e470d0a1a0a'||data.readUInt32BE(16)!==j.options.width||data.readUInt32BE(20)!==j.options.height)throw Error('PNG dimensions differ from frozen request');const stats=body.stats||{};j.resolve({metadata:j.metadata,stats,image:{mimeType:'image/png',data:data.toString('base64')},verification:'Rendered by the active local browser; not artistic approval'});return {accepted:true};}catch(e){j.reject(e);throw e;}
 }
 close(){for(const j of this.jobs.values()){clearTimeout(j.timeout);j.reject(Error('Local server stopped'));}this.jobs.clear();}
}
module.exports={PreviewBroker,digest};
