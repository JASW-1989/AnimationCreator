/* Deterministic PCM/WAV editing and mixing shared by browser and Node. */
(function(r,f){if(typeof module==='object'&&module.exports)module.exports=f(require('./pro.js'));else r.KomaAudio=f(r.KomaPro);})(globalThis,(Pro)=>{
'use strict';const fail=m=>{throw Error(m);};
function b64(bytes){if(typeof Buffer!=='undefined')return Buffer.from(bytes).toString('base64');let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);}
function fromData(s){if(!/^data:audio\/wav;base64,[A-Za-z0-9+/=]+$/.test(s))fail('Embedded PCM WAV required');const q=s.split(',')[1];return typeof Buffer!=='undefined'?new Uint8Array(Buffer.from(q,'base64')):Uint8Array.from(atob(q),c=>c.charCodeAt(0));}
function encode(channels,rate){if(![1,2].includes(channels.length)||!Number.isInteger(rate)||rate<8000||rate>96000)fail('Invalid audio format');const n=channels[0].length;if(!n||channels.some(c=>c.length!==n)||n*channels.length>24000000)fail('Invalid audio length');const b=new ArrayBuffer(44+n*channels.length*2),v=new DataView(b);function str(o,s){for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));}str(0,'RIFF');v.setUint32(4,b.byteLength-8,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels.length,true);v.setUint32(24,rate,true);v.setUint32(28,rate*channels.length*2,true);v.setUint16(32,channels.length*2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,b.byteLength-44,true);let k=44;for(let i=0;i<n;i++)for(const c of channels){const x=Number.isFinite(c[i])?Math.max(-1,Math.min(1,c[i])):0;v.setInt16(k,Math.round(x*(x<0?32768:32767)),true);k+=2;}return new Uint8Array(b);}
function decode(bytes){const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes),v=new DataView(b.buffer,b.byteOffset,b.byteLength),str=(o,n)=>String.fromCharCode(...b.subarray(o,o+n));if(b.length<44||str(0,4)!=='RIFF'||str(8,4)!=='WAVE')fail('Invalid WAV header');let format,channels,rate,bits,data,align;for(let o=12;o+8<=b.length;){const len=v.getUint32(o+4,true);if(o+8+len>b.length)fail('Truncated WAV chunk');if(str(o,4)==='fmt '){if(len<16)fail('Invalid WAV fmt');format=v.getUint16(o+8,true);channels=v.getUint16(o+10,true);rate=v.getUint32(o+12,true);align=v.getUint16(o+20,true);bits=v.getUint16(o+22,true);}if(str(o,4)==='data')data=[o+8,len];o+=8+len+(len%2);}if(!data||![1,2].includes(channels)||rate<8000||rate>96000||!((format===1&&bits===16)||(format===3&&bits===32))||align!==channels*bits/8)fail('WAV supports mono/stereo PCM16 or float32');const n=data[1]/align;if(!Number.isInteger(n)||n*channels>24000000)fail('WAV frame limit exceeded');const out=Array.from({length:channels},()=>new Float32Array(n));let k=data[0];for(let i=0;i<n;i++)for(let c=0;c<channels;c++){const x=bits===16?v.getInt16(k,true)/32768:v.getFloat32(k,true);out[c][i]=Number.isFinite(x)?x:0;k+=bits/8;}return{channels:out,rate,duration:n/rate};}
function peaks(channel,bins=160){const out=[];for(let i=0;i<bins;i++){let v=0;for(let j=Math.floor(i*channel.length/bins);j<Math.ceil((i+1)*channel.length/bins);j++)v=Math.max(v,Math.abs(channel[j]||0));out.push(v);}return out;}
function shotStart(p,id){let n=0;for(const s of p.production.shots){if(s.id===id)return n;n+=s.duration;}fail('Audio shot anchor not found');}
function mix(p,rate=48000){
 if(!Number.isInteger(rate)||rate<8000||rate>96000)fail('Invalid mix rate');
 const n=Math.round(p.frames/p.fps*rate);if(n*2>24000000)fail('Mix exceeds 12M stereo sample limit');
 const channels=[new Float32Array(n),new Float32Array(n)];
 for(const t of p.production.audio){
  if(t.mute)continue;
  const src=decode(fromData(t.data)),start=((t.shot?shotStart(p,t.shot):0)+t.start)/p.fps;
  const begin=Math.max(0,Math.ceil(start*rate)),end=Math.min(n,Math.ceil((start+t.length/p.fps)*rate));
  const keys=t.automation||[];let keyIndex=-1;
  for(let j=begin;j<end;j++){
   const age=j/rate-start,frame=age*p.fps,pos=(age+t.offset)*src.rate,k=Math.floor(pos),u=pos-k;
   if(k<0||k>=src.channels[0].length)continue;
   while(keyIndex+1<keys.length&&keys[keyIndex+1].frame<=frame)keyIndex++;
   let gain=1,pan=0;
   if(keyIndex>=0){const a=keys[keyIndex],b=keys[keyIndex+1];gain=a.gain;pan=a.pan;
    if(b&&a.ease!=='hold'){const f=(frame-a.frame)/(b.frame-a.frame);gain+=(b.gain-a.gain)*f;pan+=(b.pan-a.pan)*f;}
   }
   pan=Math.max(-1,Math.min(1,t.pan+pan));
   const fade=Math.max(0,Math.min(1,t.fadeIn?age/(t.fadeIn/p.fps):1,t.fadeOut?(t.length/p.fps-age)/(t.fadeOut/p.fps):1));
   const left=t.gain*gain*(pan>0?1-pan:1),right=t.gain*gain*(pan<0?1+pan:1);
   for(let c=0;c<2;c++){const a=src.channels[Math.min(c,src.channels.length-1)],v=a[k]*(1-u)+(a[k+1]??a[k])*u;channels[c][j]+=v*fade*(c===0?left:right);}
  }
 }
 let peak=0,clipped=0;for(const channel of channels)for(const x of channel){peak=Math.max(peak,Math.abs(x));if(Math.abs(x)>1)clipped++;}
 return{channels,rate,peak,clipped,wav:()=>encode(channels,rate)};
}
return{encode,decode,fromData,b64,peaks,mix,shotStart};});
