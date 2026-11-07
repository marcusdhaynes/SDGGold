/* SDGGold cloud course library: Auth + isolated versioned course endpoint. NO AI calls. */
(function(root,factory){root.SDGCourseCloud=factory(root)})(window,function(root){
"use strict";
const URL="https://tbrqqjrzknhdnwcpkqro.supabase.co";
const PUB="sb_publishable_BlALANbrrBPf_0IHiuL7HQ_55P6XiTS";
let client=null,loading=null,authListeners=[];
function subscribe(callback){authListeners.push(callback);return()=>{authListeners=authListeners.filter(x=>x!==callback)}}
function inform(session){for(const f of authListeners)try{f(session)}catch(e){console.warn("SDGGold auth listener",e)}}
async function getClient(){
 if(client)return client;
 if(!loading)loading=new Promise((resolve,reject)=>{
  if(root.supabase?.createClient){resolve(root.supabase);return}
  const s=document.createElement("script");
  s.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/dist/umd/supabase.min.js";
  s.onload=()=>root.supabase?.createClient?resolve(root.supabase):reject(Error("Authentication library unavailable"));
  s.onerror=()=>reject(Error("Authentication library blocked or offline."));
  document.head.append(s);
 });
 const lib=await loading;
 client=lib.createClient(URL,PUB,{auth:{detectSessionInUrl:true,autoRefreshToken:true,persistSession:true}});
 client.auth.onAuthStateChange((_type,session)=>inform(session));
 return client;
}
async function session(){
 const c=await getClient(),r=await c.auth.getSession();
 if(r.error)throw r.error;
 return r.data.session;
}
async function signIn(){
 const c=await getClient();
 const redirectTo=new URL("./",location.href).href;
 const r=await c.auth.signInWithOAuth({provider:"google",options:{redirectTo}});
 if(r.error)throw r.error;
}
async function signOut(){const c=await getClient(),r=await c.auth.signOut();if(r.error)throw r.error}
async function request(action,params={},body=null,needsAuth=false){
 const u=new URL(URL+"/functions/v1/sdggold-courses");u.searchParams.set("action",action);
 for(const [k,v] of Object.entries(params))if(v!==undefined&&v!==null)u.searchParams.set(k,String(v));
 let token;
 if(needsAuth){const s=await session();token=s?.access_token;if(!token)throw Error("Sign in with Google first.")}
 else try{token=(await session())?.access_token}catch{}
 const opts={method:body==null?"GET":"POST",headers:{"apikey":PUB,"Accept":"application/json"}};
 if(token)opts.headers.Authorization="Bearer "+token;
 if(body!=null){opts.headers["Content-Type"]="application/json";opts.body=JSON.stringify(body)}
 const r=await fetch(u.href,opts);let data;
 try{data=await r.json()}catch{throw Error("Course library returned a non-JSON response (HTTP "+r.status+").")}
 if(!r.ok){const e=new Error(data.error||"Cloud request failed: "+r.status);e.status=r.status;e.details=data;throw e}
 return data;
}
function listPublic(offset=0){return request("list",{scope:"public",offset,limit:30})}
function listMine(offset=0){return request("list",{scope:"mine",offset,limit:50},null,true)}
function load(id){return request("get",{id})}
function revisions(id){return request("revisions",{id},null,true)}
function getRevision(id,version){return request("revision",{id,version},null,true)}
function save(pack,visibility="private",expected_version=null){return request("save",{}, {package:pack,visibility,expected_version},true)}
function remove(id){return request("delete",{}, {id},true)}
return {URL,getClient,session,subscribe,signIn,signOut,listPublic,listMine,load,revisions,getRevision,save,remove};
});
