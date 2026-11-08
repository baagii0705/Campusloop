import test from 'node:test';
import assert from 'node:assert/strict';
import {uploadListingImageWithCard} from '../image-upload.mjs';
test('a valid original remains published when the thumbnail upload fails',async()=>{
 const calls=[];const file=new File([Buffer.alloc(120000)],'phone.jpg',{type:'image/jpeg'});
 const bucket={async upload(path,input,options){calls.push({path,input,options});return calls.length===2?{error:Error('thumbnail unavailable')}:{error:null}}};
 await uploadListingImageWithCard(bucket,'new-photo',file);
 assert.deepEqual(calls.map(c=>c.path),['new-photo','new-photo_card']);
 assert.equal(calls[0].input,file);
 assert.ok(calls.every(c=>c.options.upsert===false),'existing images cannot be overwritten');
});
test('original upload errors stop without creating orphan thumbnails',async()=>{
 const failure=Error('permission denied');const calls=[];
 await assert.rejects(()=>uploadListingImageWithCard({async upload(path){calls.push(path);return {error:failure}}},'new-photo',{type:'image/jpeg'}),failure);
 assert.deepEqual(calls,['new-photo']);
});
test('animated photos keep the original without unnecessary derivative upload',async()=>{
 const calls=[];await uploadListingImageWithCard({async upload(path){calls.push(path);return {error:null}}},'animation',{type:'image/gif'});
 assert.deepEqual(calls,['animation']);
});
