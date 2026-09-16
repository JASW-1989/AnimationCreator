#!/usr/bin/env node
/* Portable SVG/WAV handoff; PNG rasterization is provided by the browser workbench. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),C=require('../public/core.js'),A=require('../public/production/audio.js'),crypto=require('node:crypto');
try{
 const [input,out,startArg,endArg]=process.argv.slice(2);if(!input||!out)throw Error('Usage: node tools/render-production.cjs PROJECT.json NEW_OUTPUT_DIR [START] [END_EXCLUSIVE]');
 const p=JSON.parse(fs.readFileSync(input,'utf8'));C.validate(p);if(!p.production)throw Error('Production project required');const start=Number(startArg??0),end=Number(endArg??p.frames);if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end>p.frames||end<=start||end-start>600)throw Error('Use a valid range of <=600 frames');
 const dir=path.resolve(out);fs.mkdirSync(dir,{recursive:false});fs.mkdirSync(path.join(dir,'frames'));const files=[];
 for(let f=start;f<end;f++){const name='frames/'+String(f-start).padStart(6,'0')+'.svg',svg=C.renderSVG(p,f);fs.writeFileSync(path.join(dir,name),svg);files.push({name,sha256:crypto.createHash('sha256').update(svg).digest('hex')});}
 const mix=A.mix(p),first=Math.round(start/p.fps*mix.rate),last=Math.round(end/p.fps*mix.rate);fs.writeFileSync(path.join(dir,'audio.wav'),A.encode(mix.channels.map(c=>c.slice(first,last)),mix.rate));
 const manifest={version:C.VERSION,format:'SVG+WAV',sourceStart:start,sourceEnd:end,width:p.width,height:p.height,fps:p.fps,frames:end-start,sourceSHA256:crypto.createHash('sha256').update(JSON.stringify(p)).digest('hex'),files,aiCalls:0};fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify({directory:dir,frames:files.length,format:'SVG+WAV'}));
}catch(e){console.error(e.message);process.exitCode=1;}
