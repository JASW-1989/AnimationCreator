'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
class BlobStore{
 constructor(dir){this.dir=dir;fs.mkdirSync(dir,{recursive:true,mode:0o700});}
 file(id){if(!/^[a-f0-9]{64}$/.test(id))throw Error('Invalid blob ID');return path.join(this.dir,id+'.asset');}
 put(data){const id=sha(data),file=this.file(id);if(fs.existsSync(file)){if(sha(fs.readFileSync(file))!==id)throw Error('Existing asset integrity failure');return{$komaBlob:id,length:data.length};}const tmp=file+'.tmp-'+crypto.randomBytes(4).toString('hex');let fd;try{fd=fs.openSync(tmp,'wx',0o600);fs.writeFileSync(fd,data);fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;fs.renameSync(tmp,file);}finally{if(fd!==undefined)fs.closeSync(fd);try{fs.unlinkSync(tmp);}catch{}}return{$komaBlob:id,length:data.length};}
 get(ref){if(!Number.isSafeInteger(ref.length)||ref.length<1||ref.length>24000000)throw Error('Invalid blob length');const file=this.file(ref.$komaBlob);if(fs.statSync(file).size>ref.length*4)throw Error('Blob exceeds declared length');const text=fs.readFileSync(file,'utf8');if(text.length!==ref.length||sha(text)!==ref.$komaBlob)throw Error('Asset checksum mismatch');return text;}
 pack(v){if(typeof v==='string'&&v.length>1024&&/^data:(image\/(png|jpeg|webp)|audio\/wav);base64,/.test(v))return this.put(v);if(Array.isArray(v))return v.map(x=>this.pack(x));if(v&&typeof v==='object'){const o={};for(const [k,x]of Object.entries(v))o[k]=this.pack(x);return o;}return v;}
 unpack(v,cache=new Map(),depth=0){if(depth>40)throw Error('Blob metadata depth');if(v&&typeof v==='object'&&!Array.isArray(v)&&Object.prototype.hasOwnProperty.call(v,'$komaBlob')){if(Object.keys(v).some(k=>!['$komaBlob','length'].includes(k)))throw Error('Invalid blob reference');if(!cache.has(v.$komaBlob))cache.set(v.$komaBlob,this.get(v));return cache.get(v.$komaBlob);}if(Array.isArray(v))return v.map(x=>this.unpack(x,cache,depth+1));if(v&&typeof v==='object'){const o={};for(const [k,x]of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(k))throw Error('Unsafe blob metadata');o[k]=this.unpack(x,cache,depth+1);}return o;}return v;}
}
module.exports={BlobStore,sha};
