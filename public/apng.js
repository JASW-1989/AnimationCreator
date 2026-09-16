/* Original APNG assembler: lossless existing PNG IDAT streams, rational frame timing. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.KomaAPNG=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const signature=new Uint8Array([137,80,78,71,13,10,26,10]);
const table=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0;}
function crc(a){let c=0xffffffff;for(const b of a)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function concat(parts){const a=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let off=0;for(const p of parts){a.set(p,off);off+=p.length;}return a;}
const typeBytes=s=>new Uint8Array([...s].map(c=>c.charCodeAt(0)));
function chunk(type,data){const a=new Uint8Array(data.length+12),v=new DataView(a.buffer);v.setUint32(0,data.length);a.set(typeBytes(type),4);a.set(data,8);v.setUint32(data.length+8,crc(a.subarray(4,data.length+8)));return a;}
function parse(bytes){if(!(bytes instanceof Uint8Array)||bytes.length<33||!signature.every((v,i)=>bytes[i]===v))throw new Error('Invalid PNG signature');const result=[];let off=8,ended=false;while(off+12<=bytes.length){const v=new DataView(bytes.buffer,bytes.byteOffset+off,bytes.length-off),n=v.getUint32(0);if(n>bytes.length-off-12)throw new Error('Truncated PNG chunk');const name=String.fromCharCode(...bytes.subarray(off+4,off+8)),data=bytes.slice(off+8,off+8+n),expected=v.getUint32(n+8);if(crc(bytes.subarray(off+4,off+8+n))!==expected)throw new Error('PNG CRC mismatch');result.push({type:name,data});off+=12+n;if(name==='IEND'){ended=true;break;}}if(!ended||off!==bytes.length||result[0]?.type!=='IHDR'||result[0].data.length!==13||!result.some(c=>c.type==='IDAT'))throw new Error('Malformed PNG');return result;}
function assemble(frames,fps,plays=0){if(!Array.isArray(frames)||frames.length<1||frames.length>480)throw new Error('Expected 1..480 PNG frames');if(!Number.isInteger(fps)||fps<1||fps>60||!Number.isInteger(plays)||plays<0||plays>65535)throw new Error('Invalid APNG timing');
 const first=parse(frames[0]),ihdr=first[0].data,v=new DataView(ihdr.buffer,ihdr.byteOffset,ihdr.length),w=v.getUint32(0),h=v.getUint32(4);if(!w||!h||w*h>16777216||ihdr[8]!==8||ihdr[9]!==6)throw new Error('APNG requires 8-bit RGBA PNG frames within 16 megapixels');
 if(frames.reduce((n,f)=>n+f.length,0)>250000000)throw new Error('APNG input exceeds 250 MB budget');
 const out=[signature,chunk('IHDR',ihdr)],actl=new Uint8Array(8),av=new DataView(actl.buffer);av.setUint32(0,frames.length);av.setUint32(4,plays);out.push(chunk('acTL',actl));
 for(const a of first.slice(1)){if(a.type==='IDAT')break;if(['sRGB','gAMA','cHRM','pHYs','iCCP'].includes(a.type))out.push(chunk(a.type,a.data));}
 let seq=0;frames.forEach((bytes,i)=>{const cs=i===0?first:parse(bytes);if(cs.some(c=>['acTL','fcTL','fdAT'].includes(c.type)))throw new Error('Input must be a still PNG');if(!ihdr.every((x,j)=>x===cs[0].data[j]))throw new Error('Frame dimensions/encoding do not match');const control=new Uint8Array(26),cv=new DataView(control.buffer);cv.setUint32(0,seq++);cv.setUint32(4,w);cv.setUint32(8,h);cv.setUint16(20,1);cv.setUint16(22,fps);control[24]=0;control[25]=0;out.push(chunk('fcTL',control));for(const c of cs.filter(c=>c.type==='IDAT')){if(i===0)out.push(chunk('IDAT',c.data));else{const d=new Uint8Array(c.data.length+4);new DataView(d.buffer).setUint32(0,seq++);d.set(c.data,4);out.push(chunk('fdAT',d));}}});out.push(chunk('IEND',new Uint8Array(0)));return concat(out);
}
return {assemble,parse,crc,chunk};
});
