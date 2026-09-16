'use strict';
const fs=require('node:fs'),path=require('node:path'),C=require('../public/core.js'),P=C.production,Q=P.Pro,root=path.resolve(__dirname,'..');
const input=process.argv[2]||path.join(root,'examples/pro/ninja-pro.koma.json');
if(!fs.existsSync(input))throw Error('Provide the existing ninja .koma.json source');
const source=JSON.parse(fs.readFileSync(input)),p=C.clone(source);p.name='Shadow Clash / Pro editing study';
// Replace only the first camera move by an editable two-key segment.
const s1=p.production.shots[0];s1.camera.keys=[C.clone(s1.camera.keys[0]),C.clone(s1.camera.keys.at(-1))];
const ses=new C.Session(p);
const changes=[
 {op:'prod_curve_set',shot:s1.id,target:'camera',frame:0,channel:'zoom',curve:[.3,.05,.65,.95]},
 {op:'prod_audio_envelope',id:'wind',keys:[{frame:0,gain:.95,pan:0,ease:'linear'},{frame:18,gain:.62,pan:0,ease:'linear'},{frame:88,gain:.62,pan:0,ease:'linear'},{frame:110,gain:.9,pan:0,ease:'linear'}]},
 {op:'prod_workrange_set',range:{start:24,end:48}},
 {op:'prod_note_set',note:{id:'contact_review',shot:'shot_3',frame:6,layer:'artwork',text:'Inspect blade contact and silhouette without effects. Original raster poses are unchanged; this is not new full-frame animation.',status:'open',severity:'fix',rect:[580,180,310,260]}},
 {op:'prod_note_set',note:{id:'motion_review',shot:'shot_4',frame:10,layer:'ninja',text:'Future art pass: author the missing joint poses instead of relying only on image deformation.',status:'open',severity:'fix',rect:[300,170,500,320]}},
 {op:'prod_note_set',note:{id:'scope',shot:'shot_1',frame:0,layer:null,text:'Pro v0.5 editing study. Original 203 assets retained. No new generated character poses.',status:'resolved',severity:'info',rect:null}}
];ses.apply(changes,0);const ninja=ses.project;
fs.writeFileSync(path.join(root,'examples/pro/ninja-pro.koma.json'),JSON.stringify(ninja));
fs.writeFileSync(path.join(root,'examples/pro/ninja-changes.json'),JSON.stringify(changes,null,2));
const seedHtml=fs.readFileSync(path.join(root,'Koma-Production-Demo.html'),'utf8');
const boot='<script>(async()=>{while(!window.KomaProductionStudio?.ready)await new Promise(r=>setTimeout(r,25));await KomaProductionStudio.load('+JSON.stringify(ninja).replace(/</g,'\\u003c')+');KomaProductionStudio.seek(30);await KomaProDesk.open("review");})()</script>';
fs.writeFileSync(path.join(root,'Koma-Ninja-Pro.html'),seedHtml.replace('</body>',boot+'</body>'));
// Native-cel study based on the existing original LUMEN assets, not imported movie art.
const lab=require('../public/production/demo.js').make();lab.name='Pro Lab / native drawing and controller study';
const sh=lab.production.shots[0],head=sh.layers.find(l=>l.id==='head'),a=P.findAsset(lab,head.asset),b=C.clone(a);b.id='head_revision';b.name='Head / authored endpoint revision';
const node=Q.nodes(b).find(n=>n.type==='path'&&!n.control);if(node)Q.editNode(b,node,[node.x+4,node.y-3]);
lab.production.assets.push(b);const ls=new C.Session(lab);
ls.apply([{op:'prod_drawing_inbetween',shot:sh.id,layer:head.id,from:a.id,to:b.id,prefix:'head_between',start:0,end:12,step:2,replace:true},{op:'prod_workrange_set',range:{start:0,end:16}},{op:'prod_note_set',note:{id:'lab_note',shot:sh.id,layer:head.id,frame:6,text:'Native point correspondence test only. Inspect editability; not a character-turn performance.',status:'open',severity:'info',rect:null}}],0);
fs.writeFileSync(path.join(root,'examples/pro/native-lab.koma.json'),JSON.stringify(ls.project));
console.log(JSON.stringify({ninjaAssets:ninja.production.assets.length,nativeLabAssets:ls.project.production.assets.length,changes:changes.length}));
