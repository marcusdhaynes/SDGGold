"use strict";
// SDGGold: standalone client-only progression tree. No cross-app/network access.
const $=id=>document.getElementById(id),mk=(t,c,s)=>{const e=document.createElement(t);if(c)e.className=c;if(s!==undefined)e.textContent=String(s);return e};
const STORE="sdggold.v4.progress",COURSE_STORE="sdggold.v4.course";
const labels=["Learn","Recall","Practice","Test","Mastery Review"];
function make(id,tier,lane,title,icon,parents,lesson,example,summary,right,wrong,kind="concept"){
return {id,tier,lane,title,icon,prerequisites:parents,subject:"Thinking Skills",kind,learn:lesson,example,
reinforce:{question:"Explain "+title.toLowerCase()+" in your own words.",answer:summary},
practice:{question:"Which description makes sense?",choices:[right,wrong,"It is impossible to learn this skill."],correct:0,explanation:summary},
test:{question:"Choose the accurate statement.",choices:[wrong,right,"We should not check our reasoning."],correct:1,explanation:summary},
review:{question:"Which answer shows understanding?",choices:["Only experts can think this way.",wrong,right],correct:2,explanation:summary}};
}
const SAMPLE={version:4,title:"Understanding How We Know",subtitle:"A structured path to build your thinking and learning skills",nodes:[
make("observation",0,2.55,"Observation","◉",[],"We learn by noticing the world. Look closely, listen carefully, and describe what is there before making a guess.","A puddle is smaller this afternoon than this morning.","Observation means collecting what you notice using senses or tools.","We look carefully before deciding what happened.","We decide the answer without looking."),
make("questions",1,1.42,"Questions","?",["observation"],"A good question asks about something you want to understand. It is clear enough that you could look for an answer.","Why did that puddle shrink?","A clear question guides learning.","A question helps us investigate something we notice.","Every question must already have a known answer."),
make("comparison",1,4.26,"Comparison","◌",["observation"],"Compare things by looking at what is alike and different. Compare the same feature fairly.","One seed grows two inches, another grows four.","Comparison finds meaningful similarities and differences.","We compare measurements made the same way.","We can fairly compare any two unrelated numbers."),
make("evidence",2,.70,"Evidence","▱",["questions"],"Evidence is information that helps answer a question. Check it and record it instead of guessing.","You measure the puddle every hour.","Evidence is information supporting or challenging an idea.","We use observations and measurements to check ideas.","Our first guess is always the evidence."),
make("logic",2,2.02,"Logic","⚖",["questions"],"Logic checks whether a conclusion follows from its reasons. A confident claim can still be wrong.","A dark house does not prove nobody is home.","Logic connects reasons to conclusions correctly.","We ask whether our reasons actually prove a claim.","If a person sounds certain, their reasoning must be right."),
make("synthesis",2,3.75,"Synthesis","✣",["comparison"],"Synthesis joins ideas into a more complete explanation. Understand each part before combining them.","Connect what you know about warmth, water, and time.","Synthesis brings compatible ideas together.","We join related ideas without losing their meaning.","We combine ideas by forgetting their differences."),
make("patterns",2,5.24,"Patterns","⠿",["comparison"],"A pattern is something that happens repeatedly. Look for several examples rather than treating one event as a rule.","Wet pavement often dries faster on sunny days.","Patterns are repeated regularities in observations.","We look for repeated relationships in evidence.","One odd event proves a rule for everything."),
make("argument",3,1.98,"Argument","▤",["evidence","logic"],"An argument is a conclusion supported by reasons and evidence. It helps others check your thinking.","Explain why the puddle dried and show what you measured.","A strong argument joins evidence and valid reasoning.","We support conclusions with evidence and clear reasons.","Loudness is stronger than evidence."),
make("generalization",3,5.24,"Generalization","⌁",["patterns"],"A generalization extends a repeated pattern to other cases. Always remember the limits of your observations.","Many plants grow toward light, but not all grow alike.","A careful generalization considers exceptions.","We extend a reliable pattern cautiously.","One example proves a universal rule."),
make("analysis",4,3.05,"Analysis","▥",["argument","synthesis"],"Analysis looks closely at each piece of an idea and how the pieces work together. Look for hidden assumptions.","Separate a scientific explanation into observations, reasons, and conclusions.","Analysis examines components and their relationships.","We study each part and its role in the whole.","We decide without examining the details.","skill"),
make("application",4,5.24,"Application","▧",["generalization"],"Application means using what you understand in a new situation. Check that it fits the new situation first.","Use what you learned about sunlight to grow a seedling.","Application transfers knowledge thoughtfully.","We use a learned idea in an appropriate new case.","Every rule works in every situation without checking.","skill"),
make("mastery",5,3.90,"Mastery","♜",["analysis","application"],"Mastery joins all the required skills: observing, questioning, comparing, reasoning, testing, analyzing, and applying. It also means knowing when to learn more.","Investigate something new and explain each step clearly.","Mastery combines the complete chain of understanding.","We connect every required skill and continue improving.","Mastery means never asking questions again.","milestone")
]};
function quizOK(q){return q&&typeof q.question==="string"&&Array.isArray(q.choices)&&q.choices.length>=2&&q.choices.length<=10&&q.choices.every(x=>typeof x==="string")&&Number.isInteger(q.correct)&&q.correct>=0&&q.correct<q.choices.length}
function validate(data){
if(!data||typeof data.title!=="string"||!data.title.trim()||!Array.isArray(data.nodes)||data.nodes.length<1||data.nodes.length>1000)throw Error("Course requires a title and 1–1000 concepts.");
const by=new Map();
for(const n of data.nodes){
 if(!n||typeof n.id!=="string"||!n.id||by.has(n.id)||typeof n.title!=="string"||!n.title.trim()||!Number.isInteger(n.tier)||n.tier<0||n.tier>1000||typeof n.learn!=="string"||!n.learn.trim()||!Array.isArray(n.prerequisites)||!n.reinforce||typeof n.reinforce.question!=="string"||typeof n.reinforce.answer!=="string"||!quizOK(n.test)||n.practice&&!quizOK(n.practice)||n.review&&!quizOK(n.review))throw Error("Invalid or duplicate concept: "+(n&&n.id));
 by.set(n.id,n);
}
const children=new Map([...by.keys()].map(id=>[id,[]]));
for(const n of data.nodes){
 if(!n.prerequisites.length&&n.tier!==0)throw Error("Every later concept must lead back to a foundation: "+n.title);
 if(new Set(n.prerequisites).size!==n.prerequisites.length)throw Error("Duplicate prerequisite: "+n.title);
 for(const id of n.prerequisites){const p=by.get(id);if(!p)throw Error("Missing prerequisite "+id);if(p.tier>=n.tier)throw Error("Prerequisites must occur at earlier stages: "+n.title);children.get(id).push(n.id)}
}
const ends=data.nodes.filter(n=>children.get(n.id).length===0);
if(ends.length!==1)throw Error("Every branch must converge on exactly one final mastery concept.");
const visited=new Set();function walk(id){if(visited.has(id))return;visited.add(id);by.get(id).prerequisites.forEach(walk)}walk(ends[0].id);
if(visited.size!==data.nodes.length)throw Error("All concepts must connect to the final mastery concept.");
return data;
}
function stored(key){try{return JSON.parse(localStorage.getItem(key))}catch{return null}}
let course=(()=>{try{return validate(stored(COURSE_STORE))}catch{return SAMPLE}})();
let store=stored(STORE),progress=store&&store.title===course.title?store.levels||{}:course===SAMPLE?{observation:5,questions:5,comparison:5,evidence:3,synthesis:2}:{};
let saved=stored("sdggold.saved.v4")||[],recent=stored("sdggold.recent.v4")||[],zoom=1,section="all",current=null,revealed=false;
function save(){try{localStorage.setItem(STORE,JSON.stringify({title:course.title,levels:progress}));localStorage.setItem("sdggold.saved.v4",JSON.stringify(saved));localStorage.setItem("sdggold.recent.v4",JSON.stringify(recent))}catch(e){console.warn("Local storage unavailable",e)}}
function level(id){return Math.max(0,Math.min(5,Number(progress[id])||0))}
function get(id){return course.nodes.find(n=>n.id===id)}
function unlocked(n){return n.prerequisites.every(id=>level(id)===5)}
function state(n){return level(n.id)===5?"mastered":level(n.id)>0?"started":unlocked(n)?"available":"locked"}
function focus(){return course.nodes.filter(n=>unlocked(n)&&level(n.id)<5).sort((a,b)=>level(b.id)-level(a.id)||a.tier-b.tier)[0]}
function filters(){
const subject=$("subject"),prev=subject.value;
subject.replaceChildren(new Option("▤ All Subjects","all"));
[...new Set(course.nodes.map(n=>n.subject||"General"))].sort().forEach(x=>subject.add(new Option(x,x)));
subject.value=[...subject.options].some(o=>o.value===prev)?prev:"all";
const lev=$("level"),old=lev.value;lev.replaceChildren(new Option("▥ All Levels","all"));
[...new Set(course.nodes.map(n=>n.tier))].sort((a,b)=>a-b).forEach(x=>lev.add(new Option("Stage "+(x+1),String(x))));
lev.value=[...lev.options].some(o=>o.value===old)?old:"all";
}
function showNode(n){
const cb=document.querySelector('.checkline input[data-state="'+state(n)+'"]');
if(cb&&!cb.checked)return false;
if($("search").value.trim()&&!(n.title+" "+n.learn).toLowerCase().includes($("search").value.toLowerCase().trim()))return false;
if($("subject").value!=="all"&&(n.subject||"General")!==$("subject").value)return false;
if($("level").value!=="all"&&String(n.tier)!==$("level").value)return false;
if($("type").value!=="all"&&(n.kind||"concept")!==$("type").value)return false;
if(section==="progress"&&level(n.id)===0)return false;
if(section==="saved"&&!saved.includes(n.id))return false;
if(section==="recent"&&!recent.includes(n.id))return false;
return true;
}
let showAllConnections=false;
function positions(){return window.SDGGraphLayout.layout(course)}
function linkPath(a,b){
 const x=a.x+235,y=a.y+39,tx=b.x,ty=b.y+39,mid=(x+tx)/2;
 if(tx-x<80)return "M "+x+" "+y+" C "+mid+" "+y+","+mid+" "+ty+","+tx+" "+ty;
 const curve=Math.max(42,Math.min(100,(tx-x)/3));
 return "M "+x+" "+y+" C "+(x+curve)+" "+y+","+(tx-curve)+" "+ty+","+tx+" "+ty;
}
function treeGuide(layout){
 const view=$("viewport"),parent=document.querySelector(".canvas-view");
 let panel=$("treeNavigator");
 if(!panel){panel=mk("div","tree-navigator");panel.id="treeNavigator";parent.append(panel)}
 const counts=mk("span","tree-node-count",layout.nodes+" / "+course.nodes.length+" concepts · "+layout.bands.filter(b=>!b.shared).length+" tracks");
 const select=mk("select","tree-jump");select.setAttribute("aria-label","Jump to a conceptual track");
 select.add(new Option("Jump to a track…",""));
 for(const band of layout.bands)select.add(new Option(band.title+" · "+band.count+" concepts",band.id));
 select.add(new Option("Integrated Mastery","__mastery"));
 select.addEventListener("change",()=>{
  const band=layout.bands.find(x=>x.id===select.value);
  const dest=band?band.top:layout.pos.get(course.course?.mastery_node_id)?.y||0;
  view.scrollTop=Math.max(0,Math.round(dest*zoom-view.clientHeight*.18));
  if(select.value==="__mastery")view.scrollLeft=Math.max(0,Math.round((layout.pos.get(course.course?.mastery_node_id)?.x||0)*zoom-view.clientWidth*.45));
  else view.scrollLeft=0;
 });
 const toggle=mk("button","tree-connections",showAllConnections?"All links · ON":"All links · OFF");
 toggle.type="button";toggle.title="Toggle all exact prerequisite links. Default groups final mastery prerequisites into track-readiness collectors.";
 toggle.setAttribute("aria-pressed",String(showAllConnections));
 toggle.addEventListener("click",()=>{showAllConnections=!showAllConnections;renderGraph()});
 const hint=mk("span","tree-scroll-hint","Drag to pan · Scroll/pinch to zoom");
 panel.replaceChildren(counts,select,toggle,hint);
}
function renderGraph(){
 const layout=positions(),{pos,width,height,bands,collectors}=layout,view=$("viewport"),ox=view.scrollLeft,oy=view.scrollTop;
 const graph=$("graph"),spacer=$("spacer"),svg=$("lines"),root=$("nodes");
 graph.style.width=width+"px";graph.style.height=height+"px";graph.style.transform="scale("+zoom+")";
 graph.classList.toggle("show-all-links",showAllConnections);
 spacer.style.width=Math.ceil(width*zoom)+"px";spacer.style.height=Math.ceil(height*zoom)+"px";
 svg.setAttribute("viewBox","0 0 "+width+" "+height);svg.replaceChildren();root.replaceChildren();
 for(const previous of graph.querySelectorAll(".track-band,.tree-stage-marker"))previous.remove();
 const milestone=course.nodes.find(n=>n.id===course.course?.mastery_node_id);
 const milestoneId=milestone?.id||null;
 const lastTier=Math.max(...course.nodes.map(n=>n.tier));
 const lastX=milestoneId?pos.get(milestoneId)?.x:width-60;
 for(const band of bands){
  const row=mk("div","track-band"+(band.shared?" shared":""));
  row.style.left="23px";row.style.top=band.top+"px";row.style.width=Math.max(270,(lastX||width)-65)+"px";row.style.height=band.height+"px";
  row.style.setProperty("--track-accent",band.color);
  const title=mk("div","track-band-title",band.title);
  const size=mk("span","track-band-count",band.count+" concepts");
  row.append(title,size);graph.prepend(row);
 }
 const tierSet=[...new Set(course.nodes.map(n=>n.tier))].sort((a,b)=>a-b);
 for(const tier of tierSet){
  const starts=course.nodes.filter(n=>n.tier===tier).map(n=>pos.get(n.id)?.x).filter(Number.isFinite);
  if(!starts.length)continue;
  const title=mk("div","tree-stage-marker",(tier===lastTier?"FINAL MASTERY":"STAGE "+(tier+1)));
  title.style.left=Math.min(...starts)+"px";title.style.top="85px";
  graph.append(title);
 }
 function drawWire(from,to,classes,fromId,toId){
  const d=linkPath(from,to);
  for(const cls of ["wire-back "+classes,"wire "+classes]){
   const p=document.createElementNS("http://www.w3.org/2000/svg","path");
   p.setAttribute("d",d);p.setAttribute("class",cls);
   p.dataset.from=fromId;p.dataset.to=toId;svg.append(p);
  }
 }
 for(const node of course.nodes){
  for(const parentId of node.prerequisites){
   const a=pos.get(parentId),b=pos.get(node.id);
   if(!a||!b)continue;
   const isFinal=milestoneId===node.id&&collectors.length>0;
   const classes=(isFinal?"mastery-link ":"")+(level(parentId)===5?"complete":unlocked(node)?"ready":"");
   drawWire(a,b,classes,parentId,node.id);
  }
 }
 for(const collector of collectors){
  const end=pos.get(milestoneId);
  const ready=collector.required.every(id=>level(id)===5);
  drawWire({x:collector.x-8,y:collector.y-14},end,"collector-link "+(ready?"complete":"ready"),"collector:"+collector.id,milestoneId);
  const mastered=collector.required.filter(id=>level(id)===5).length;
  const gate=mk("button","track-collector"+(ready?" ready":""));
  gate.type="button";gate.style.left=collector.x+"px";gate.style.top=collector.y+"px";
  gate.style.setProperty("--track-accent",collector.color);gate.dataset.track=collector.id;
  gate.title="Track readiness · "+collector.title+" · "+mastered+"/"+collector.required.length+" terminal requirements mastered. Not an additional learning step.";
  gate.append(mk("strong",null,collector.title),mk("span",null,mastered+" / "+collector.required.length+" ready"));
  gate.addEventListener("click",()=>modal(collector.title+" · Track Readiness",body=>{
   body.append(mk("p",null,"This is a visual summary, not an extra lesson. The final mastery milestone still requires every original prerequisite. Complete these "+collector.required.length+" concepts:"));
   for(const id of collector.required){
    const n=get(id);if(n)body.append(btn((level(id)===5?"✓ ":"○ ")+n.title+" · "+level(id)+"/5",()=>{closeModal();open(id)},true));
   }
  }));
  root.append(gate);
 }
 function focusLinks(nodeId){
  const focused=!!nodeId;
  graph.classList.toggle("focus-links",focused);
  for(const p of svg.querySelectorAll("path")){
   const incident=p.dataset.from===nodeId||p.dataset.to===nodeId;
   const collectorId=collectors.find(c=>c.required.includes(nodeId))?.id;
   const related=incident&&(p.dataset.to!==milestoneId||nodeId!==milestoneId||p.classList.contains("collector-link"))||
    (collectorId&&p.dataset.from==="collector:"+collectorId);
   p.classList.toggle("related",focused&&!!related);
  }
  for(const btn of root.querySelectorAll(".node"))btn.classList.toggle("linked",focused&&(btn.dataset.node===nodeId||get(nodeId)?.prerequisites.includes(btn.dataset.node)||get(btn.dataset.node)?.prerequisites.includes(nodeId)));
  for(const gate of root.querySelectorAll(".track-collector"))gate.classList.toggle("linked",focused&&collectors.some(c=>c.id===gate.dataset.track&&c.required.includes(nodeId)));
 }
 for(const n of course.nodes){
  const p=pos.get(n.id),st=state(n),v=level(n.id),b=mk("button","node "+st+(showNode(n)?"":" hide-filter"));
  if(!p)continue;
  b.type="button";b.style.left=p.x+"px";b.style.top=p.y+"px";b.dataset.node=n.id;
  const band=bands.find(x=>x.id===p.group);b.style.setProperty("--track-accent",band?.color||"#caa760");
  b.title=n.title+" · "+(st==="locked"?"Locked: finish all immediate prerequisites":v+" of 5 mastery checkpoints");
  b.setAttribute("aria-label",b.title);
  b.append(mk("span","node-icon",n.icon||"◈"));
  const core=mk("span","node-core");core.append(mk("span","node-name",n.title));
  const dots=mk("span","node-dots");for(let i=0;i<5;i++)dots.append(mk("span","node-dot"+(i<v?" filled":"")));
  core.append(dots);b.append(core,mk("span","node-corner",st==="mastered"?"✓":st==="locked"?"🔒":v?v+"/5":""));
  if(st==="mastered")b.append(mk("span","laurel","❧"));
  b.addEventListener("mouseenter",()=>focusLinks(n.id));b.addEventListener("mouseleave",()=>focusLinks(null));
  b.addEventListener("focus",()=>focusLinks(n.id));b.addEventListener("blur",()=>focusLinks(null));
  b.addEventListener("click",()=>open(n.id));root.append(b);
 }
 treeGuide(layout);
 view.scrollLeft=ox;view.scrollTop=oy;
}
function refresh(){
filters();renderGraph();
const c={mastered:0,started:0,available:0,locked:0};course.nodes.forEach(n=>c[state(n)]++);
for(const k in c)$("count-"+k).textContent=({mastered:"Mastered",started:"In Progress",available:"Available",locked:"Locked"})[k]+" ("+c[k]+")";
const total=course.nodes.length,pct=Math.round(100*c.mastered/total);
$("progressDetail").textContent=c.mastered+" / "+total+" concepts";$("overallPct").textContent=pct+"%";$("overallBar").style.width=pct+"%";
const f=focus();$("focusDetail").textContent=f?f.title+" · "+level(f.id)+" / 5 mastery":"All concepts mastered";
const next=course.nodes.filter(n=>state(n)==="locked").sort((a,b)=>a.tier-b.tier)[0];
$("milestoneDetail").textContent=next?"Unlock "+next.title+" ("+next.prerequisites.filter(id=>level(id)<5).length+" concepts)":"Continue toward mastery";
$("courseSubtitle").textContent=course.subtitle||"Every idea begins with understandable foundations";
}
function open(id){const n=get(id);if(!n)return;current=n;revealed=false;recent=[id,...recent.filter(x=>x!==id)].slice(0,30);save();renderPanel();$("panelLayer").classList.add("open");$("panelLayer").setAttribute("aria-hidden","false");$("closePanel").focus()}
function closePanel(){$("panelLayer").classList.remove("open");$("panelLayer").setAttribute("aria-hidden","true");current=null;renderGraph()}
function btn(text,action,alt=false){const b=mk("button","action"+(alt?" alt":""),text);b.addEventListener("click",action);return b}
function advance(n,step){if(!unlocked(n)||level(n.id)!==step)return;progress[n.id]=step+1;save();revealed=false;refresh();renderPanel()}
function quiz(n,source,step,body){
const q=n[source]||n.test,box=mk("div","lesson-box"),feedback=mk("div");box.append(mk("h3",null,String(step+1).padStart(2,"0")+" · "+labels[step].toUpperCase()),mk("p",null,q.question));
let submitted=false;
q.choices.forEach((option,i)=>{const b=mk("button","option-answer",option);b.addEventListener("click",()=>{
if(submitted)return;submitted=true;b.classList.add("chosen");const good=i===q.correct;
feedback.replaceChildren(mk("div","notice"+(good?" good":""),(good?"✓ Correct! ":"Not quite. ")+(q.explanation||"")));
feedback.append(btn(good?(step===4?"Fill Gold · Mastered ✦":"Continue →"):"Try Again",()=>good?advance(n,step):renderPanel(),!good));
});box.append(b)});body.append(box,feedback);
}
function renderPanel(){
if(!current)return;const n=current,v=level(n.id),body=$("panelBody");body.replaceChildren();
$("panelTitle").textContent=n.title;$("panelTag").textContent="STAGE "+(n.tier+1)+" · "+(unlocked(n)?"UNLOCKED":"LOCKED");
$("panelDots").replaceChildren(...Array.from({length:5},(_,i)=>mk("span",i<v?"done":"")));
body.append(btn(saved.includes(n.id)?"★ Saved":"☆ Save Concept",()=>{saved=saved.includes(n.id)?saved.filter(x=>x!==n.id):[...saved,n.id];save();renderPanel();renderGraph()},true));
if(!unlocked(n)){
body.append(mk("div","notice","🔒 This path is locked. Finish EVERY required predecessor before continuing."));
const box=mk("div","lesson-box");box.append(mk("h3",null,"Required concepts"));
n.prerequisites.filter(id=>level(id)<5).forEach(id=>box.append(btn(get(id).title+" · "+level(id)+"/5",()=>open(id),true)));body.append(box);return;
}
if(v===5){
const box=mk("div","lesson-box");box.append(mk("h3",null,"✦ Complete Mastery"),mk("p",null,"All five checkpoints are complete. Your gold pill unlocks descendants only when all of their other prerequisites are also mastered."),mk("p",null,n.learn));body.append(box,btn("Reset this path",()=>resetPath(n.id),true));return;
}
if(v===0){const box=mk("div","lesson-box");box.append(mk("h3",null,"01 · LEARN — FOUNDATIONS"),mk("p",null,n.learn));if(n.example)box.append(mk("h3",null,"Everyday example"),mk("p",null,n.example));body.append(box,btn("I understand · Continue to Recall →",()=>advance(n,0)));return}
if(v===1){
const box=mk("div","lesson-box");box.append(mk("h3",null,"02 · REINFORCE — FLASHCARD"),mk("p",null,n.reinforce.question));if(revealed)box.append(mk("div","notice good",n.reinforce.answer));
body.append(box,btn(revealed?"Hide Answer":"Reveal Answer",()=>{revealed=!revealed;renderPanel()},true));
if(revealed)body.append(btn("I recalled it · Continue to Practice →",()=>advance(n,1)));return;
}
quiz(n,v===2?"practice":v===3?"test":"review",v,body);
}
function resetPath(id){
const set=new Set([id]);let changed=true;while(changed){changed=false;for(const n of course.nodes)if(!set.has(n.id)&&n.prerequisites.some(p=>set.has(p))){set.add(n.id);changed=true}}
if(!confirm("Reset "+set.size+" concept(s), including all downstream dependents?"))return;
set.forEach(x=>delete progress[x]);save();refresh();renderPanel();
}
function modal(title,fill){$("modalTitle").textContent=title;$("modalBody").replaceChildren();fill($("modalBody"));$("modalLayer").classList.add("open");$("modalLayer").setAttribute("aria-hidden","false")}
function closeModal(){$("modalLayer").classList.remove("open");$("modalLayer").setAttribute("aria-hidden","true")}
function exportCourse(){
const blob=new Blob([JSON.stringify({...course,progress},null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=mk("a");a.href=url;a.download="SDGGold-course.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
// There is ONE supported course import entrypoint: Import Studio (sdggold-course-v2).
// Previous versions opened a legacy raw-JSON form here that rejected valid v2 packages
// because the title lives at course.title rather than title.
function importCourse(){
  closeModal();
  nav("studio");
  // Focus the modern file chooser once its asynchronously loaded panel is mounted.
  // The user can also paste a full JSON or import numbered JSONL batches there.
}
function options(){
modal("Tree Options",body=>{
body.append(mk("p",null,"Gold mastery requires five consecutive learning checkpoints. No descendant can unlock until EVERY required ancestor is gold."));
body.append(btn("Settings · Templates & Examples",()=>{closeModal();window.SDGReferenceSettings?.open()}),btn("Import / Update Course",importCourse),btn("Export Course",exportCourse,true),btn("Fit to Screen",()=>{closeModal();fitTree()},true));
body.append(btn("Reset All Progress",()=>{if(confirm("Clear all progress?")){progress={};save();refresh();closeModal()}},true));
body.append(btn("Restore Sample Course",()=>{if(confirm("Restore sample course and demo progress?")){course=SAMPLE;progress={observation:5,questions:5,comparison:5,evidence:3,synthesis:2};saved=[];recent=[];localStorage.removeItem(COURSE_STORE);save();refresh();closeModal();fitTree()}},true));
body.append(mk("p",null,"Sample gold progress is demonstration data. Course import runs through Import Studio, which also supports Google sign-in and versioned Supabase course storage. Learning progress is stored locally."));
});
}
function setSection(s){section=s;document.querySelectorAll(".sidebutton").forEach(b=>b.classList.toggle("active",b.dataset.section===s));renderGraph();if(s==="saved"&&!saved.length)modal("Saved Concepts",b=>b.append(mk("p",null,"Open a concept and click Save Concept to add it here.")))}
function nav(view){
document.querySelectorAll(".navbtn").forEach(b=>b.setAttribute("aria-current",b.dataset.view===view?"page":"false"));
if(view==="studio"){window.SDGCourseStudio?.open();return}
window.SDGCourseStudio?.close();
if(view==="progression"){closeModal();return}
if(view==="learn"||view==="practice"){const n=focus();if(n)open(n.id);else modal("Course Complete",b=>b.append(mk("p",null,"All concepts are mastered.")));return}
if(view==="review")modal("Review",b=>{const list=course.nodes.filter(n=>level(n.id)>0);if(!list.length)b.append(mk("p",null,"Begin learning to create a review list."));list.forEach(n=>b.append(btn(n.title+" · "+level(n.id)+"/5",()=>{closeModal();open(n.id)},true)))});
if(view==="insights")modal("Insights",b=>{const mastered=course.nodes.filter(n=>level(n.id)===5).length;b.append(mk("p",null,mastered+" of "+course.nodes.length+" concepts mastered. Every node follows Learn → Recall → Practice → Test → Mastery Review."))});
}
// Zoom transforms the already-rendered graph without rebuilding hundreds of nodes.
 // Wheel/pinch zoom stays anchored to the pointer; +/- buttons use viewport center.
function setZoom(value,anchor){
 const v=$("viewport"),graph=$("graph"),spacer=$("spacer"),G=window.SDGTreeGestures;
 const next=G.clampZoom(value),before=zoom;
 if(Math.abs(next-before)<.00001)return;
 const rect=v.getBoundingClientRect();
 const ax=Number.isFinite(anchor?.clientX)?anchor.clientX-rect.left:v.clientWidth/2;
 const ay=Number.isFinite(anchor?.clientY)?anchor.clientY-rect.top:v.clientHeight/2;
 const target=G.anchorZoom(before,next,v.scrollLeft,v.scrollTop,ax,ay);
 zoom=next;
 const width=parseFloat(graph.style.width)||positions().width;
 const height=parseFloat(graph.style.height)||positions().height;
 graph.style.transform="scale("+zoom+")";
 spacer.style.width=Math.ceil(width*zoom)+"px";
 spacer.style.height=Math.ceil(height*zoom)+"px";
 v.scrollLeft=target.left;v.scrollTop=target.top;
 $("zoomValue").textContent=Math.round(zoom*100)+"%";
}
function fitTree(){
 const d=positions(),v=$("viewport");
 setZoom(Math.max(.18,Math.min(1.15,Math.min(v.clientWidth/d.width,v.clientHeight/d.height))));
 v.scrollLeft=0;v.scrollTop=0;
}
const SIDEBAR_STATE_KEY="sdggold.sidebar.collapsed.v1";
function setSidebarCollapsed(collapsed,persist=true){
 const root=$("app"),toggle=$("sidebarToggle");
 root.classList.toggle("sidebar-collapsed",!!collapsed);
 toggle.setAttribute("aria-expanded",String(!collapsed));
 toggle.setAttribute("aria-label",collapsed?"Expand sidebar":"Collapse sidebar");
 toggle.title=collapsed?"Expand sidebar":"Collapse sidebar";
 const arrow=toggle.querySelector("span");
 if(arrow)arrow.textContent=collapsed?"›":"‹";
 if(persist)try{localStorage.setItem(SIDEBAR_STATE_KEY,collapsed?"1":"0")}catch(e){console.warn("Sidebar preference not persisted",e)}
}
function initSidebar(){
 let stored=null;
 try{stored=localStorage.getItem(SIDEBAR_STATE_KEY)}catch{}
 const defaultCollapsed=typeof matchMedia==="function"&&matchMedia("(max-width:650px)").matches;
 setSidebarCollapsed(stored==="1"||(stored===null&&defaultCollapsed),false);
 $("sidebarToggle").addEventListener("click",()=>setSidebarCollapsed(!$("app").classList.contains("sidebar-collapsed")));
 document.querySelectorAll(".sidebar-compact-control").forEach(button=>button.addEventListener("click",()=>{
   const target=button.dataset.expandControl;
   setSidebarCollapsed(false);
   requestAnimationFrame(()=>$(target)?.focus());
 }));
 document.querySelectorAll(".sidebutton").forEach(button=>{
   const name=button.querySelector(".side-label")?.textContent.trim();
   if(name){button.title=name;button.setAttribute("aria-label",name)}
 });
}
$("closePanel").addEventListener("click",closePanel);$("panelLayer").addEventListener("click",e=>{if(e.target===$("panelLayer"))closePanel()});
$("closeModal").addEventListener("click",closeModal);$("modalLayer").addEventListener("click",e=>{if(e.target===$("modalLayer"))closeModal()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeModal();closePanel()}});
document.querySelectorAll(".navbtn").forEach(b=>b.addEventListener("click",()=>nav(b.dataset.view)));
document.querySelectorAll(".sidebutton").forEach(b=>b.addEventListener("click",()=>setSection(b.dataset.section)));
document.querySelectorAll(".checkline input").forEach(b=>b.addEventListener("change",renderGraph));
["search","subject","level","type"].forEach(id=>$(id).addEventListener(id==="search"?"input":"change",renderGraph));
$("treeOptions").addEventListener("click",options);
initSidebar();
window.SDGTreeGestures.attach({viewport:$("viewport"),getZoom:()=>zoom,setZoom});
$("settingsButton").addEventListener("click",()=>window.SDGReferenceSettings?.open());$("zoomOut").addEventListener("click",()=>setZoom(zoom-.1));$("zoomIn").addEventListener("click",()=>setZoom(zoom+.1));$("zoomFit").addEventListener("click",fitTree);
$("account").addEventListener("click",()=>modal("Local Learning Profile",b=>b.append(mk("p",null,"Progress is stored in this browser. Google login is planned but not active."))));
$("notifications").addEventListener("click",()=>modal("Notifications",b=>b.append(mk("p",null,"No new notifications. Your next milestone is shown in the progress footer."))));
function sanitizeProgress(){
  const previous=JSON.stringify(progress);
  for(const n of [...course.nodes].sort((a,b)=>a.tier-b.tier)){
    if(n.prerequisites.some(id=>level(id)!==5))delete progress[n.id];
  }
  if(previous!==JSON.stringify(progress))save();
}
let activeCourseImportStarted=false;
window.SDGGoldAcceptCourse=async function(candidate){
  activeCourseImportStarted=true;
  if(candidate?.schema==="sdggold-course-v2"){
    const audit=window.SDGCoursePackage?.audit(candidate);
    if(!audit?.ok)throw Error("Course fails strict v2 validation ("+(audit?.errors.length||0)+" errors).");
  }
  const next={...candidate,version:4,title:candidate.title||candidate.course?.title,
    subtitle:candidate.subtitle||candidate.course?.subtitle||"",nodes:candidate.nodes};
  validate(next);
  const old=course,existing=progress;
  const oldId=old?.course?.course_id,nextId=next?.course?.course_id;
  const preserve=!!oldId&&oldId===nextId;
  const original=new Map((old.nodes||[]).map(n=>[n.id,n]));
  const accepted={};
  if(preserve){
    for(const node of next.nodes){
      const previous=original.get(node.id);
      if(previous&&JSON.stringify([previous.learn,previous.example,previous.reinforce,previous.practice,previous.test,previous.review,previous.prerequisites])===
           JSON.stringify([node.learn,node.example,node.reinforce,node.practice,node.test,node.review,node.prerequisites])){
        if(existing[node.id]>0)accepted[node.id]=existing[node.id];
      }
    }
  }
  // Large course volumes belong in IndexedDB; localStorage alone is too small for books.
  try{
    await window.SDGArchitectStore.put("jobs",{id:"active-course-v2",title:next.title,package:next,updated:new Date().toISOString()});
    localStorage.removeItem(COURSE_STORE);
  }catch(e){
    const serial=JSON.stringify(next);
    if(serial.length>2000000)throw Error("Browser storage cannot hold this large course. Enable IndexedDB or free browser storage and retry.");
    localStorage.setItem(COURSE_STORE,serial);
  }
  course=next;progress=accepted;
  saved=saved.filter(id=>next.nodes.some(n=>n.id===id));
  recent=recent.filter(id=>next.nodes.some(n=>n.id===id));
  sanitizeProgress();save();
  section="all";$("search").value="";
  refresh();requestAnimationFrame(fitTree);
};
async function restoreLargeCourse(){
  try{
    const entry=await window.SDGArchitectStore?.get("jobs","active-course-v2");
    if(!entry?.package||activeCourseImportStarted)return;
    const candidate=entry.package;
    if(candidate.schema==="sdggold-course-v2"&&!window.SDGCoursePackage?.audit(candidate).ok)return;
    validate(candidate);
    course=candidate;
    const cached=stored(STORE);
    progress=cached?.title===candidate.title?cached.levels||{}:{};
    sanitizeProgress();refresh();requestAnimationFrame(fitTree);
  }catch(e){console.warn("IndexedDB course restoration unavailable",e)}
}
validate(SAMPLE);sanitizeProgress();refresh();requestAnimationFrame(fitTree);
void restoreLargeCourse();
if(new URLSearchParams(location.search).has("course"))requestAnimationFrame(()=>nav("studio"));
if("serviceWorker" in navigator&&location.protocol==="https:"){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(e=>console.warn("Offline installation unavailable",e)))}
