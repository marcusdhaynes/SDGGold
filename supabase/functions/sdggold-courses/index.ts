// SDGGold versioned course library. Deterministic storage only — NO AI/model calls.
// Public READ operations are available anonymously; every WRITE requires verified Supabase Auth.
// All SQL is confined to app_sdggold.course_documents and app_sdggold.course_revisions.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import postgres from "npm:postgres@3.4.5";

const ORIGIN=new Set(["https://marcusdhaynes.github.io","http://localhost:3000","http://localhost:5173","http://127.0.0.1:5500"]);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY=/^[a-z0-9][a-z0-9-]{2,99}$/;
const LIMIT_BYTES=12000000;
function headers(req){const origin=req.headers.get("origin")||"";return {"Access-Control-Allow-Origin":ORIGIN.has(origin)?origin:"https://marcusdhaynes.github.io","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Max-Age":"3600","Vary":"Origin","Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}}
function send(req,status,data){return new Response(JSON.stringify(data),{status,headers:headers(req)})}
let db;
function conn(){const url=Deno.env.get("SUPABASE_DB_URL");if(!url)throw Error("Database connectivity is not configured");return db||(db=postgres(url,{max:2,prepare:false,connect_timeout:6,idle_timeout:20}))}
function apiKey(){
 try{const keys=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}");if(keys.default)return keys.default}catch{}
 return Deno.env.get("SUPABASE_ANON_KEY")||"";
}
async function identity(req){
 const bearer=req.headers.get("authorization")||"";
 if(!bearer.startsWith("Bearer "))return null;
 const key=apiKey(),url=Deno.env.get("SUPABASE_URL");
 if(!key||!url)return null;
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await client.auth.getUser(bearer.slice(7));
 return error?null:data?.user?.id||null;
}
function courseCheck(p){
 if(!p||p.schema!=="sdggold-course-v2"||!p.course||!Array.isArray(p.nodes)||!Array.isArray(p.tracks)||!Array.isArray(p.sources)||!p.coverage||!p.quality)throw Error("Expected a complete SDGGold v2 course package.");
 if(!KEY.test(String(p.course.course_id||""))||typeof p.course.title!=="string"||!p.course.title.trim()||p.course.title.length>200)throw Error("Invalid course identity.");
 if(!Number.isInteger(p.course.revision)||p.course.revision<1)throw Error("Course revision must be a positive integer.");
 if(p.nodes.length<2||p.nodes.length>1000)throw Error("Each course volume needs 2–1,000 validated concepts.");
 if(!p.tracks.length||p.tracks.length>100)throw Error("Course must declare 1–100 distinct tracks.");
 const trackIds=new Set();
 for(const t of p.tracks){
  if(!t||typeof t.id!=="string"||trackIds.has(t.id)||!t.id.trim()||!String(t.title||"").trim()||!String(t.distinctness||"").trim())throw Error("Invalid or duplicate track.");
  trackIds.add(t.id);
 }
 const ids=new Map(),deps=new Set();
 for(const n of p.nodes){
  if(!n||typeof n.id!=="string"||!n.id.trim()||ids.has(n.id)||!n.title||!Number.isInteger(n.tier)||n.tier<0||!Array.isArray(n.prerequisites)||!Array.isArray(n.track_ids)||!n.track_ids.length||n.track_ids.some(t=>!trackIds.has(t)))throw Error("Invalid concept identity, tier, or track.");
  if(typeof n.learn!=="string"||n.learn.trim().length<40||typeof n.example!=="string"||!n.example.trim()||!n.reinforce||!String(n.reinforce.question||"").trim()||!String(n.reinforce.answer||"").trim())throw Error("Missing detailed lesson or recall checkpoint: "+n.id);
  for(const phase of ["practice","test","review"]){
   const q=n[phase];
   if(!q||!String(q.question||"").trim()||!Array.isArray(q.choices)||q.choices.length<2||q.choices.length>8||q.choices.some(x=>typeof x!=="string"||!x.trim())||!Number.isInteger(q.correct)||q.correct<0||q.correct>=q.choices.length||!String(q.explanation||"").trim())throw Error("Missing or malformed "+phase+" checkpoint in "+n.id);
  }
  if(!Array.isArray(n.source_refs)||!Array.isArray(n.outcome_ids))throw Error("Missing sources or outcomes in "+n.id);
  ids.set(n.id,n);
 }
 const roots=[];
 for(const n of p.nodes){
  if(new Set(n.prerequisites).size!==n.prerequisites.length)throw Error("Duplicate prerequisite: "+n.id);
  if(!n.prerequisites.length){if(n.tier!==0)throw Error("A foundation must be in tier 0.");roots.push(n.id)}
  else if(n.tier===0)throw Error("Tier-zero node cannot have prerequisites.");
  for(const id of n.prerequisites){
   const parent=ids.get(id);
   if(!parent||parent.tier>=n.tier)throw Error("Unknown or non-earlier prerequisite: "+n.id+" / "+id);
   deps.add(id);
   if(!n.prerequisite_rationales||!String(n.prerequisite_rationales[id]||"").trim())throw Error("Missing logical prerequisite justification: "+id+" -> "+n.id);
  }
 }
 if(!roots.length)throw Error("No fundamental starting concepts.");
 const ends=p.nodes.filter(n=>!deps.has(n.id));
 if(ends.length!==1||ends[0].id!==p.course.mastery_node_id||ends[0].kind!=="milestone")throw Error("All paths must converge at a single declared mastery milestone.");
 const seen=new Set();
 function visit(id){if(seen.has(id))return;seen.add(id);for(const parent of ids.get(id).prerequisites)visit(parent)}
 visit(ends[0].id);
 if(seen.size!==p.nodes.length)throw Error("One or more concept tracks do not reach the final mastery milestone.");
 return true;
}
const summary=row=>({id:row.id,course_key:row.course_key,title:row.title,description:row.description,visibility:row.visibility,version:row.version,created_at:row.created_at,updated_at:row.updated_at});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:headers(req)});
 if(!["GET","POST"].includes(req.method))return send(req,405,{error:"Unsupported method."});
 const origin=req.headers.get("origin")||"";
 if(origin&&!ORIGIN.has(origin))return send(req,403,{error:"Origin not permitted."});
 try{
  const url=new URL(req.url),action=url.searchParams.get("action")||(req.method==="GET"?"list":"save");
  const uid=await identity(req),sql=conn();
  if(req.method==="GET"&&action==="list"){
   const scope=url.searchParams.get("scope")==="mine"?"mine":"public";
   const take=Math.max(1,Math.min(50,Number(url.searchParams.get("limit")||20)||20));
   const offset=Math.max(0,Math.min(10000,Number(url.searchParams.get("offset")||0)||0));
   if(scope==="mine"&&!uid)return send(req,401,{error:"Sign in to list your courses."});
   const rows=scope==="mine"?
    await sql.unsafe("select id,course_key,title,description,visibility,version,created_at,updated_at from app_sdggold.course_documents where owner_id=$1::uuid order by updated_at desc limit $2 offset $3",[uid,take,offset]):
    await sql.unsafe("select id,course_key,title,description,visibility,version,created_at,updated_at from app_sdggold.course_documents where visibility='public' order by updated_at desc limit $1 offset $2",[take,offset]);
   return send(req,200,{courses:rows.map(summary),next_offset:rows.length===take?offset+take:null});
  }
  if(req.method==="GET"&&action==="get"){
   const id=url.searchParams.get("id")||"";
   if(!UUID.test(id))return send(req,400,{error:"Invalid course ID."});
   const rows=await sql.unsafe("select id,owner_id,course_key,title,description,visibility,version,created_at,updated_at,package from app_sdggold.course_documents where id=$1::uuid",[id]);
   if(!rows.length)return send(req,404,{error:"Course not found."});
   const row=rows[0];
   if(row.visibility==="private"&&row.owner_id!==uid)return send(req,404,{error:"Course not found."});
   return send(req,200,{course:summary(row),package:row.package,can_edit:row.owner_id===uid});
  }
  if(req.method==="GET"&&action==="revisions"){
   const id=url.searchParams.get("id")||"";if(!UUID.test(id)||!uid)return send(req,401,{error:"Owner sign-in required."});
   const owner=await sql.unsafe("select 1 from app_sdggold.course_documents where id=$1::uuid and owner_id=$2::uuid",[id,uid]);
   if(!owner.length)return send(req,404,{error:"Course not found."});
   const rows=await sql.unsafe("select version,saved_at from app_sdggold.course_revisions where course_id=$1::uuid order by version desc limit 100",[id]);
   return send(req,200,{revisions:rows});
  }
  if(req.method==="GET"&&action==="revision"){
   const id=url.searchParams.get("id")||"",version=Number(url.searchParams.get("version")||0);
   if(!UUID.test(id)||!uid||!Number.isInteger(version)||version<1)return send(req,401,{error:"Owner sign-in and valid version required."});
   const owner=await sql.unsafe("select 1 from app_sdggold.course_documents where id=$1::uuid and owner_id=$2::uuid",[id,uid]);
   if(!owner.length)return send(req,404,{error:"Course not found."});
   const revisions=await sql.unsafe("select version,package,saved_at from app_sdggold.course_revisions where course_id=$1::uuid and version=$2",[id,version]);
   return revisions.length?send(req,200,{revision:revisions[0]}):send(req,404,{error:"Revision not found."});
  }
  if(req.method!=="POST")return send(req,400,{error:"Unknown request."});
  if(!uid)return send(req,401,{error:"Sign in with Google to save, update or delete courses."});
  const length=Number(req.headers.get("content-length")||0);
  if(length>LIMIT_BYTES)return send(req,413,{error:"Course package is too large; split it into volumes."});
  const raw=await req.text();if(raw.length>LIMIT_BYTES)return send(req,413,{error:"Course package exceeds 12 MB."});
  let payload;try{payload=JSON.parse(raw)}catch{return send(req,400,{error:"Invalid JSON."})}
  if(action==="save"){
   const pack=payload.package,visibility=payload.visibility||"private",expected=payload.expected_version;
   if(!["private","public","unlisted"].includes(visibility))return send(req,400,{error:"Invalid visibility."});
   try{courseCheck(pack)}catch(e){return send(req,422,{error:"Course validation failed: "+e.message})}
   if(visibility!=="private"&&pack.coverage?.status!=="complete")return send(req,422,{error:"Cannot share a course with incomplete source coverage. Keep it private until reviewed."});
   const key=pack.course.course_id,title=pack.course.title,description=String(pack.course.description||"").slice(0,4000);
   const result=await sql.begin(async tx=>{
    const rows=await tx.unsafe("select id,owner_id,version from app_sdggold.course_documents where owner_id=$1::uuid and course_key=$2 for update",[uid,key]);
    let id,version;
    if(rows.length){
     const row=rows[0];
     if(!Number.isInteger(expected)||expected!==row.version)return {conflict:true,current_version:row.version,id:row.id};
     version=row.version+1;id=row.id;
     await tx.unsafe("update app_sdggold.course_documents set title=$1,description=$2,visibility=$3,version=$4,package=$5::jsonb,updated_at=now() where id=$6::uuid and owner_id=$7::uuid",[title,description,visibility,version,JSON.stringify(pack),id,uid]);
    }else{
     if(expected!=null&&expected!==0)return {conflict:true,current_version:0,id:null};
     const inserted=await tx.unsafe("insert into app_sdggold.course_documents(owner_id,course_key,title,description,visibility,version,package) values($1::uuid,$2,$3,$4,$5,1,$6::jsonb) returning id",[uid,key,title,description,visibility,JSON.stringify(pack)]);
     id=inserted[0].id;version=1;
    }
    await tx.unsafe("insert into app_sdggold.course_revisions(course_id,version,changed_by,package) values($1::uuid,$2,$3::uuid,$4::jsonb)",[id,version,uid,JSON.stringify(pack)]);
    return {id,version,visibility,course_key:key};
   });
   return result.conflict?send(req,409,{error:"Cloud version conflict. Reload or review existing version before updating.",...result}):send(req,200,{saved:true,...result});
  }
  if(action==="delete"){
   const id=String(payload.id||"");if(!UUID.test(id))return send(req,400,{error:"Invalid course ID."});
   const rows=await sql.unsafe("delete from app_sdggold.course_documents where id=$1::uuid and owner_id=$2::uuid returning id",[id,uid]);
   return rows.length?send(req,200,{deleted:true,id}):send(req,404,{error:"Course not found."});
  }
  return send(req,400,{error:"Unknown action."});
 }catch(e){console.error("SDGGold course store:",String(e).slice(0,240));return send(req,503,{error:"SDGGold course storage is temporarily unavailable. No changes were confirmed."})}
});
