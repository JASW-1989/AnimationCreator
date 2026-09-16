'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
require('./build.cjs');
const base=fs.readFileSync(path.join(root,'Koma-Production-Demo.html'),'utf8');
const boot=`<script>(async()=>{while(!window.KomaProductionStudio?.ready||!document.getElementById("openAtelier"))await new Promise(r=>setTimeout(r,30));await KomaProductionStudio.load(KomaAtelierDemo.make());KomaProductionStudio.selectLayer('arm');await KomaAtelierDesk.open();const el=document.getElementById('atContext');el.value='scene';el.dispatchEvent(new Event('change'));})()</script>`;
fs.writeFileSync(path.join(root,'Koma-Atelier-Study.html'),base.replace('</body>',boot+'</body>'));
// Rebuild the inherited raster project using the current UI without changing its art.
const input=path.join(root,'examples/pro/ninja-pro.koma.json');if(fs.existsSync(input)){
 const ninja=JSON.parse(fs.readFileSync(input,'utf8'));
 const script='<script>(async()=>{while(!window.KomaProductionStudio?.ready||!document.getElementById("openAtelier"))await new Promise(r=>setTimeout(r,30));await KomaProductionStudio.load('+JSON.stringify(ninja).replace(/</g,'\\u003c')+');await KomaAtelierDesk.open();const e=document.getElementById("atContext");e.value="scene";e.dispatchEvent(new Event("change"));})()</script>';
 fs.writeFileSync(path.join(root,'Koma-Ninja-Pro.html'),base.replace('</body>',script+'</body>'));
}
const A=require('../public/production/atelier');fs.writeFileSync(path.join(root,'docs/ATELIER-SCHEMAS.json'),JSON.stringify({version:A.VERSION,commands:A.schemas,stages:A.STAGES,planes:A.PLANES},null,2)+'\n');
console.log('Built current Atelier study, inherited ninja UI and formal schemas.');
