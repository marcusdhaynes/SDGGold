/* Integrated SDGGold Curriculum Architect UI. No direct cross-app database calls. */
(function(root){
"use strict";
const C=root.SDGArchitectCore,S=root.SDGArchitectStore,P=root.SDGArchitectPipeline,I=root.SDGArchitectImport;
const BASE="https://tbrqqjrzknhdnwcpkqro.supabase.co",PUBLISHABLE="sb_publishable_BlALANbrrBPf_0IHiuL7HQ_55P6XiTS";
const $=id=>document.getElementById(id);
let pane,job=null,jobs=[],auth=null,session=null,working=false,pausing=false,initialized=false;
const txt=(id,s)=>{const e=$(id);if(e)e.textContent=String(s??"")};
const make=(tag,value,cls)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);return e};
function status(message,isError=false){const box=$("arch-message");if(box){box.textContent=message;box.classList.toggle("error",isError)}}
async function initialize(){
 if(initialized)return;initialized=true;
 pane=document.createElement("section");pane.id="architectScreen";pane.className="architect-screen";
 const response=await fetch("./architect-panel.html");if(!response.ok)throw Error("Architect interface failed to load.");
 pane.innerHTML=await response.text();document.querySelector(".stage").append(pane);
 bind();await loadJobs();await syncAuth();
}
async function loadJobs(){
 jobs=(await S.all("jobs")).sort((a,b)=>b.updated.localeCompare(a.updated));
 if(!job&&jobs.length)job=jobs[0];
 if(!job){job=P.createJob("New Course");await P.save(job);jobs=[job]}
 await render();
}
async function createProject(){
 if(working)return;
 const name=prompt("Name your new course","New Course");if(name===null)return;
 job=P.createJob(name.trim()||"New Course");await P.save(job);await refresh();
}
async function persistTitle(){if(!job)return;job.title=$("arch-title").value.trim()||"New Course";await P.save(job)}
async function importFiles(files){
 if(working)return;const list=Array.from(files||[]);if(!list.length)return;
 try{
  await persistTitle();
  for(const [i,file] of list.entries()){
   status("Importing "+(i+1)+"/"+list.length+": "+file.name);
   try{await I.addFile(job,file,message=>status(message))}
   catch(e){job.packet.gaps.push({record_type:"gap",gap_id:"FILE-"+Date.now()+"-"+i,source_id:file.name,locator:"file",severity:"high",kind:"extraction_failure",description:e.message||String(e)})}
   await P.save(job);
  }
  status("Imported "+list.length+" file(s). Check the quality report for gaps.");
  await refresh();
 }catch(e){status("Import failed: "+e.message,true)}
}
async function paste(isPacket){
 if(working)return;const contents=$("arch-paste").value;if(!contents.trim())return status("Paste course content first.",true);
 try{
  await persistTitle();
  if(isPacket){await I.addRecords(job,C.packetRecords(contents,"pasted records"),"pasted records");
   const m=job.packet.manifests[0];if(m?.course_title&&job.title==="New Course")job.title=m.course_title;
  }else await I.addText(job,"Pasted Notes "+new Date().toISOString(),contents,"paste","user text");
  job.phase="collect";$("arch-paste").value="";await P.save(job);
  status(isPacket?"Preprocessor records imported successfully.":"Pasted text chunked and stored locally.");
  await refresh();
 }catch(e){status("Could not import: "+e.message,true)}
}
async function webpage(){
 const url=$("arch-web").value.trim();if(!url||working)return;
 try{await persistTitle();await I.addURL(job,url,status);$("arch-web").value="";await P.save(job);await refresh();status("Website inspected. Unreadable sections appear as source gaps.")}
 catch(e){status("Website import: "+e.message,true)}
}
async function loadAuth(){
 if(auth)return auth;
 if(!root.supabase?.createClient)await new Promise((resolve,reject)=>{
  const script=document.createElement("script");script.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/dist/umd/supabase.min.js";
  script.onload=resolve;script.onerror=()=>reject(Error("Google authentication library failed to load."));document.head.append(script);
 });
 if(!root.supabase?.createClient)throw Error("Supabase sign-in library unavailable.");
 auth=root.supabase.createClient(BASE,PUBLISHABLE,{auth:{detectSessionInUrl:true,autoRefreshToken:true,persistSession:true}});
 auth.auth.onAuthStateChange((type,newSession)=>{session=newSession;renderAuth()});
 return auth;
}
async function syncAuth(){
 try{const c=await loadAuth();const r=await c.auth.getSession();session=r.data.session||null;renderAuth()}
 catch(e){txt("arch-auth-detail","Authentication not available: "+e.message)}
}
async function login(){
 try{const c=await loadAuth();status("Opening Google sign-in...");
  const {error}=await c.auth.signInWithOAuth({provider:"google",options:{redirectTo:new URL("./",location.href).href}});
  if(error)throw error;
 }catch(e){status("Google sign-in unavailable: "+e.message+". Configure Google as a Supabase Auth provider and allow the GitHub Pages redirect URL.",true)}
}
async function logout(){if(auth)await auth.auth.signOut();session=null;renderAuth()}
function renderAuth(){
 const badge=$("arch-auth-badge");if(!badge)return;
 badge.textContent=session?"Google Connected":"Not signed in";badge.className="architect-badge "+(session?"good":"warn");
 txt("arch-auth-detail",session?"Signed in as "+(session.user?.email||"an authenticated user")+". AI calls incur API charges.":"Offline preparation is available. To enable AI calls, configure Supabase Google login and its server-side OpenAI key.");
 $("arch-login").hidden=!!session;$("arch-logout").hidden=!session;
}
async function invoke(mode,payload){
 const c=await loadAuth(),s=(await c.auth.getSession()).data.session;
 if(!s?.access_token)throw Error("Google sign-in is required; no content has been sent.");
 const response=await fetch(BASE+"/functions/v1/sdggold-architect",{method:"POST",headers:{"Content-Type":"application/json",apikey:PUBLISHABLE,Authorization:"Bearer "+s.access_token},body:JSON.stringify({mode,payload})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||"AI request failed (HTTP "+response.status+").");
 return data;
}
async function generate(){
 if(working)return;
 try{
  await persistTitle();
  if(job.phase==="ready"||job.phase==="draft"){
   if(!confirm("Rerun the AI pipeline? Previous generated lessons will be replaced, and the process may incur usage charges."))return;
   Object.assign(job,{phase:"collect",extractQueue:null,extractIndex:0,planIndex:0,bridgeIndex:0,authorIndex:0,imageIndex:0,candidates:null,relations:[],graph:null,course:null,report:null,error:""});
  }
  const c=await loadAuth(),s=(await c.auth.getSession()).data.session;
  if(!s)throw Error("Google sign-in is required for AI processing. You can import preprocessed JSONL and build a clearly labeled local draft without it.");
  const passages=await S.listPassages(job.id),assets=await S.listAssets(job.id);
  if(!passages.length&&!job.packet.concepts.length&&!assets.length)throw Error("First import readable course material.");
  const unexplained=passages.filter(p=>!job.packet.concepts.some(c=>(c.source_chunks||[]).includes(p.chunk_id))).length;
  const minimum=unexplained+assets.length+Math.ceil(Math.max(1,job.packet.concepts.length)/28)+Math.ceil(Math.max(1,job.packet.concepts.length)/2);
  if(!confirm("Send selected source excerpts and queued images to the configured AI provider? This may incur API charges. "+
   "The current project has "+passages.length+" text passages, "+assets.length+" images, and "+job.packet.concepts.length+" preprocessed concept candidates. "+
   "Estimated MINIMUM AI calls at current size: "+minimum+" (the final count may be much higher as new concepts are extracted). "+
   "You may pause between calls; progress remains local. Continue?"))return;
  working=true;pausing=false;await P.save(job);$("arch-pause").disabled=false;await render();
  await P.aiRun(job,{invoke},()=>render(),()=>pausing);
  if(job.phase==="ready")status("AI curriculum generated. Examine the quality report, review questionable paths, then install it in your learning tree.");
  else status(job.status);
 }catch(e){status("AI processing paused at saved checkpoint: "+e.message,true)}
 finally{working=false;$("arch-pause").disabled=true;await refresh()}
}
async function localDraft(){
 if(working)return;
 try{
  await persistTitle();P.draft(job);
  const passages=await S.listPassages(job.id);
  if(job.graph)job.report=C.audit({...job.packet,passages},job.graph,job.course);
  if(job.report){job.report.ready_for_publication=false;job.report.issues.unshift({severity:"high",code:"ai_not_run",detail:"Local draft bypassed semantic AI planning and full assessment authoring. Review required."})}
  await P.save(job);status("Local preview created. Questions and dependencies are draft quality and must be reviewed.");await refresh();
 }catch(e){status("Draft unavailable: "+e.message,true)}
}
function download(filename,body,type="application/json"){
 const url=URL.createObjectURL(new Blob([body],{type})),link=document.createElement("a");link.href=url;link.download=filename;
 document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
async function template(){
 try{const r=await fetch("./PREPROCESSING_TEMPLATE.md");if(!r.ok)throw Error("Template missing");
 download("SDGGold_Universal_Preprocessing_Template.md",await r.text(),"text/markdown");status("Template downloaded. Give it to ChatGPT or another AI alongside your course sources.");
 }catch(e){status(e.message,true)}
}
async function exportPacket(){
 if(!job)return;
 const passages=await S.listPassages(job.id),p=job.packet;
 const lines=[...p.manifests,...p.sources,...passages,...p.concepts,...p.gaps,...p.batches].map(x=>JSON.stringify(x));
 download("SDGGold_"+C.slug(job.title)+"_packet.jsonl",lines.join("\n")+"\n","application/x-ndjson");
}
async function installCourse(){
 if(!job?.course)return;
 if(typeof root.SDGGoldAcceptCourse!=="function")return status("Learning Tree bridge is unavailable. Reload the app.",true);
 if(!confirm("Replace the current local course with this generated tree? Current progress will reset. This does NOT publish content online."))return;
 try{root.SDGGoldAcceptCourse(job.course);close();document.querySelector('[data-view="progression"]')?.click();status("Course loaded into the learning tree.")}
 catch(e){status("Course cannot be installed: "+e.message,true)}
}
async function deleteProject(){
 if(!job||working)return;if(!confirm("Permanently delete this local project, passages and image checkpoints?"))return;
 try{await S.removeJob(job.id);job=null;await loadJobs();status("Local project deleted.")}
 catch(e){status(e.message,true)}
}
async function render(){
 if(!pane||!job)return;
 $("arch-title").value=job.title||"New Course";
 txt("arch-phase",(job.phase||"collect").toUpperCase());txt("arch-calls",(job.api_calls||0)+" AI calls");
 txt("arch-sources",job.packet.sources.length);
 txt("arch-concepts",job.graph?.nodes.length||job.candidates?.length||job.packet.concepts.length);
 txt("arch-passages",job.passages_count??"…");
 txt("arch-count-summary",(job.input_chars||0).toLocaleString()+" source characters · "+job.packet.gaps.length+" source gaps");
 txt("arch-work-label",job.status||"Ready to collect");
 let completed=0,total=1;
 if(job.phase==="extract"){total=job.extractQueue?.length||1;completed=job.extractIndex||0}
 else if(job.phase==="plan"){total=Math.ceil((job.candidates?.length||0)/28)||1;completed=job.planIndex||0}
 else if(job.phase==="bridge"){total=Math.ceil((job.candidates?.length||0)/22)||1;completed=job.bridgeIndex||0}
 else if(job.phase==="author"){total=Math.ceil((job.graph?.nodes.length||0)/2)||1;completed=job.authorIndex||0}
 else if(["ready","draft"].includes(job.phase))completed=total=1;
 $("arch-progress").style.width=Math.round(100*completed/total)+"%";
 $("arch-apply").disabled=!job.course;$("arch-download").disabled=!job.course;$("arch-audit-export").disabled=!job.report;
 $("arch-generate").disabled=working;$("arch-draft").disabled=working;$("arch-new").disabled=working;
 const report=job.report;
 txt("arch-quality",report?"Passage coverage "+report.coverage_percent+"% · "+report.issues.length+" quality flags · "+(report.ready_for_publication?"Automated checks passed":"Review required"):"No completed audit. Recorded source gaps: "+job.packet.gaps.length);
 const list=$("arch-issues");list.replaceChildren();
 const issues=report?.issues||job.packet.gaps.map(g=>({severity:g.severity,code:g.kind,detail:g.description}));
 for(const item of issues.slice(0,30)){
  const li=make("li",undefined,item.severity||"review");li.append(make("b",item.severity||"review"),document.createTextNode(" "+(item.code||"issue")+": "+item.detail));list.append(li);
 }
 if(issues.length>30)list.append(make("li",(issues.length-30)+" more issues; export the full audit report."));
 const box=$("arch-jobs");box.replaceChildren();
 for(const j of jobs){
  const button=make("button",undefined,"architect-job"+(j.id===job.id?" selected":""));
  const left=make("div");left.append(make("strong",j.title),make("small",j.phase+" · "+new Date(j.updated).toLocaleString()));
  button.append(left,make("small",j.id===job.id?"●":"↗"));
  button.onclick=async()=>{if(working)return;job=await S.get("jobs",j.id);await refresh()};box.append(button);
 }
 renderAuth();
}
async function refresh(){
 jobs=(await S.all("jobs")).sort((a,b)=>b.updated.localeCompare(a.updated));
 if(job)job.passages_count=(await S.listPassages(job.id)).length;
 await render();
}
function bind(){
 $("arch-new").onclick=createProject;$("arch-template").onclick=template;$("arch-export-packet").onclick=exportPacket;
 $("arch-title").onchange=()=>persistTitle().then(refresh);
 $("arch-files").onchange=e=>importFiles(e.target.files);
 const drop=$("arch-drop");
 for(const name of ["dragenter","dragover"])drop.addEventListener(name,e=>{e.preventDefault();drop.classList.add("dragging")});
 for(const name of ["dragleave","drop"])drop.addEventListener(name,e=>{e.preventDefault();drop.classList.remove("dragging")});
 drop.addEventListener("drop",e=>importFiles(e.dataTransfer.files));
 $("arch-folder").onclick=()=>{const input=$("arch-files");input.setAttribute("webkitdirectory","");input.click();setTimeout(()=>input.removeAttribute("webkitdirectory"),2000)};
 $("arch-add-text").onclick=()=>paste(false);$("arch-add-packet").onclick=()=>paste(true);$("arch-add-web").onclick=webpage;
 $("arch-login").onclick=login;$("arch-logout").onclick=logout;
 $("arch-generate").onclick=generate;$("arch-draft").onclick=localDraft;$("arch-pause").onclick=()=>{pausing=true;status("Pause requested. Current AI call will finish, then checkpoint is saved.")};
 $("arch-apply").onclick=installCourse;
 $("arch-download").onclick=()=>job?.course&&download("SDGGold_"+C.slug(job.title)+"_course.json",JSON.stringify(job.course,null,2));
 $("arch-audit-export").onclick=()=>job?.report&&download("SDGGold_"+C.slug(job.title)+"_audit.json",JSON.stringify(job.report,null,2));
 $("arch-delete").onclick=deleteProject;
}
async function open(){try{await initialize();document.querySelector(".stage").classList.add("architect-mode");await refresh()}catch(e){console.error("Architect initialization",e);alert("Curriculum Architect could not initialize: "+e.message)}}
function close(){document.querySelector(".stage")?.classList.remove("architect-mode")}
root.SDGArchitectUI={open,close};
})(window);
