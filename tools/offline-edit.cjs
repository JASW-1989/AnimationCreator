#!/usr/bin/env node
/* Deterministic local project edit. No server, model, subscription or network required. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),C=require('../public/core.js');
try{const [input,commands,output]=process.argv.slice(2);if(!input||!commands||!output)throw new Error('Usage: node tools/offline-edit.cjs PROJECT.json COMMANDS.json NEW_OUTPUT.json');if(fs.existsSync(output))throw new Error('Output exists; use a new filename');const p=JSON.parse(fs.readFileSync(input,'utf8'));C.validate(p);const cmd=JSON.parse(fs.readFileSync(commands,'utf8'));const result=C.applyCommands(p,cmd.commands||cmd);fs.writeFileSync(output,JSON.stringify(result.project,null,2),{flag:'wx'});console.log(JSON.stringify({file:path.resolve(output),changes:result.changes,qa:C.quality(result.project),modelCalls:0},null,2));}catch(e){console.error(e.message);process.exitCode=1;}
