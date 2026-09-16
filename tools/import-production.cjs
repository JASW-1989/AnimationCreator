#!/usr/bin/env node
/* Local file-to-proposal importer. No shell evaluation and no automatic commit. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{request}=require('./client.cjs'),C=require('../public/core.js'),A=require('../public/production/audio.js'),S=require('../public/production/space.js'),PNG=require('../public/apng.js');
(async()=>{
 const [filename,shotID]=process.argv.slice(2);if(!filename)throw Error('Usage: node tools/import-production.cjs FILE.png|wav|obj [SHOT_ID]. Creates a reviewable proposal, not a commit.');
 const file=path.resolve(filename),stat=fs.statSync(file);if(!stat.isFile()||stat.size>16000000)throw Error('File must be <= 16 MB');
 const b=fs.readFileSync(file),s=await request('/api/state');if(!s.project.production)throw Error('Open a production project first');const p=s.project,q=p.production,shot=q.shots.find(x=>x.id===(shotID||q.shots[0].id));if(!shot)throw Error('Unknown shot ID');
 const id='import_'+crypto.randomBytes(6).toString('hex'),name=path.basename(file).slice(0,100),ext=path.extname(file).toLowerCase(),commands=[];
 if(ext==='.png'){
  const chunks=PNG.parse(new Uint8Array(b)),v=new DataView(chunks[0].data.buffer,chunks[0].data.byteOffset),width=v.getUint32(0),height=v.getUint32(4);const asset={id,name,kind:'raster',width,height,data:'data:image/png;base64,'+b.toString('base64')};const layer=C.production.newLayer(id+'_layer',id,name);commands.push({op:'prod_asset_add',asset},{op:'prod_layer_add',shot:shot.id,value:layer});
 }else if(ext==='.wav'){
  const src=A.decode(new Uint8Array(b)),normalized=A.encode(src.channels,src.rate);commands.push({op:'prod_audio_add',track:{id,name,shot:shot.id,start:0,length:Math.min(shot.duration,Math.max(1,Math.round(src.duration*p.fps))),offset:0,gain:1,pan:0,mute:false,fadeIn:0,fadeOut:0,data:'data:audio/wav;base64,'+A.b64(normalized),peaks:A.peaks(src.channels[0])}});
 }else if(ext==='.obj'){
  commands.push({op:'prod_asset_add',asset:{id,name,kind:'mesh',mesh:S.parseOBJ(b.toString('utf8'))}},{op:'prod_object_add',shot:shot.id,object:{id:id+'_object',name,mesh:id,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],color:'#83b5a7',visible:true,keys:[]}});
 }else throw Error('CLI accepts PNG / PCM WAV / OBJ. Use the UI for safe editable SVG or browser-decoded audio.');
 const plan=await request('/api/preview',{expectedRevision:s.revision,commands});console.log(JSON.stringify({planId:plan.id,baseRevision:plan.baseRevision,assetID:id,importedFile:file,operations:commands.map(x=>x.op),next:'Review in the UI, then: node cli.cjs commit '+plan.id+' '+plan.baseRevision},null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
