/* SDGGold Architect: IndexedDB checkpoint store (local only). */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.SDGArchitectStore=api})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const DBNAME="sdggold-architect-v1";
let databasePromise;
function request(r){return new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||Error("IndexedDB request failed"))})}
function db(){
 if(databasePromise)return databasePromise;
 databasePromise=new Promise((resolve,reject)=>{
  if(typeof indexedDB==="undefined"){reject(Error("IndexedDB unavailable in this browser"));return}
  const r=indexedDB.open(DBNAME,1);
  r.onupgradeneeded=()=>{
   const d=r.result;
   if(!d.objectStoreNames.contains("jobs"))d.createObjectStore("jobs",{keyPath:"id"});
   if(!d.objectStoreNames.contains("passages"))d.createObjectStore("passages",{keyPath:["job_id","chunk_id"]});
   if(!d.objectStoreNames.contains("assets"))d.createObjectStore("assets",{keyPath:["job_id","asset_id"]});
  };
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||Error("IndexedDB could not open"));
 });return databasePromise;
}
async function put(store,value){const d=await db();return request(d.transaction(store,"readwrite").objectStore(store).put(value))}
async function get(store,key){const d=await db();return request(d.transaction(store).objectStore(store).get(key))}
async function all(store){const d=await db();return request(d.transaction(store).objectStore(store).getAll())}
async function listPassages(id){const d=await db();return request(d.transaction("passages").objectStore("passages").getAll(IDBKeyRange.bound([id,""],[id,"\uffff"])))}
async function savePassage(id,p){return put("passages",{...p,job_id:id})}
async function saveAsset(id,name,blob){return put("assets",{job_id:id,asset_id:name,blob})}
async function listAssets(id){const d=await db();return request(d.transaction("assets").objectStore("assets").getAll(IDBKeyRange.bound([id,""],[id,"\uffff"])))}
async function removeJob(id){
 const d=await db();
 for(const store of ["passages","assets"]){
  const tx=d.transaction(store,"readwrite"),obj=tx.objectStore(store);
  const range=IDBKeyRange.bound([id,""],[id,"\uffff"]);
  await new Promise((resolve,reject)=>{
   const cursor=obj.openCursor(range);
   cursor.onsuccess=()=>{const c=cursor.result;if(c){c.delete();c.continue()}else resolve()};
   cursor.onerror=()=>reject(cursor.error);
  });
 }
 await request(d.transaction("jobs","readwrite").objectStore("jobs").delete(id));
}
return {db,put,get,all,listPassages,savePassage,saveAsset,listAssets,removeJob};
});
