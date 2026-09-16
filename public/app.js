/* Browser UI. Uses the same Core transaction engine as the local agent service. */
'use strict';
const V=window.KomaVault;
const C=window.KomaCore,$=id=>document.getElementById(id);
const labels={
 openProject:'\u958b\u555f',saveProject:'\u5132\u5b58\u5c08\u6848',openExport:'\u532f\u51fa\u6210\u679c',sceneTitle:'\u93e1\u982d',layersTitle:'\u5716\u5c64',importRaster:'+ \u532f\u5165\u9ede\u9663\u7d20\u6750',localNote:'\u672c\u6a5f\u904b\u4f5c\uff0c\u7121\u9060\u7aef\u4e0a\u50b3\u3002\u5148\u7ba1\u7406\u52d5\u4f5c\uff0c\u518d\u8655\u7406\u88dc\u756b\u3002',stageTitle:'\u8b93\u89d2\u8272\u52d5\u8d77\u4f86\uff0c\u4e0d\u8b93\u7d30\u7bc0\u8dd1\u6389\u3002',fixtureTag:'VECTOR TEST FIXTURE',selectTool:'\u9078\u53d6',maskTool:'\u906e\u7f69',onionLabel:'\u6d0b\u8525\u76ae',compareLabel:'\u4fee\u6539\u524d',renderNote:'\u975e\u7834\u58de\u7de8\u8f2f / \u76f8\u540c\u8cc7\u6599\u3001\u76f8\u540c\u756b\u683c',tabAnimate:'\u52d5\u756b',tabAgent:'\u4ee3\u7406',tabPatch:'\u5c40\u90e8\u4fee\u88dc',selectionLabel:'\u76ee\u524d\u9078\u53d6',exposureLabel:'\u66dd\u5149\u7bc0\u594f',exposureHelp:'2s = \u6bcf\u5f35\u89d2\u8272\u756b\u7a3f\u6301\u7e8c 2 \u500b\u64ad\u653e\u683c\u3002\u80cc\u666f\u4ecd\u53ef\u9023\u7e8c\u79fb\u52d5\u3002',transformLabel:'\u95dc\u9375\u683c / TRANSFORM',easingLabel:'\u63d2\u503c\u65b9\u5f0f',setKey:'\u25c6 \u5beb\u5165\u76ee\u524d\u95dc\u9375\u683c',drawingLabel:'\u756b\u7a3f\u66ff\u63db',motionLabel:'\u8dd1\u6b65\u5faa\u74b0\u53c3\u6578',strideLabel:'\u6b65\u5e45',bounceLabel:'\u8eab\u9ad4\u8d77\u4f0f',tailLabel:'\u5c3e\u5df4\u5f27\u5ea6',cycleLabel:'\u5faa\u74b0\u9577\u5ea6\uff08\u683c\uff09',agentTitle:'\u8b93\u6bcf\u6b21\u4fee\u6539\u90fd\u53ef\u6aa2\u67e5\u3002',agentHelp:'Codex \u53ef\u900f\u904e MCP / CLI \u64cd\u4f5c\u540c\u4e00\u5834\u666f\u3002\u5148\u9810\u89bd\u5dee\u7570\uff0c\u518d\u5957\u7528\uff1b\u820a\u7248\u672c\u63d0\u6848\u6703\u88ab\u62d2\u7d55\u3002',aiStatus:'\u5716\u7247 AI \u672a\u9023\u63a5\uff0c\u4e0d\u6703\u767c\u751f\u8cbb\u7528',commandLabel:'\u7d50\u69cb\u5316\u6307\u4ee4\uff08\u683c\u865f\u5f9e 0 \u958b\u59cb\uff09',previewPlan:'\u9810\u89bd\u63d0\u6848',commitPlan:'\u5957\u7528\u63d0\u6848',qaTitle:'\u5834\u666f\u6aa2\u67e5 / \u975e\u7f8e\u8853\u8a55\u5206',copyState:'\u532f\u51fa\u4ee3\u7406\u72c0\u614b JSON',patchTitle:'\u53ea\u4fee\u6b63\u906e\u7f69\u5167\u7684\u5340\u57df\u3002',patchHelp:'\u532f\u5165\u5df2\u88dc\u756b\u7684\u756b\u683c\uff0c\u900f\u904e\u906e\u7f69\u5408\u6210\u3002\u6b64\u529f\u80fd\u4e0d\u6703\u547c\u53eb\u5716\u7247\u6a21\u578b\u3002',patchStep1:'\u532f\u51fa\u76ee\u524d\u756b\u683c\u4f5c\u70ba\u88dc\u756b\u5e95\u5716\u3002',exportBase:'\u532f\u51fa\u5e95\u5716 PNG',patchStep2:'\u756b\u51fa\u5141\u8a31\u4fee\u6539\u7684\u5340\u57df\u3002',startMask:'\u958b\u59cb\u756b\u906e\u7f69',patchStep3:'\u532f\u5165 960 \u00d7 540 \u4fee\u6b63\u5716\u3002',loadCandidate:'\u9078\u64c7\u4fee\u6b63\u5716',brushLabel:'\u906e\u7f69\u7b46\u5237',clearMask:'\u6e05\u9664\u906e\u7f69',applyPatch:'\u5957\u7528\u5c40\u90e8\u4fee\u88dc',patchWarning:'\u4fee\u88dc\u53ea\u5c6c\u65bc\u76ee\u524d\u756b\u683c\uff0c\u5c1a\u4e0d\u6703\u81ea\u52d5\u8ffd\u8e64\u5230\u76f8\u9130\u756b\u683c\u3002',loopLabel:'\u5faa\u74b0',timelineLabel:'\u6642\u9593\u8ef8 / EXPOSURES',historyTitle:'\u4fee\u6539\u8ecc\u8de1',statusMessage:'\u5df2\u5c31\u7dd2',exportTitle:'\u628a\u6210\u679c\u5e36\u51fa\u5de5\u4f5c\u53f0\u3002',exportHelp:'\u532f\u51fa\u4f7f\u7528\u540c\u4e00\u5834\u666f\u5f15\u64ce\uff0c\u4e0d\u6703\u5305\u542b\u6d0b\u8525\u76ae\u6216\u7de8\u8f2f\u63d0\u793a\u3002',exportPngLabel:'\u76ee\u524d\u756b\u683c',exportSvgLabel:'\u5411\u91cf\u756b\u683c',exportSequenceLabel:'\u5b8c\u6574\u756b\u683c\u5e8f\u5217 + manifest',exportWebmLabel:'\u5373\u6642\u9304\u88fd\u9810\u89bd\u5f71\u7247',exportMp4Note:'\u7cbe\u78ba\u5f71\u7247\u6bcd\u7248\uff1a\u532f\u51fa PNG ZIP\uff0c\u89e3\u58d3\u5f8c\u7528 FFmpeg \u4ee5 manifest \u7684 fps \u7de8\u78bc\u3002WebM \u70ba\u5373\u6642\u9304\u88fd\uff0c\u4e0d\u4fdd\u8b49\u683c\u6642\u9593\u7cbe\u78ba\u3002'
};
for(const [id,t]of Object.entries(labels))if($(id))$(id).textContent=t;
const layerNames={forest:'\u68ee\u6797 / \u80cc\u666f',shadow:'\u63a5\u5730\u9670\u5f71',cat:'Neko / \u89d2\u8272',tail:'\u5c3e\u5df4',hind_far:'\u5f8c\u817f / \u9060\u5074',fore_far:'\u524d\u817f / \u9060\u5074',body:'\u8eab\u9ad4',hind_near:'\u5f8c\u817f / \u8fd1\u5074',fore_near:'\u524d\u817f / \u8fd1\u5074',scarf:'\u9818\u5dfe',head:'\u982d\u90e8 / \u8868\u60c5',foreground:'\u8349\u8449 / \u524d\u666f'};
const drawingNames={open:'\u6b63\u5e38',blink:'\u9589\u773c',alert:'\u5c08\u6ce8',auto:'\u5faa\u74b0',reach:'\u4f38\u5c55',tuck:'\u6536\u817f'};
const ehtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isServer=location.protocol.startsWith('http')&&!!window.KOMA_TOKEN;
let local=new C.Session(),state=local.state(),frame=4,selected='head',playing=false,baseline=null,lastPlan=null,currentTab='animate',exporting=false;
let maskActive=false,maskHasInk=false,maskFrame=frame,maskRevision=0,candidate=null,brush=32,stroke=false,lastPoint=null;
let storageReady=false,transientStorage=false,localMutationQueue=Promise.resolve();
let lastRemoteView=-1,actionQueue=Promise.resolve(),toastTimer;
function notify(msg,error=false){$('toast').textContent=msg;$('toast').classList.toggle('error',error);$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4200);}
async function api(route,body){
 if(isServer){const r=await fetch('/api/'+route,{method:body?'POST':'GET',headers:{'X-Koma-Token':window.KOMA_TOKEN,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw new Error(data.error||'Request failed');return data;}
 if(route==='state')return local.state();
 if(route==='snapshot')return V.snapshot(local);
 if(route==='plugins')return {plugins:C.plugins.catalog(),operations:[...C.plugins.operations,...C.cinema.operations],cinemaExtensions:['Shot Board','Multiplane Camera','Composite Review']};
 if(route==='view')return {view:{frame:body.frame,revision:0}};
 const execute=async()=>{
 if(!storageReady)throw new Error('Local storage is not ready. Existing data will not be overwritten.');
 const draft=V.restore(V.snapshot(local));let out;
 if(route==='preview')out=draft.preview(body.commands,body.expectedRevision);
 else if(route==='commit')out=draft.commit(body.planId,body.expectedRevision);
 else if(route==='command')out=draft.apply(body.commands,body.expectedRevision);
 else if(route==='undo')out=draft.undo(body.expectedRevision);
 else if(route==='redo')out=draft.redo(body.expectedRevision);
 else if(route==='load')out=draft.load(body.project,body.expectedRevision);
 else if(route==='restore-session')out=V.importSnapshot(draft,body.snapshot,body.expectedRevision);
 else if(route==='checkpoint'){V.checkpoint(draft,body.name,body.expectedRevision);out=draft.state();}
 else if(route==='restore-checkpoint')out=V.restoreCheckpoint(draft,body.id,body.expectedRevision);
 else if(route==='remove-checkpoint'){V.removeCheckpoint(draft,body.id,body.expectedRevision);out=draft.state();}
 else throw new Error('Unsupported local operation');
 if(!transientStorage)await V.saveBrowser(V.snapshot(draft));local=draft;return out;
 };
 const result=localMutationQueue.then(execute,execute);localMutationQueue=result.catch(()=>{});return result;

}
function persistLocal(){} // Mutations are persisted transactionally in api(), before publishing state.
function receive(s,remember=true){if(remember&&s.revision!==state.revision)baseline=C.clone(state.project);state=s;if(!state.project.layers.some(l=>l.id===selected))selected='cat';frame=Math.min(frame,state.project.frames-1);lastPlan=null;$('commitPlan').disabled=true;persistLocal();renderAll();window.KomaCinemaUI?.refresh();}
function act(commands){actionQueue=actionQueue.then(async()=>{receive(await api('command',{commands,expectedRevision:state.revision}));}).catch(e=>notify(e.message,true));return actionQueue;}
function showTab(tab){currentTab=tab;for(const name of ['animate','plugins','agent','patch']){$(name+'Panel').classList.toggle('hidden',name!==tab);document.querySelector('[data-tab="'+name+'"]').classList.toggle('active',name===tab);}if(tab!=='patch')setMask(false);}
function clearMask(){const ctx=$('maskCanvas').getContext('2d');ctx.clearRect(0,0,C.W,C.H);maskHasInk=false;candidate=null;$('candidateInfo').textContent='';$('applyPatch').disabled=true;maskFrame=frame;maskRevision=state.revision;}
function setMask(active){maskActive=active;$('maskCanvas').classList.toggle('active',active);$('maskTool').classList.toggle('selected',active);$('selectTool').classList.toggle('selected',!active);if(active){stop();maskFrame=frame;maskRevision=state.revision;}}
let seekTimer;
function seek(f,remote=false){const next=Math.max(0,Math.min(state.project.frames-1,Math.floor(f)));if(next!==frame&&maskHasInk)clearMask();frame=next;renderFrame();renderPlayhead();refreshInspector();window.KomaCinemaUI?.onSeek(frame);if(isServer&&!remote&&!playing){clearTimeout(seekTimer);seekTimer=setTimeout(()=>api('view',{frame}).then(r=>{lastRemoteView=r.view.revision;}).catch(()=>{}),120);}}
function stop(){playing=false;$('play').innerHTML='&#9654;';$('play').setAttribute('aria-label','Play animation');}
let playStart=0,playFrom=0;
function play(){if(playing){stop();return;}setMask(false);playing=true;playStart=performance.now();playFrom=frame;$('play').innerHTML='&#10074;&#10074;';$('play').setAttribute('aria-label','Pause animation');requestAnimationFrame(tick);}
function tick(now){if(!playing)return;let f=playFrom+Math.floor((now-playStart)/1000*state.project.fps);if(f>=state.project.frames){if($('loop').checked)f%=state.project.frames;else{seek(state.project.frames-1);stop();return;}}if(f!==frame){frame=f;renderFrame();renderPlayhead();}requestAnimationFrame(tick);}
function renderFrame(){
 const p=$('compare').checked&&baseline?baseline:state.project;
 $('stage').innerHTML=C.renderSVG(p,Math.min(frame,p.frames-1));
 $('onionStage').innerHTML=$('onion').checked?C.renderSVG(state.project,Math.max(0,frame-state.project.exposureStep),{actorOnly:true})+C.renderSVG(state.project,Math.min(state.project.frames-1,frame+state.project.exposureStep),{actorOnly:true}):'';
 $('canvasFrame').textContent=($('compare').checked?'BEFORE / ':'')+'F '+String(frame+1).padStart(3,'0');
}
function renderPlayhead(){const pct=(frame+.5)/state.project.frames*100;document.querySelectorAll('.playhead').forEach(el=>el.style.left=pct+'%');$('scrubber').value=frame;$('timecode').textContent='00:'+String(Math.floor(frame/state.project.fps)).padStart(2,'0')+':'+String(frame%state.project.fps).padStart(2,'0');}
function renderLayers(){
 $('layers').innerHTML=state.project.layers.map(l=>`<div class="layer ${l.parent?'child':''} ${selected===l.id?'active':''} ${!l.visible?'invisible':''}" data-layer-id="${l.id}" role="listitem"><span class="layer-symbol">${l.type==='group'?'&#9671;':l.type==='raster'?'&#9635;':'&#9672;'}</span><span class="name">${ehtml(layerNames[l.id]||l.name)}</span><button data-visible="${l.id}" aria-label="Toggle visibility ${l.id}" title="Visibility">${l.visible?'&#9673;':'&#9675;'}</button><button class="${l.locked?'is-locked':''}" data-lock="${l.id}" aria-label="Toggle lock ${l.id}" title="Edit lock">${l.locked?'&#9632;':'&#9633;'}</button></div>`).join('');
 $('layerCount').textContent=state.project.layers.length;
 $('layers').querySelectorAll('[data-layer-id]').forEach(el=>el.onclick=()=>{selected=el.dataset.layerId;renderLayers();renderTimeline();refreshInspector();});
 $('layers').querySelectorAll('[data-visible]').forEach(el=>el.onclick=ev=>{ev.stopPropagation();const l=state.project.layers.find(l=>l.id===el.dataset.visible);act([{op:'set_layer',layer:l.id,property:'visible',value:!l.visible}]);});
 $('layers').querySelectorAll('[data-lock]').forEach(el=>el.onclick=ev=>{ev.stopPropagation();const l=state.project.layers.find(l=>l.id===el.dataset.lock);act([{op:'set_layer',layer:l.id,property:'locked',value:!l.locked}]);});
}
function refreshInspector(){
 const l=state.project.layers.find(l=>l.id===selected),v=C.evaluateLayer(l,C.poseAt(state.project,frame).frame);
 $('selectedName').textContent=layerNames[l.id]||l.name;
 for(const [id,val]of [['keyX',v.x],['keyY',v.y],['keyRotation',v.rotation],['keyScale',v.scaleX]])$(id).value=Number(val.toFixed(2));
 $('setKey').disabled=l.locked;$('setKey').textContent=l.locked?'\u6b64\u5716\u5c64\u5df2\u9396\u5b9a':labels.setKey+' / F'+String(frame+1).padStart(3,'0');
 $('exposureButtons').querySelectorAll('button').forEach(el=>el.classList.toggle('active',Number(el.dataset.exposure)===state.project.exposureStep));
 for(const param of ['stride','bounce','tail']){$(param).value=state.project.params[param];$(param+'Value').textContent=state.project.params[param]+(param==='tail'?' deg':' px');}
 $('cycle').value=state.project.params.cycle;
 const ds=C.DRAWINGS[l.id]||[];$('drawingSection').classList.toggle('hidden',!ds.length);
 $('drawingOptions').innerHTML=ds.map(d=>`<button data-drawing="${d}" class="${v.drawing===d?'active':''}">${drawingNames[d]}</button>`).join('');
 $('drawingOptions').querySelectorAll('button').forEach(el=>el.onclick=()=>act([{op:'set_key',layer:selected,frame,values:{drawing:el.dataset.drawing},interpolation:'hold'}]));
}
function renderTimeline(){
 const n=state.project.frames;
 $('ruler').innerHTML=Array.from({length:Math.ceil(n/8)},(_,i)=>`<span style="left:${i*8/n*100}%">${String(i*8+1).padStart(2,'0')}</span>`).join('')+'<div class="playhead"></div>';
 const ids=['cat','head','fore_near','hind_near','tail','scarf',...state.project.layers.filter(l=>l.cels).map(l=>l.id)];
 $('tracks').innerHTML=ids.map(id=>{const l=state.project.layers.find(x=>x.id===id);let cells='';if(l.cels){cells=l.exposures.map(e=>`<div class="cel cel-exposure" title="${ehtml(e.cel)} / ${e.start+1}-${e.end+1}" style="left:${e.start/n*100}%;width:${(e.end-e.start+1)/n*100}%">${ehtml(e.cel)}</div>`).join('');}else for(let i=0;i<n;i+=state.project.exposureStep)cells+=`<div class="cel" style="left:${i/n*100}%;width:${Math.min(state.project.exposureStep,n-i)/n*100}%;opacity:${(Math.floor(i/state.project.params.cycle)%2)?'.55':'1'}"></div>`;return `<div class="track-row ${selected===id?'active':''}"><div class="track-name" data-track-name="${id}">${ehtml(layerNames[id]||l.name)}</div><div class="track" data-track="${id}">${cells}${l.keys.map(k=>`<div class="key-dot" style="left:${(k.frame+.5)/n*100}%" title="Frame ${k.frame+1}"></div>`).join('')}<div class="playhead"></div></div></div>`;}).join('');
 function pick(ev,el){stop();const r=el.getBoundingClientRect();seek((ev.clientX-r.left)/r.width*n);}
 $('ruler').onpointerdown=ev=>pick(ev,$('ruler'));
 $('tracks').querySelectorAll('[data-track]').forEach(el=>el.onpointerdown=ev=>{selected=el.dataset.track;pick(ev,el);renderLayers();renderTimeline();});
 $('tracks').querySelectorAll('[data-track-name]').forEach(el=>el.onclick=()=>{selected=el.dataset.trackName;renderLayers();renderTimeline();refreshInspector();});
 $('scrubber').max=n-1;renderPlayhead();
}
function renderQa(){const q=state.qa, messages={schema:'\u5834\u666f\u683c\u5f0f\u8207\u53c3\u6578\u6aa2\u67e5\u901a\u904e',cycle:q.checks[1].status==='pass'?'\u5faa\u74b0\u76f8\u4f4d\u63a5\u5408\uff08\u975e\u756b\u7d20\u7d1a\u4fdd\u8b49\uff09':'\u5faa\u74b0\u76f8\u4f4d\u4e0d\u9023\u7e8c',transform_loop:q.checks[2].status==='pass'?'\u4f4d\u7f6e\u8207\u8b8a\u5f62\u7aef\u9ede\u4e00\u81f4':'\u90e8\u5206\u95dc\u9375\u683c\u5c1a\u672a\u56de\u5230\u8d77\u9ede',patch_tracking:'\u5c40\u90e8\u88dc\u756b\u70ba\u55ae\u683c\u529f\u80fd\uff0c\u4e0d\u81ea\u52d5\u50b3\u64ad',art_review:'\u6b65\u614b\u3001\u7dda\u689d\u8207\u8868\u6f14\u4ecd\u9700\u8996\u89ba\u5be9\u6838'};$('qaChecks').innerHTML=q.checks.map(c=>`<div class="qa-item" title="${ehtml(c.detail)}"><span class="qa-badge ${c.status}"></span><span>${messages[c.code]}</span></div>`).join('');}
function renderAll(){
 $('projectName').textContent=state.project.name;$('mode').textContent=isServer?'LOCAL BRIDGE':transientStorage?'SESSION ONLY':'OFFLINE';
 $('shotThumb').innerHTML=C.renderSVG(state.project,0);
 $('revision').textContent='r'+String(state.revision).padStart(3,'0');$('undo').disabled=!state.canUndo;$('redo').disabled=!state.canRedo;
 const m=state.qa.metrics;$('exposureSummary').textContent=m.cycleDrawings+' drawings / cycle  |  on '+m.exposureStep+'s';$('stats').textContent=m.layers+' layers  /  '+m.frames+' frames  /  '+m.duration.toFixed(1)+'s';
 $('history').innerHTML=state.log.length?state.log.slice(-3).reverse().map(entry=>`<div class="audit-entry"><b>r${String(entry.revision).padStart(3,'0')} / ${ehtml(entry.actor.toUpperCase())}</b>${ehtml(entry.changes.map(c=>c.target).join(', ')||'History restored')}</div>`).join(''):`<div class="audit-entry empty"><b>BASELINE / r000</b>\u5c1a\u7121\u4fee\u6539\u3002\u6240\u6709\u6307\u4ee4\u90fd\u6703\u7559\u4e0b\u7248\u672c\u8ecc\u8de1\u3002</div><div class="audit-entry empty">\u6b64\u70ba\u5411\u91cf\u52d5\u4f5c\u6280\u8853\u6e2c\u8a66\uff0c\u4e0d\u662f\u624b\u7e6a\u96fb\u5f71\u6210\u54c1\u3002</div>`;
 renderLayers();refreshInspector();renderTimeline();renderFrame();renderQa();
}
function saveBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);}
function saveJson(data,name){saveBlob(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),name);}
async function imageFrom(src){const im=new Image();im.src=src;await im.decode();return im;}
async function frameCanvas(f,p=state.project){const canvas=document.createElement('canvas');canvas.width=C.W;canvas.height=C.H;const src=URL.createObjectURL(new Blob([C.renderSVG(p,f)],{type:'image/svg+xml'}));try{const im=await imageFrom(src);canvas.getContext('2d').drawImage(im,0,0);return canvas;}finally{URL.revokeObjectURL(src);}}
const canvasBlob=(can,type='image/png')=>new Promise((resolve,reject)=>can.toBlob(b=>b?resolve(b):reject(new Error('Canvas export failed')),type));
async function exportPng(){saveBlob(await canvasBlob(await frameCanvas(frame)),'neko-'+String(frame).padStart(4,'0')+'.png');}
function readFile(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});}
const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(a){let c=0xffffffff;for(const b of a)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function zipStored(entries){let offset=0,parts=[],central=[];for(const entry of entries){const name=new TextEncoder().encode(entry.name),data=entry.data,crc=crc32(data),h=new Uint8Array(30+name.length),v=new DataView(h.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);h.set(name,30);parts.push(h,data);const ch=new Uint8Array(46+name.length),cv=new DataView(ch.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);ch.set(name,46);central.push(ch);offset+=h.length+data.length;}
 const size=central.reduce((s,c)=>s+c.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,entries.length,true);ev.setUint16(10,entries.length,true);ev.setUint32(12,size,true);ev.setUint32(16,offset,true);return new Blob([...parts,...central,end],{type:'application/zip'});
}
async function exportSequence(){if(exporting)return;exporting=true;stop();const p=C.clone(state.project),revision=state.revision;const entries=[];try{for(let f=0;f<p.frames;f++){const b=await canvasBlob(await frameCanvas(f,p));entries.push({name:'frames/'+String(f).padStart(4,'0')+'.png',data:new Uint8Array(await b.arrayBuffer())});$('exportProgress').textContent='Rendering '+(f+1)+' / '+p.frames;if(f%8===0)await new Promise(r=>setTimeout(r,0));}entries.push({name:'manifest.json',data:new TextEncoder().encode(JSON.stringify({width:p.width,height:p.height,fps:p.fps,frames:p.frames,sourceRevision:revision,renderer:'koma-'+C.VERSION},null,2))});saveBlob(zipStored(entries),'koma-frames.zip');$('exportProgress').textContent='PNG sequence complete / '+p.frames+' frames';}finally{exporting=false;}}
async function exportWebm(){if(exporting)return;const type=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>window.MediaRecorder&&MediaRecorder.isTypeSupported(t));if(!type)throw new Error('WebM is not supported in this browser. Export PNG ZIP instead.');exporting=true;stop();const p=C.clone(state.project);let stream;try{const canvas=await frameCanvas(0,p),ctx=canvas.getContext('2d');stream=canvas.captureStream(p.fps);const recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:4500000}),parts=[];const done=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data.size)parts.push(e.data);};recorder.onstop=resolve;recorder.onerror=e=>reject(new Error(e.error?.message||'Recording failed'));});recorder.start();const start=performance.now();for(let f=0;f<p.frames;f++){const next=await frameCanvas(f,p);ctx.drawImage(next,0,0);$('exportProgress').textContent='Recording '+(f+1)+' / '+p.frames;await new Promise(r=>setTimeout(r,Math.max(1,start+(f+1)*1000/p.fps-performance.now())));}recorder.stop();await done;saveBlob(new Blob(parts,{type}),'neko-preview.webm');$('exportProgress').textContent='WebM preview complete. Use PNG for frame-accurate mastering.';}finally{stream?.getTracks().forEach(t=>t.stop());exporting=false;}}
function guarded(fn){return async(...args)=>{try{await fn(...args);}catch(e){notify(e.message,true);}};}
$('play').onclick=play;$('previous').onclick=()=>{stop();seek(frame-1);};$('next').onclick=()=>{stop();seek(frame+1);};$('scrubber').oninput=()=>{stop();seek(Number($('scrubber').value));};
$('onion').onchange=renderFrame;$('compare').onchange=()=>{if($('compare').checked&&!baseline)notify('\u5c1a\u7121\u4fee\u6539\u524d\u7684\u7248\u672c');renderFrame();};
$('selectTool').onclick=()=>setMask(false);$('maskTool').onclick=()=>{showTab('patch');setMask(true);};$('startMask').onclick=()=>setMask(true);$('clearMask').onclick=clearMask;
for(const el of document.querySelectorAll('[data-tab]'))el.onclick=()=>{showTab(el.dataset.tab);window.KomaPluginUI?.refresh();};
for(const el of document.querySelectorAll('[data-exposure]'))el.onclick=()=>act([{op:'set_exposure',value:Number(el.dataset.exposure)}]);
for(const el of document.querySelectorAll('[data-param]')){el.oninput=()=>$(el.id+'Value').textContent=el.value;el.onchange=()=>act([{op:'set_param',name:el.dataset.param,value:Number(el.value)}]);}
$('cycle').onchange=()=>act([{op:'set_param',name:'cycle',value:Number($('cycle').value)}]);
$('setKey').onclick=()=>act([{op:'set_key',layer:selected,frame,values:{x:Number($('keyX').value),y:Number($('keyY').value),rotation:Number($('keyRotation').value),scaleX:Number($('keyScale').value),scaleY:Number($('keyScale').value)},interpolation:$('interpolation').value}]);
$('undo').onclick=guarded(async()=>receive(await api('undo',{expectedRevision:state.revision})));$('redo').onclick=guarded(async()=>receive(await api('redo',{expectedRevision:state.revision})));
$('commandJson').value=JSON.stringify([{op:'set_key',layer:'tail',frame:12,values:{rotation:-12},interpolation:'ease'},{op:'set_key',layer:'tail',frame:24,values:{rotation:0},interpolation:'ease'}],null,2);
$('planDiff').textContent='\u63d0\u6848\u4e0d\u6703\u7acb\u5373\u4fee\u6539\u5834\u666f\u3002';
$('previewPlan').onclick=guarded(async()=>{const commands=JSON.parse($('commandJson').value);lastPlan=await api('preview',{commands,expectedRevision:state.revision});$('planDiff').textContent=JSON.stringify({planId:lastPlan.id,baseRevision:lastPlan.baseRevision,changes:lastPlan.changes},null,2);$('commitPlan').disabled=false;notify('\u63d0\u6848\u5df2\u9a57\u8b49\uff0c\u5c1a\u672a\u5957\u7528');});
$('commitPlan').onclick=guarded(async()=>{if(!lastPlan)return;const p=lastPlan;receive(await api('commit',{planId:p.id,expectedRevision:p.baseRevision}));$('planDiff').textContent='Committed / r'+state.revision;notify('\u5df2\u5957\u7528\uff0c\u53ef\u96a8\u6642\u64a4\u92b7');});
$('copyState').onclick=()=>saveJson(state,'koma-agent-state.json');
$('saveProject').onclick=()=>saveJson(state.project,'neko.koma.json');$('openProject').onclick=()=>$('projectFile').click();
$('projectFile').onchange=guarded(async()=>{const f=$('projectFile').files[0];if(!f)return;if(f.size>20000000)throw new Error('Project exceeds 20 MB');const p=JSON.parse(await f.text());C.validate(p);stop();receive(await api('load',{project:p,expectedRevision:state.revision}));clearMask();notify('\u5c08\u6848\u5df2\u8f09\u5165');$('projectFile').value='';});
$('importRaster').onclick=()=>$('rasterFile').click();$('rasterFile').onchange=guarded(async()=>{const f=$('rasterFile').files[0];if(!f)return;if(f.size>4000000)throw new Error('Use a PNG/JPEG/WebP under 4 MB');const data=await readFile(f);await act([{op:'add_raster',name:f.name,data}]);$('rasterFile').value='';});
$('loadCandidate').onclick=()=>$('candidateFile').click();$('candidateFile').onchange=guarded(async()=>{const f=$('candidateFile').files[0];if(!f)return;if(f.size>4000000)throw new Error('Candidate exceeds 4 MB');const data=await readFile(f),im=await imageFrom(data);if(im.width!==C.W||im.height!==C.H)throw new Error('Candidate must be exactly 960 x 540');candidate=data;$('candidateInfo').textContent=f.name+' / F'+(frame+1);$('applyPatch').disabled=!maskHasInk;$('candidateFile').value='';});
$('applyPatch').onclick=guarded(async()=>{if(!candidate||!maskHasInk)return;if(maskFrame!==frame||maskRevision!==state.revision)throw new Error('Scene changed. Redraw the mask against the current frame.');const mask=$('maskCanvas').toDataURL('image/png');await act([{op:'add_patch',frame,image:candidate,mask,source:'manual-import',baseRevision:state.revision}]);clearMask();setMask(false);notify('\u5df2\u5efa\u7acb\u55ae\u683c\u906e\u7f69\u4fee\u88dc');});
$('brushSize').oninput=()=>{brush=Number($('brushSize').value);$('brushValue').textContent=brush+' px';};
function point(ev){const r=$('maskCanvas').getBoundingClientRect();return [(ev.clientX-r.left)/r.width*C.W,(ev.clientY-r.top)/r.height*C.H];}
function paint(a,b){const ctx=$('maskCanvas').getContext('2d');ctx.strokeStyle='#f09975';ctx.fillStyle='#f09975';ctx.lineWidth=brush;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();ctx.beginPath();ctx.arc(b[0],b[1],brush/2,0,Math.PI*2);ctx.fill();maskHasInk=true;$('applyPatch').disabled=!candidate;}
$('maskCanvas').onpointerdown=ev=>{if(!maskActive)return;stroke=true;lastPoint=point(ev);$('maskCanvas').setPointerCapture(ev.pointerId);paint(lastPoint,lastPoint);};$('maskCanvas').onpointermove=ev=>{if(stroke){const p=point(ev);paint(lastPoint,p);lastPoint=p;}};$('maskCanvas').onpointerup=()=>stroke=false;$('maskCanvas').onpointercancel=()=>stroke=false;
$('openExport').onclick=()=>$('exportDialog').showModal();$('closeExport').onclick=()=>$('exportDialog').close();$('exportPng').onclick=guarded(exportPng);$('exportBase').onclick=guarded(exportPng);$('exportSvg').onclick=()=>saveBlob(new Blob([C.renderSVG(state.project,frame)],{type:'image/svg+xml'}),'neko-'+String(frame).padStart(4,'0')+'.svg');$('exportSequence').onclick=guarded(exportSequence);$('exportWebm').onclick=guarded(exportWebm);
window.addEventListener('keydown',ev=>{if(document.getElementById('cinemaWorkspace')&&!document.getElementById('cinemaWorkspace').hidden)return;if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)||$('exportDialog').open)return;if(ev.code==='Space'){ev.preventDefault();play();}if(ev.key==='ArrowRight'){stop();seek(frame+1);}if(ev.key==='ArrowLeft'){stop();seek(frame-1);}if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='z'){ev.preventDefault();(ev.shiftKey?$('redo'):$('undo')).click();}});
new ResizeObserver(()=>{const r=document.querySelector('.viewport').getBoundingClientRect();const st=getComputedStyle(document.querySelector('.viewport'));const w=Math.min(r.width-parseFloat(st.paddingLeft)-parseFloat(st.paddingRight),r.height*16/9);$('stageWrap').style.width=w+'px';$('stageWrap').style.height=w*9/16+'px';}).observe(document.querySelector('.viewport'));
window.KomaStudio={read:()=>C.clone(state),seek:f=>seek(f),preview:commands=>api('preview',{commands,expectedRevision:state.revision}),commit:async(planId,expectedRevision)=>receive(await api('commit',{planId,expectedRevision})),commands:act,renderSVG:f=>C.renderSVG(state.project,f),frameData:async f=>(await frameCanvas(f)).toDataURL('image/png'),showTab,stop,zipStored,load:async p=>receive(await api('load',{project:p,expectedRevision:state.revision}))};
(async()=>{
 try{
  if(isServer){state=await api('state');lastRemoteView=state.view.revision;storageReady=true;}
  else if(window.KOMA_DEMO_ONLY){transientStorage=true;storageReady=true;}
  else{
   let saved;
   try{saved=await V.loadBrowser();}
   catch(e){if(e.name==='SecurityError'||/IndexedDB unavailable|denied|not allowed/i.test(e.message)){transientStorage=true;storageReady=true;notify('Browser storage unavailable. Session-only mode: export a backup before closing.',true);}else throw e;}
   if(saved){local=V.restore(saved.snapshot);state=local.state();if(saved.recovered)notify('Recovered the previous browser snapshot. Latest changes may be missing.',true);}
   else if(!transientStorage){let legacy;try{legacy=localStorage.getItem('koma.scene.v1');}catch{}if(legacy){local=new C.Session(JSON.parse(legacy));state=local.state();await V.saveBrowser(V.snapshot(local));}}
   storageReady=true;
  }
  renderAll();
  if(isServer)setInterval(async()=>{if(exporting)return;try{const s=await api('state');if(s.revision!==state.revision)receive(s);if(s.view.revision!==lastRemoteView){lastRemoteView=s.view.revision;if(!playing)seek(s.view.frame,true);}}catch{}},900);
 }catch(e){notify(e.message,true);renderAll();}
})();
