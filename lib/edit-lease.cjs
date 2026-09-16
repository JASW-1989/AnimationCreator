'use strict';
const crypto=require('node:crypto');
/** A bounded project-wide write lease, deliberately more conservative than per-cel locks. */
class EditLease {
 constructor(now=()=>Date.now()){this.now=now;this.current=null;}
 live(){if(this.current&&this.current.expiresAt<=this.now())this.current=null;return this.current;}
 status(){const c=this.live();return c?{owner:c.owner,purpose:c.purpose,expiresAt:c.expiresAt,locked:true}:{locked:false};}
 acquire(owner,purpose='',seconds=45){if(typeof owner!=='string'||!owner.trim()||owner.length>100)throw Error('Invalid edit owner');if(typeof purpose!=='string'||purpose.length>200)throw Error('Invalid lease purpose');if(!Number.isFinite(seconds)||seconds<5||seconds>120)throw Error('Lease lifetime is 5..120 seconds');if(this.live())throw Error('Edit lease held by '+this.current.owner);this.current={owner,purpose,key:crypto.randomBytes(24).toString('hex'),expiresAt:this.now()+seconds*1000};return {...this.status(),lease:this.current.key};}
 check(key){const c=this.live();if(c&&key!==c.key)throw Error('Edit lease held by '+c.owner+'; read-only until handoff');}
 renew(key,seconds=45){const c=this.live();if(!c||c.key!==key)throw Error('Lease expired or not owned');if(!Number.isFinite(seconds)||seconds<5||seconds>120)throw Error('Lease lifetime is 5..120 seconds');c.expiresAt=this.now()+seconds*1000;return this.status();}
 release(key){const c=this.live();if(!c)return this.status();if(c.key!==key)throw Error('Lease is owned by another editor');this.current=null;return this.status();}
}
module.exports={EditLease};
