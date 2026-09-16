#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),{request}=require('./tools/client.cjs');
(async()=>{
 const [cmd,...args]=process.argv.slice(2);let out;
 if(cmd==='inspect')out=await request('/api/state');
 else if(cmd==='plugins')out=await request('/api/plugins');
 else if(cmd==='checkpoint'){if(!args[0])throw new Error('Checkpoint name required');const state=await request('/api/state');out=await request('/api/checkpoint',{name:args.join(' '),expectedRevision:state.revision});}
 else if(cmd==='restore-checkpoint'){if(!args[0]||args[1]===undefined)throw new Error('Usage: node cli.cjs restore-checkpoint ID EXPECTED_REVISION');out=await request('/api/restore-checkpoint',{id:args[0],expectedRevision:Number(args[1])});}
 else if(cmd==='backup'){if(!args[0])throw new Error('Backup output path required');fs.writeFileSync(args[0],JSON.stringify(await request('/api/snapshot'),null,2),{flag:'wx',mode:0o600});out={saved:path.resolve(args[0])};}
 else if(cmd==='preflight')out=await request('/api/preflight');
 else if(cmd==='queues')out=await request('/api/queue/list');
 else if(cmd==='queue'){if(!args[0])throw Error('Usage: node cli.cjs queue jobs.json');const state=await request('/api/state');out=await request('/api/queue/create',{expectedRevision:state.revision,jobs:JSON.parse(fs.readFileSync(args[0],'utf8'))});}
 else if(cmd==='pause-queue')out=await request('/api/queue/pause',{id:args[0]});
 else if(cmd==='qa')out=await request('/api/qa');
 else if(cmd==='preview'){if(!args[0])throw new Error('Usage: node cli.cjs preview commands.json');const state=await request('/api/state');const content=JSON.parse(fs.readFileSync(args[0],'utf8'));out=await request('/api/preview',{commands:content.commands||content,expectedRevision:state.revision});}
 else if(cmd==='commit'){if(!args[0]||args[1]===undefined)throw new Error('Usage: node cli.cjs commit PLAN_ID EXPECTED_REVISION');out=await request('/api/commit',{planId:args[0],expectedRevision:Number(args[1])});}
 else if(cmd==='seek')out=await request('/api/view',{frame:Number(args[0])});
 else if(cmd==='undo'||cmd==='redo'){const s=await request('/api/state');out=await request('/api/'+cmd,{expectedRevision:s.revision});}
 else if(cmd==='render'){const svg=await request('/api/frame?frame='+Number(args[0]||0));if(args[1]){fs.writeFileSync(args[1],svg);out={saved:path.resolve(args[1])};}else{process.stdout.write(svg);return;}}
 else if(cmd==='export-svg'){const dir=path.resolve(args[0]||'export-svg');fs.mkdirSync(dir,{recursive:true});const s=await request('/api/state'),C=require('./public/core.js');for(let i=0;i<s.project.frames;i++)fs.writeFileSync(path.join(dir,String(i).padStart(4,'0')+'.svg'),C.renderSVG(s.project,i));fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({fps:s.project.fps,frames:s.project.frames,sourceRevision:s.revision},null,2));out={directory:dir,frames:s.project.frames,sourceRevision:s.revision};}
 else throw new Error('Commands: preflight | queues | queue JOBS_JSON | pause-queue ID | inspect | plugins | checkpoint NAME | restore-checkpoint ID REV | backup NEWFILE | qa | preview FILE | commit PLAN REV | seek FRAME | undo | redo | render FRAME [FILE] | export-svg [DIR]. Frames are zero-based.');
 console.log(JSON.stringify(out,null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
