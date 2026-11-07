/* SDGGold Import Studio: external ChatGPT output ONLY, deterministic validation and cloud storage. NO AI calls. */
(function(root){
"use strict";
const V=root.SDGCoursePackage,S=root.SDGArchitectStore,Cloud=root.SDGCourseCloud;
const $=id=>document.getElementById(id),elt=(tag,value,cls)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);return e};
let initialized=false,screen=null,parts=[],course=null,report=null,cloudId=null,cloudVersion=null,cloudVisibility="private",editable=false,session=null,collectionScope="public",collectionOffset=0,busy=false;
const MAX_FILE=25000000;
const text=(id,value)=>{const e=$(id);if(e)e.textContent=String(value??"")};
function message(value,isError=false){text("studio-message",value);$("studio-message")?.classList.toggle("error",isError)}
async function persist(){
 await S.put("jobs",{id:"studio-v2-current",title:course?.course?.title||"Course Import Studio",parts,package:course,report,cloudId,cloudVersion,cloudVisibility,editable,updated:new Date().toISOString()});
}
async function restore(){
 const old=await S.get("jobs","studio-v2-current");
 if(!old)return;
 parts=old.parts||[];course=old.package||null;cloudId=old.cloudId||null;cloudVersion=old.cloudVersion??null;cloudVisibility=old.cloudVisibility||"private";editable=!!old.editable;
 if(course){report=V.audit(course);if(!report.ok)course=null}
}
function safeLabel(x){return String(x||"input").replace(/[^\w.-]/g,"_").slice(0,120)}
function downloadable(name,contents,mime="application/json"){
 const url=URL.createObjectURL(new Blob([contents],{type:mime})),a=document.createElement("a");
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
async function fetchDownload(file,name,mime){
 const r=await fetch("./"+file,{cache:"no-cache"});if(!r.ok)throw Error(file+" is unavailable.");
 downloadable(name,await r.text(),mime);
}
async function importedText(raw,name){
 if(String(raw).length>MAX_FILE)throw Error(name+" is larger than 25 MB. Split into smaller JSONL batches.");
 const p=V.parse(raw,name);parts.push({name,parsed:p});
 try{
  const assembled=V.assembleParts(parts),r=V.audit(assembled);
  report=r;course=r.ok?assembled:null;cloudId=null;cloudVersion=null;editable=true;
  message(r.ok?"Complete external course package imported. Structural checks passed; review warnings before study or publication.":"Imported, but the package has "+r.errors.length+" structural errors. Correct it externally or using Edit Package JSON.",!r.ok);
 }catch(e){
  course=null;report=null;
  message("Batch received ("+parts.length+" input"+(parts.length===1?"":"s")+"). "+e.message+" You can add remaining batches. All parts are retained locally.",false);
 }
 await persist();render();
}
async function importFiles(files){
 const list=[...files||[]];if(!list.length||busy)return;
 busy=true;try{
  for(const f of list){if(f.size>MAX_FILE)throw Error("File "+f.name+" is too large. Split it into smaller numbered JSONL files.");await importedText(await f.text(),safeLabel(f.name))}
  if(!course&&parts.length)message("Inputs received. If this is a multipart course, add the remaining numbered batches until course_end is present. "+(report?report.errors.length+" errors found.":""),!!report&&!report.ok);
 }catch(e){message("Import error: "+e.message,true)}finally{busy=false;render()}
}
async function importExample(){
 try{const r=await fetch("./EXAMPLE_COMPLETE_COURSE.json",{cache:"no-cache"});if(!r.ok)throw Error("Example unavailable");
  parts=[];await importedText(await r.text(),"EXAMPLE_COMPLETE_COURSE.json");
  message(course?"Canonical example imported and validated. You can immediately load it into your learning tree.":"Example did not validate. Check errors.",!course);
 }catch(e){message(e.message,true)}
}
function addPaste(){
 const value=$("studio-paste").value.trim();if(!value)return message("Paste a complete package or numbered JSONL records first.",true);
 importedText(value,"Pasted input "+(parts.length+1)).then(()=>$("studio-paste").value="").catch(e=>message(e.message,true));
}
async function clear(){
 if(!confirm("Clear imported packages, pending batches and the current validation report from this device? Saved Supabase courses are unaffected."))return;
 parts=[];course=null;report=null;cloudId=null;cloudVersion=null;editable=false;cloudVisibility="private";
 $("studio-editor-wrap").hidden=true;await persist();render();message("Local import workspace cleared.");
}
function renderReport(){
 const m=report?.metrics||{};
 text("studio-nodes",m.nodes||0);text("studio-tracks",m.tracks||0);text("studio-edges",m.edges||0);
 const badge=$("studio-validity");
 badge.textContent=report?(report.ok?"STRUCTURE VALID":report.errors.length+" ERRORS"):"Awaiting import";
 badge.className="architect-badge "+(report?.ok?"good":"warn");
 text("studio-mastery",report?.ok?"One final mastery · "+m.roots+" foundations":"Mastery not confirmed");
 text("studio-report-summary",report?
  "Roots: "+m.roots+" · Branch points: "+m.splits+" · Merge points: "+m.merges+" · Source citations: "+m.source_refs+" · "+report.errors.length+" errors and "+report.warnings.length+" review warnings.":
  "Import all completed ChatGPT files. Validation checks IDs, all five phases, track uniqueness, source references, dependencies and single final mastery.");
 const errors=$("studio-errors"),warnings=$("studio-warnings");errors.replaceChildren();warnings.replaceChildren();
 if(report){
  report.errors.slice(0,35).forEach(x=>{const li=elt("li",undefined,"high");li.append(elt("b","ERROR"),document.createTextNode(x.code+": "+x.message));errors.append(li)});
  report.warnings.slice(0,30).forEach(x=>{const li=elt("li");li.append(elt("b","CHECK"),document.createTextNode(x.code+": "+x.message));warnings.append(li)});
  if(report.errors.length>35)errors.append(elt("li",report.errors.length-35+" more errors; export full report."));
  if(report.warnings.length>30)warnings.append(elt("li",report.warnings.length-30+" more warnings; export full report."));
 }
 $("studio-export-report").disabled=!report;
 $("studio-edit").disabled=(!course&&!report);
}
function render(){
 if(!initialized)return;
 renderReport();
 const canUse=!!course&&!!report?.ok;
 $("studio-use").disabled=!canUse;
 $("studio-export").disabled=!course;
 $("studio-save").disabled=!canUse||!session;
 $("studio-revisions").disabled=!session||!cloudId||!editable;
 $("studio-visibility").value=cloudVisibility;
 const c=course?.course;
 text("studio-course-title",c?c.title+" · Revision "+c.revision+" · "+course.nodes.length+" fully authored concepts":"No valid course selected.");
 text("studio-cloud-status",cloudId?"Supabase: "+cloudVisibility+" · version "+cloudVersion+" · "+cloudId:"Not yet saved to Supabase.");
 const badge=$("studio-auth-badge");
 badge.textContent=session?"Google connected":"Cloud sign-in required";
 badge.className="architect-badge "+(session?"good":"warn");
 text("studio-user",session?"Signed in as "+(session.user?.email||"Google user")+". The Supabase library stores versioned packages separately from other applications.":"Sign in to save/update private courses. Public courses can be browsed anonymously. You can still learn from any validated package locally.");
 $("studio-login").hidden=!!session;
 $("studio-logout").hidden=!session;
}
async function authCheck(){
 try{session=await Cloud.session();render()}catch(e){message("Cloud authentication unavailable: "+e.message+". Local import and learning still work.",true)}
}
async function login(){
 try{await Cloud.signIn()}catch(e){message("Google sign-in: "+e.message+". Check Google provider and allowed redirect URL settings.",true)}
}
async function logout(){try{await Cloud.signOut();session=null;render()}catch(e){message(e.message,true)}}
async function use(){
 if(!course||!report?.ok)return;
 if(!confirm("Load "+course.course.title+" into the learning tree? Changes to an existing course may reset progress for revised concepts. This action does not automatically publish anything."))return;
 try{root.SDGGoldAcceptCourse(course);close();document.querySelector('[data-view="progression"]')?.click();message("Course loaded locally. All concepts, links and mastery checks remain authored by external ChatGPT.")}
 catch(e){message("Cannot load course: "+e.message,true)}
}
async function save(){
 if(!session||!course||!report?.ok)return;
 const visibility=$("studio-visibility").value,quality=course.quality;
 if(visibility!=="private"){
  if(course.coverage.status!=="complete"||course.sources.some(s=>s.rights==="unknown")){
   return message("Keep this course private until source coverage is complete and publication rights are established.",true);
  }
  if(!confirm("Share this course "+visibility+"? Confirm you have reviewed every cited source and have the rights to share its educational content."))return;
 }
 try{
  busy=true;message("Saving versioned package to SDGGold Supabase...");
  let expected=cloudVersion;
  if(expected==null){
   const listing=await Cloud.listMine();
   const match=listing.courses.find(x=>x.course_key===course.course.course_id);
   if(match){
    if(!confirm("A course with this ID already exists in your library (version "+match.version+"). Save this import as a NEW revision? The older revision will remain in history.")){message("Cloud update cancelled.");return}
    expected=match.version;cloudId=match.id;
   }
  }
  const result=await Cloud.save(course,visibility,expected);
  cloudId=result.id;cloudVersion=result.version;cloudVisibility=visibility;editable=true;
  await persist();render();message("Saved successfully in SDGGold Supabase as version "+cloudVersion+". Previous revisions remain available.");
 }catch(e){
  if(e.status===409)message("Version conflict: a newer revision exists. Open My Courses and inspect it before saving, to avoid overwriting recent work.",true);
  else message("Supabase save failed: "+e.message,true);
 }finally{busy=false}
}
async function browse(scope="public",offset=0){
 try{
  busy=true;collectionScope=scope;collectionOffset=offset;
  const result=scope==="mine"?await Cloud.listMine(offset):await Cloud.listPublic(offset),box=$("studio-collection");
  if(offset===0)box.replaceChildren();
  if(!result.courses.length&&offset===0)box.append(elt("div",scope==="mine"?"No courses in your private library yet.":"No public courses have been published yet.","architect-job"));
  for(const item of result.courses){
   const btn=elt("button",undefined,"architect-job");btn.type="button";
   const left=elt("div");left.append(elt("strong",item.title),elt("small",item.visibility+" · v"+item.version+" · "+new Date(item.updated_at).toLocaleString()));
   btn.append(left,elt("small","↗"));btn.onclick=()=>loadCloud(item.id);
   box.append(btn);
  }
  $("studio-more").hidden=result.next_offset==null;
  if(result.next_offset!=null)collectionOffset=result.next_offset;
 }catch(e){message("Unable to browse "+scope+" courses: "+e.message,true)}
 finally{busy=false}
}
async function loadCloud(id){
 try{
  const result=await Cloud.load(id),r=V.audit(result.package);
  if(!r.ok){message("This stored course failed validation ("+r.errors.length+" errors). It has not replaced your current course.",true);return}
  course=result.package;report=r;parts=[];
  cloudId=result.course.id;cloudVersion=result.course.version;
  cloudVisibility=result.course.visibility;editable=!!result.can_edit;
  await persist();render();
  message("Loaded "+course.course.title+" from the "+(editable?"private owner":"public/shared")+" collection. Choose Use in Learning Tree to study.");
 }catch(e){message("Could not open cloud course: "+e.message,true)}
}
async function revisionHistory(){
 if(!cloudId||!editable)return;
 try{
  const r=await Cloud.revisions(cloudId),list=r.revisions||[];
  if(!list.length)return message("No archived revisions.");
  const versions=list.map(x=>x.version+": "+new Date(x.saved_at).toLocaleString()).join("\n");
  const wanted=prompt("Available course revisions:\n"+versions+"\n\nEnter a revision number to restore into the Import Studio (not directly overwrite cloud):");
  if(wanted===null)return;const n=Number(wanted);
  if(!Number.isInteger(n)||!list.some(x=>x.version===n))return message("Invalid revision number.",true);
  const data=await Cloud.getRevision(cloudId,n),rpt=V.audit(data.revision.package);
  if(!rpt.ok)return message("Archived revision has structural errors and was not loaded.",true);
  course=data.revision.package;report=rpt;parts=[];cloudVersion=list[0].version;
  await persist();render();message("Revision "+n+" loaded for review. Saving will create a NEW cloud revision after the latest version.");
 }catch(e){message("Revision history failed: "+e.message,true)}
}
function edit(){
 const box=$("studio-editor-wrap");box.hidden=!box.hidden;
 if(!box.hidden)$("studio-editor").value=JSON.stringify(course||report?.package||{},null,2);
}
async function applyEdited(){
 try{const p=JSON.parse($("studio-editor").value),r=V.audit(p);
  report=r;course=r.ok?p:null;parts=[];cloudId=null;cloudVersion=null;editable=true;
  await persist();render();message(r.ok?"Edited package validated. Review then save as a new revision.":"Edited package has "+r.errors.length+" validation errors.",!r.ok);
 }catch(e){message("Invalid edited JSON: "+e.message,true)}
}
function bind(){
 $("studio-template").onclick=()=>fetchDownload("CHATGPT_COURSE_TEMPLATE.md","SDGGold_Master_External_ChatGPT_Template.md","text/markdown").catch(e=>message(e.message,true));
 $("studio-example").onclick=()=>fetchDownload("EXAMPLE_COMPLETE_COURSE.json","SDGGold_Complete_Working_Example.json").catch(e=>message(e.message,true));
 $("studio-example-preview").onclick=importExample;
 $("studio-files").onchange=e=>importFiles(e.target.files);
 const drop=$("studio-drop");
 for(const event of ["dragenter","dragover"])drop.addEventListener(event,e=>{e.preventDefault();drop.classList.add("dragging")});
 for(const event of ["dragleave","drop"])drop.addEventListener(event,e=>{e.preventDefault();drop.classList.remove("dragging")});
 drop.addEventListener("drop",e=>importFiles(e.dataTransfer.files));
 $("studio-add-paste").onclick=addPaste;$("studio-clear").onclick=clear;
 $("studio-export-report").onclick=()=>report&&downloadable("SDGGold_validation_report.json",JSON.stringify(report,null,2));
 $("studio-edit").onclick=edit;$("studio-apply-editor").onclick=applyEdited;
 $("studio-use").onclick=use;$("studio-export").onclick=()=>course&&downloadable("SDGGold_"+course.course.course_id+".json",JSON.stringify(course,null,2));
 $("studio-login").onclick=login;$("studio-logout").onclick=logout;$("studio-save").onclick=save;$("studio-revisions").onclick=revisionHistory;
 $("studio-public").onclick=()=>browse("public");$("studio-mine").onclick=()=>browse("mine");
 $("studio-more").onclick=()=>browse(collectionScope,collectionOffset);
 $("studio-visibility").onchange=e=>{cloudVisibility=e.target.value};
 Cloud.subscribe(s=>{session=s;render()});
}
async function init(){
 if(initialized)return;initialized=true;
 screen=document.createElement("section");screen.id="studio-screen";screen.className="architect-screen";
 const r=await fetch("./architect-panel.html");if(!r.ok)throw Error("Import Studio interface missing.");
 screen.innerHTML=await r.text();document.querySelector(".stage").append(screen);
 bind();await restore();render();authCheck();
}
async function open(){
 try{await init();document.querySelector(".stage").classList.add("architect-mode");render()}
 catch(e){console.error("SDGGold Import Studio",e);alert("Import Studio could not open: "+e.message)}
}
function close(){document.querySelector(".stage")?.classList.remove("architect-mode")}
root.SDGCourseStudio={open,close};
})(window);
