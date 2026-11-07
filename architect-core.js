/* SDGGold Curriculum Architect core — deterministic, no dependencies, no network calls. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.SDGArchitectCore=api})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const MAX_NODES=1000,MAX_CHARS=6500;
const clean=s=>String(s==null?"":s).replace(/\s+/g," ").trim();
const slug=s=>clean(s).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,56)||"concept";
const uniq=a=>[...new Set(a.filter(Boolean))];
const clone=o=>JSON.parse(JSON.stringify(o));
const byId=list=>new Map(list.map(x=>[x.id,x]));
function passagesFromText(text,sourceId,locator="document",maxChars=MAX_CHARS,overlap=220){
 const s=String(text||"").replace(/\r\n?/g,"\n").trim();if(!s)return [];
 const chunks=[];let start=0,number=1;
 while(start<s.length){
  let end=Math.min(start+maxChars,s.length);
  if(end<s.length){const candidates=[s.lastIndexOf("\n\n",end),s.lastIndexOf("\n",end),s.lastIndexOf(". ",end)];const boundary=candidates.find(x=>x>start+maxChars*.58);if(boundary)end=boundary+1}
  if(end<=start)end=Math.min(start+maxChars,s.length);
  const part=s.slice(start,end).trim();
  if(part)chunks.push({record_type:"passage",source_id:sourceId,chunk_id:sourceId+"-P"+String(number).padStart(5,"0"),locator:locator+" · characters "+(start+1)+"–"+end,text:part,coverage:"direct_text",confidence:"high"});
  if(end===s.length)break;
  start=Math.max(end-overlap,start+1);number++;
  if(number>30000)throw Error("Source exceeds maximum chunk count. Split into more files.");
 }
 return chunks;
}
function packet(){
 return {schema:"sdggold-preprocess-v1",manifests:[],sources:[],passages:[],concepts:[],gaps:[],batches:[],issues:[]};
}
function packetRecords(text,label="packet"){
 const source=String(text||"").replace(/^\uFEFF/,"").trim();if(!source)return [];
 try{const obj=JSON.parse(source);if(Array.isArray(obj))return obj;if(Array.isArray(obj.records))return obj.records;if(obj.record_type)return [obj];if(obj.schema==="sdggold-preprocess-v1"){const records=[];for(const [key,kind] of [["sources","source"],["passages","passage"],["concepts","concept"],["gaps","gap"]])for(const entry of obj[key]||[])records.push({record_type:kind,...entry});if(obj.manifest)records.unshift({record_type:"manifest",...obj.manifest});return records}}
 catch(e){/* newline-delimited records follow */}
 const records=[];let row=0;
 for(const line of source.split(/\r?\n/)){row++;const s=line.trim();if(!s)continue;try{const record=JSON.parse(s);if(!record||typeof record!=="object"||!record.record_type)throw Error("Record type missing");records.push(record)}catch(e){throw Error(label+" line "+row+": "+e.message)}}
 return records;
}
function ingestPackets(base,records,label="packet"){
 const p=base||packet(),allowed=new Set(["manifest","source","passage","concept","gap","batch_end"]),keyFor={source:"source_id",passage:"chunk_id",concept:"concept_id",gap:"gap_id",manifest:"batch_id",batch_end:"batch_id"};
 const destFor={manifest:"manifests",source:"sources",passage:"passages",concept:"concepts",gap:"gaps",batch_end:"batches"};
 for(let i=0;i<records.length;i++){
  const r=records[i];if(!r||!allowed.has(r.record_type))throw Error(label+" record "+(i+1)+": unknown record_type");
  if(r.record_type==="manifest"&&r.schema!=="sdggold-preprocess-v1")throw Error(label+": unsupported packet schema");
  const k=keyFor[r.record_type],id=clean(r[k]);if(!id)throw Error(label+" record "+(i+1)+" is missing "+k);
  if(r.record_type==="passage"&&(!clean(r.source_id)||typeof r.text!=="string"))throw Error("Invalid passage "+id);
  if(r.record_type==="concept"&&(!clean(r.title)||!clean(r.definition)))throw Error("Invalid concept "+id);
  const arr=p[destFor[r.record_type]],old=arr.find(x=>String(x[k])===id);
  if(old){if(JSON.stringify(old)!==JSON.stringify(r))p.issues.push({severity:"review",code:"duplicate_identifier",detail:"Conflicting "+r.record_type+" ID "+id+" in "+label});continue}
  arr.push(r);
 }
 return p;
}
function addSource(p,title,text,format="text",locator="document"){
 const base="SRC-"+slug(title),used=new Set(p.sources.map(x=>x.source_id));let id=base,n=2;
 while(used.has(id))id=base+"-"+n++;
 const source={record_type:"source",source_id:id,title:clean(title)||id,format,author:"unknown",version:"unknown",uri:"user_upload",rights:"unknown",trust:"user_supplied",available_locators:locator,missing_locators:"none"};
 p.sources.push(source);p.passages.push(...passagesFromText(text,id,locator));
 if(!p.passages.some(x=>x.source_id===id))p.gaps.push({record_type:"gap",gap_id:"EMPTY-"+id,source_id:id,locator,severity:"high",kind:"no_extractable_text",description:"This file yielded no inspectable text.",action_needed:"Supply transcription or use a capable external preprocessor."});
 return id;
}
function normalizeCandidates(records){
 const list=[],alias=new Map(),issues=[],seenKeys=new Set();
 for(const [i,c] of records.entries()){
  if(!c||!clean(c.title))continue;
  const title=clean(c.title),definition=clean(c.definition||c.learn||c.student_explanation);
  const canonical=slug(title),fingerprint=canonical+"|"+slug(definition).slice(0,32);
  const existing=alias.get(fingerprint);
  const refs=uniq([...(c.source_chunks||[]),...(c.source_refs||[]),...(c.evidence||[]).map(v=>v.chunk_id)].map(String));
  if(existing){
   existing.source_chunks=uniq([...existing.source_chunks,...refs]);
   existing.prerequisite_hints=[...existing.prerequisite_hints,...(c.prerequisite_hints||[])];
   continue;
  }
  let id=clean(c.concept_id||c.id||"C-"+canonical);
  if(seenKeys.has(id)){let n=2;while(seenKeys.has(id+"-"+n))n++;issues.push({severity:"review",code:"id_collision",detail:"Concept ID reused: "+id});id=id+"-"+n}
  seenKeys.add(id);
  const x={
   id,title,definition,student_explanation:clean(c.student_explanation||c.explanation||definition),
   everyday_example:clean(c.everyday_example||c.example),
   source_chunks:refs,prerequisite_hints:[...(c.prerequisite_hints||[])],
   kind:c.kind||"concept",subject:c.subject||"General",importance:Number(c.importance)||3,
   origin:c.origin||"explicit_source",confidence:c.confidence||"medium",
   authored:c.authored||null,uncertainty:c.uncertainty||"none",misconceptions:c.misconceptions||[],
   key_terms:c.key_terms||[],exceptions:c.exceptions||[],aliases:c.aliases||[]
  };
  alias.set(fingerprint,x);list.push(x);
 }
 return {list,issues};
}
function titleMatch(hint,map){
 const exact=map.get(String(hint));if(exact)return exact;
 const s=slug(hint),matches=[...map.values()].filter(v=>slug(v.title)===s||v.aliases.some(a=>slug(a)===s));
 return matches.length===1?matches[0]:null;
}
function synthesizeGraph(concepts,relations=[],name="New Course"){
 if(concepts.length<1)throw Error("No atomic concepts to build from.");
 if(concepts.length>MAX_NODES-1)throw Error("More than "+(MAX_NODES-1)+" concepts. Split the curriculum into linked courses or merge true duplicates.");
 const items=concepts.map(c=>({...clone(c),parents:[],edgeReasons:{}})),map=byId(items),issues=[];
 for(const n of items){
  for(const hint of n.prerequisite_hints||[]){
   if(hint.relation&&hint.relation!=="required")continue;
   const parent=titleMatch(hint.concept_id||hint.title||hint.id,map);
   if(!parent){issues.push({severity:"review",code:"unresolved_prerequisite",detail:"Unresolved prerequisite for "+n.title+": "+(hint.concept_id||hint.title||"?")});continue}
   if(parent.id!==n.id){n.parents.push(parent.id);n.edgeReasons[parent.id]=hint.why||"Source prerequisite suggestion"}
  }
 }
 for(const e of relations||[]){
  const parent=titleMatch(e.from||e.parent_id||e.parent,map),child=titleMatch(e.to||e.child_id||e.child,map);
  if(!parent||!child||parent.id===child.id){issues.push({severity:"review",code:"invalid_edge",detail:"Rejected unknown or self-connection "+JSON.stringify(e).slice(0,160)});continue}
  child.parents.push(parent.id);child.edgeReasons[parent.id]=e.why||"AI prerequisite proposal";
 }
 for(const n of items)n.parents=uniq(n.parents);
 // Remove only proven cycles, record every removed edge for review.
 function computeOrder(){
  const order=[],remaining=new Set(items.map(n=>n.id));
  while(remaining.size){
   const ready=items.filter(n=>remaining.has(n.id)&&n.parents.every(p=>!remaining.has(p))).sort((a,b)=>a.title.localeCompare(b.title));
   if(!ready.length)return {order,remaining};
   for(const n of ready){remaining.delete(n.id);order.push(n.id)}
  }
  return {order,remaining};
 }
 let loop=0;
 while(true){
  const r=computeOrder();if(!r.remaining.size)break;
  if(++loop>items.length*2)throw Error("Unable to resolve prerequisite cycles.");
  const victim=items.find(n=>r.remaining.has(n.id)&&n.parents.some(p=>r.remaining.has(p)));
  const removed=victim.parents.find(p=>r.remaining.has(p));
  victim.parents=victim.parents.filter(p=>p!==removed);
  issues.push({severity:"high",code:"cycle_repaired",detail:"Removed cyclic edge "+removed+" → "+victim.id+"; requires review"});
 }
 // Transitive reduction: edge A→C is redundant when A is already an ancestor of another direct parent of C.
 const ancestors=(id,visited=new Set())=>{const node=map.get(id);if(!node)return visited;for(const p of node.parents)if(!visited.has(p)){visited.add(p);ancestors(p,visited)}return visited};
 for(const n of items)n.parents=n.parents.filter(parent=>!n.parents.some(other=>other!==parent&&ancestors(other).has(parent)));
 const order=computeOrder().order,tier=new Map();
 for(const id of order){const n=map.get(id);tier.set(id,n.parents.length?1+Math.max(...n.parents.map(p=>tier.get(p))):0)}
 const used=new Set(items.flatMap(n=>n.parents)),ends=items.filter(n=>!used.has(n.id));
 const cap=Math.max(...tier.values(),0)+1,masterId="SDG-FINAL-MASTERY";
 if(map.has(masterId))throw Error("Reserved mastery ID collision");
 const mastery={id:masterId,title:"Integrated Mastery — "+name,definition:"Connect and apply the full set of concepts and skills in this course.",student_explanation:"Use everything learned together to solve meaningful new problems.",everyday_example:"Teach a new person how each branch works with the others.",source_chunks:[],prerequisite_hints:[],kind:"milestone",subject:"Integrated",importance:5,origin:"synthesis",confidence:"review",authored:null,uncertainty:"review",misconceptions:[],key_terms:[],exceptions:[],aliases:[],parents:ends.map(n=>n.id),edgeReasons:{},tier:cap};
 items.push(mastery);
 for(const n of items)if(n!==mastery)n.tier=tier.get(n.id);
 // Path-aware stable lanes. Independent foundations can begin at distinct places; downstream merges average parent positions.
 const groups=new Map();
 for(const n of items){const v=groups.get(n.tier)||[];v.push(n);groups.set(n.tier,v)}
 const lanes=new Map();
 for(const [t,group] of [...groups.entries()].sort((a,b)=>a[0]-b[0])){
  group.sort((a,b)=>{
   const anchor=n=>n.parents.length?n.parents.reduce((sum,p)=>sum+(lanes.get(p)||0),0)/n.parents.length:n.title.localeCompare("")/1000;
   return anchor(a)-anchor(b)||a.title.localeCompare(b.title);
  });
  group.forEach((n,i)=>{lanes.set(n.id,i);n.lane=3+(i-(group.length-1)/2)*1.3});
 }
 if(ends.length>1)issues.push({severity:"info",code:"terminal_synthesis",detail:"Added a final integration milestone joining "+ends.length+" terminal strands; confirm that synthesis is conceptually appropriate."});
 return {nodes:items,issues,edge_count:items.reduce((a,n)=>a+n.parents.length,0),paths:items.filter(n=>n.tier===0).length};
}
function buildCourse(graph,options={}){
 const courseTitle=clean(options.title||"Untitled Curriculum");
 const warnings=[];
 const nodes=graph.nodes.map(c=>{
  const authored=c.authored||{};
  const definition=clean(c.definition),expl=clean(c.student_explanation)||definition;
  const learn=clean(authored.learn||[expl,definition&&definition!==expl?"Precise meaning: "+definition:"",c.exceptions?.length?"Important limits: "+c.exceptions.join("; "):""].filter(Boolean).join("\n\n"));
  const example=clean(authored.example||c.everyday_example);
  const fallback=(stage)=>{
   warnings.push({severity:"review",code:"unreviewed_question",detail:c.title+" · "+stage+" uses a basic generated knowledge check; replace with a verified pedagogical item."});
   return {question:"Which description correctly explains "+c.title+"?",choices:[definition||expl,"This idea means the opposite of its actual definition.","This concept has no meaningful definition."],correct:0,explanation:definition||expl};
  };
  const q=(key)=>{const x=authored[key];return x&&Array.isArray(x.choices)&&x.choices.length>1&&Number.isInteger(x.correct)&&x.correct>=0&&x.correct<x.choices.length?x:fallback(key)};
  if(!c.source_chunks?.length&&c.origin!=="synthesis")warnings.push({severity:"high",code:"uncited_concept",detail:c.title+" has no source passage reference."});
  return {id:c.id,title:c.title,tier:c.tier,lane:c.lane,icon:c.kind==="milestone"?"♜":c.kind==="skill"?"▥":"◆",subject:c.subject,kind:c.kind||"concept",prerequisites:c.parents,learn,example,reinforce:authored.reinforce||{question:"Explain "+c.title+" using your own words.",answer:definition||expl},practice:q("practice"),test:q("test"),review:q("review"),
   source_chunks:c.source_chunks,provenance:{origin:c.origin,confidence:c.confidence,prerequisite_rationales:c.edgeReasons,uncertainty:c.uncertainty}};
 });
 return {version:4,title:courseTitle,subtitle:options.subtitle||"From fundamental understanding to integrated mastery",nodes,warnings};
}
function audit(packetData,graph,course){
 const issues=[...(packetData.issues||[]),...(graph?.issues||[]),...(course?.warnings||[])];
 const passages=packetData.passages||[],sources=packetData.sources||[],concepts=packetData.concepts||[],listed=new Set(passages.map(p=>p.chunk_id)),cited=new Set();
 for(const n of graph?.nodes||[]){
  for(const id of n.source_chunks||[]){cited.add(id);if(!listed.has(id))issues.push({severity:"high",code:"missing_citation",detail:n.title+" references missing passage "+id})}
  if(n.origin==="inferred_foundation")issues.push({severity:"review",code:"inferred_foundation",detail:n.title+" is a prerequisite inferred beyond explicit sources."});
  if(n.uncertainty&&n.uncertainty!=="none")issues.push({severity:"review",code:"uncertain_claim",detail:n.title+": "+n.uncertainty});
 }
 const uncovered=passages.filter(p=>!cited.has(p.chunk_id));for(const p of uncovered)issues.push({severity:"review",code:"uncovered_passage",detail:p.chunk_id+" not yet linked to a concept."});
 for(const g of packetData.gaps||[])issues.push({severity:g.severity||"review",code:"source_gap",detail:(g.source_id||"?")+" "+(g.locator||"")+": "+(g.description||g.kind||"unprocessed")});
 if((packetData.batches||[]).some(b=>b.more_batches===true)&&!(packetData.batches||[]).some(b=>b.more_batches===false))issues.push({severity:"high",code:"incomplete_packets",detail:"The imported batch manifest indicates more material remains."});
 if((packetData.manifests||[]).some(m=>m.coverage_claim!=="complete"))issues.push({severity:"review",code:"partial_claim",detail:"At least one manifest declares incomplete source coverage."});
 const coverage=passages.length?Math.round(100*(passages.length-uncovered.length)/passages.length):0;
 return {sources:sources.length,passages:passages.length,concept_candidates:concepts.length,graph_nodes:graph?.nodes.length||0,coverage_percent:coverage,uncovered_passages:uncovered.map(x=>x.chunk_id),issues,high:issues.filter(i=>i.severity==="high").length,ready_for_publication:issues.every(i=>i.severity!=="high"&&i.severity!=="review")&&coverage===100};
}
return {MAX_NODES,MAX_CHARS,clean,slug,passagesFromText,packet,packetRecords,ingestPackets,addSource,normalizeCandidates,synthesizeGraph,buildCourse,audit,validatePacket:packetRecords};
});
