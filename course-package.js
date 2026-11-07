/* SDGGold v2 course-package contract — PURE deterministic checks. No AI, no network. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.SDGCoursePackage=api})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const VERSION="sdggold-course-v2",MAX_NODES=1000;
const checks=["source_inventory","source_coverage","atomic_concepts","foundation_accuracy","tracks_minimal","necessary_prerequisites","splits_and_merges","single_mastery","five_phases","assessment_answers","no_hallucinated_sources","uncertainties_reported"];
const str=x=>typeof x==="string"&&x.trim().length>0;
const uniq=x=>new Set(x).size===x.length;
const slug=s=>String(s||"").toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-|-$/g,"").slice(0,100);
function normalize(p){
 if(!p||typeof p!=="object")return p;
 // A deterministic transformation only. Never invent lessons, edges or citations.
 return p;
}
function audit(p){
 const errors=[],warnings=[],metrics={nodes:0,tracks:0,roots:0,edges:0,merges:0,splits:0,source_refs:0,covered_sources:0,mastery_nodes:0};
 const err=(code,message)=>errors.push({code,message}),warn=(code,message)=>warnings.push({code,message});
 if(!p||typeof p!=="object"||p.schema!==VERSION){err("schema","Expected schema sdggold-course-v2.");return {ok:false,errors,warnings,metrics,package:p}}
 const c=p.course;
 if(!c||!str(c.course_id)||!(/^[a-z0-9][a-z0-9-]{2,99}$/.test(c.course_id))||!str(c.title)||!Number.isInteger(c.revision)||c.revision<1||!str(c.mastery_node_id))err("course","Course identity, stable course_id, revision, title and mastery_node_id are required.");
 if(!c||!Array.isArray(c.outcomes)||!c.outcomes.length)err("outcomes","Declare one or more measurable end-of-course outcomes.");
 const outcomes=new Map();
 for(const o of c?.outcomes||[]){
  if(!str(o.id)||!str(o.title)||!str(o.description)||outcomes.has(o.id))err("outcome","Invalid or duplicated outcome.");else outcomes.set(o.id,o);
 }
 if(!Array.isArray(p.tracks)||!p.tracks.length||p.tracks.length>100)err("tracks","Declare 1–100 truly distinct, justified tracks.");
 const tracks=new Map();
 for(const t of Array.isArray(p.tracks)?p.tracks:[]){
  if(!str(t?.id)||!str(t.title)||!str(t.purpose)||!str(t.distinctness)||tracks.has(t.id))err("track","Every track needs a unique id, title, purpose and explanation of why it deserves a separate path.");else tracks.set(t.id,t);
 }
 if(!Array.isArray(p.sources)||!p.sources.length)err("sources","Supply a source inventory. Use source type 'original' for original instructional content.");
 const sources=new Map();
 for(const s of Array.isArray(p.sources)?p.sources:[]){
  if(!str(s?.id)||!str(s.title)||!str(s.rights)||sources.has(s.id))err("source","Invalid or duplicate source ID/title/rights.");else {sources.set(s.id,s);if(s.rights==="unknown")warn("rights_unknown","Source "+s.id+" has unknown publishing rights.");}
 }
 const coverage=p.coverage;
 if(!coverage||!["complete","partial"].includes(coverage.status)||!Array.isArray(coverage.source_ledger))err("coverage","Coverage must declare complete/partial status and a per-source ledger.");
 else {
  const seen=new Set();
  for(const entry of coverage.source_ledger){
   if(!sources.has(entry.source_id)||seen.has(entry.source_id)||!Array.isArray(entry.processed_locators)||!Array.isArray(entry.missing_locators))err("coverage_entry","Coverage ledger must reference every source exactly once and list processed and missing locators.");
   seen.add(entry.source_id);
   if(entry.missing_locators.length)warn("source_gap","Source "+entry.source_id+" has "+entry.missing_locators.length+" missing/unprocessed locators.");
  }
  for(const id of sources.keys())if(!seen.has(id))err("coverage_missing","Source "+id+" is absent from the coverage ledger.");
  metrics.covered_sources=[...seen].filter(id=>sources.has(id)).length;
  if(coverage.status!=="complete")warn("partial_course","External processing has declared source coverage incomplete; keep the package private.");
 }
 const quality=p.quality;
 if(!quality||!Array.isArray(quality.checklist)||!Array.isArray(quality.open_questions)||typeof quality.self_checked!=="boolean")err("quality","Missing self-check checklist and unresolved question ledger.");
 else {
  const m=new Map(quality.checklist.map(x=>[x.id,x]));
  for(const k of checks){
   if(!m.has(k)||typeof m.get(k).passed!=="boolean")err("checklist","Missing or malformed preflight check: "+k);
   else if(!m.get(k).passed)warn("preflight_failed",k+" is not confirmed by the external preprocessor.");
  }
  if(!quality.self_checked)warn("not_self_checked","The external AI has not claimed to compare the result against the example.");
  if(quality.open_questions.length)warn("open_questions",quality.open_questions.length+" unresolved questions remain for source verification.");
 }
 if(!Array.isArray(p.nodes)||p.nodes.length<2||p.nodes.length>MAX_NODES){err("node_count","One course package requires 2–1,000 authored nodes (including one final mastery). Split larger programs into course volumes.");return {ok:false,errors,warnings,metrics,package:p}}
 metrics.nodes=p.nodes.length;metrics.tracks=tracks.size;
 const nodes=new Map(),children=new Map(),questionSignatures=new Set();
 const kindSet=new Set(["concept","skill","milestone"]);
 for(const n of p.nodes){
  if(!str(n?.id)||nodes.has(n.id)){err("node_id","Missing or repeated concept ID.");continue}
  nodes.set(n.id,n);children.set(n.id,[]);
  if(!str(n.title)||!Number.isInteger(n.tier)||n.tier<0||n.tier>1000||n.lane!=null&&(!Number.isFinite(n.lane)||n.lane<-.5)||!kindSet.has(n.kind))err("node_base","Invalid title, tier, lane or concept kind: "+n.id);
  if(!Array.isArray(n.track_ids)||!n.track_ids.length||!uniq(n.track_ids)||n.track_ids.some(id=>!tracks.has(id)))err("node_tracks","Invalid track membership: "+n.id);
  if(!Array.isArray(n.prerequisites)||!uniq(n.prerequisites))err("prereq_list","Invalid prerequisite IDs: "+n.id);
  if(!str(n.learn)||n.learn.trim().length<40||!str(n.example)||!str(n.reinforce?.question)||!str(n.reinforce?.answer))err("five_phases","Missing substantive Learn, Example or Recall content in "+n.id);
  const qa=new Set();
  for(const stage of ["practice","test","review"]){
   const q=n[stage];
   if(!q||!str(q.question)||!Array.isArray(q.choices)||q.choices.length<2||q.choices.length>8||!q.choices.every(str)||!uniq(q.choices.map(x=>x.trim().toLowerCase()))||!Number.isInteger(q.correct)||q.correct<0||q.correct>=q.choices.length||!str(q.explanation)){
    err("assessment","Missing/invalid "+stage+" assessment in "+n.id);continue;
   }
   const sig=q.question.trim().toLowerCase().replace(/\s+/g," ");
   if(qa.has(sig))err("repeated_assessment","Assessments for "+n.id+" must ask different questions across Practice, Test and Review.");
   qa.add(sig);questionSignatures.add(n.id+"|"+sig);
  }
  if(!Array.isArray(n.source_refs))err("provenance","Node "+n.id+" needs source_refs (empty allowed only for marked synthesis).");
  else for(const r of n.source_refs){
   metrics.source_refs++;
   if(!sources.has(r?.source_id)||!str(r?.locator))err("source_ref","Bad source reference for "+n.id);
  }
  if(n.source_refs?.length===0&&n.kind!=="milestone")warn("uncited","Concept "+n.id+" has no cited source passage; inspect before publishing.");
  if(!Array.isArray(n.outcome_ids)||!n.outcome_ids.every(id=>outcomes.has(id)))err("outcome_links","Node "+n.id+" has unknown outcomes.");
  if(!n.prerequisite_rationales||typeof n.prerequisite_rationales!=="object"||Array.isArray(n.prerequisite_rationales))err("edge_reason","Node "+n.id+" needs a prerequisite_rationales object.");
  if(n.uncertainty&&n.uncertainty!=="none")warn("uncertainty",n.id+": "+n.uncertainty);
 }
 const roots=[];
 for(const n of p.nodes){
  if(!nodes.has(n?.id))continue;
  if(!Array.isArray(n.prerequisites))continue;
  if(!n.prerequisites.length){roots.push(n.id);if(n.tier!==0)err("foundation_tier","Foundational node "+n.id+" must be tier 0.");}
  else if(n.tier===0)err("root_tier","Tier 0 cannot have prerequisites: "+n.id);
  for(const parentId of n.prerequisites){
   const parent=nodes.get(parentId);
   if(!parent){err("missing_parent","Unknown prerequisite "+parentId+" → "+n.id);continue}
   if(parent.tier>=n.tier)err("prerequisite_order","Every prerequisite must come from a strictly earlier tier: "+parentId+" → "+n.id);
   if(!str(n.prerequisite_rationales?.[parentId]))err("missing_rationale","Explain why "+parentId+" is genuinely necessary before "+n.id);
   children.get(parentId).push(n.id);metrics.edges++;
  }
  if(n.prerequisite_rationales){for(const id of Object.keys(n.prerequisite_rationales))if(!n.prerequisites.includes(id))warn("extra_rationale","Unused dependency rationale "+id+" in "+n.id)}
  if(n.prerequisites.length>1)metrics.merges++;
 }
 metrics.roots=roots.length;metrics.splits=[...children.values()].filter(a=>a.length>1).length;
 if(!roots.length)err("no_foundations","Tree has no foundation starting points.");
 const terminals=[...nodes.keys()].filter(id=>children.get(id)?.length===0);
 metrics.mastery_nodes=terminals.filter(id=>id===c?.mastery_node_id&&nodes.get(id)?.kind==="milestone").length;
 if(terminals.length!==1||terminals[0]!==c?.mastery_node_id)err("mastery_terminal","Every path must lead to exactly one declared mastery node, not several terminal strands.");
 const final=nodes.get(c?.mastery_node_id);
 if(!final||final.kind!=="milestone")err("mastery_kind","Final mastery node must be a milestone.");
 if(final&&new Set(final.outcome_ids||[]).size!==outcomes.size)warn("mastery_outcomes","Final mastery does not explicitly assess all declared course outcomes.");
 if(final&&tracks.size>1&&final.prerequisites?.length>8)
  warn("mastery_fan_in","Final mastery directly requires "+final.prerequisites.length+" concepts across "+tracks.size+" tracks. This is valid but produces a flat, difficult-to-understand convergence. Consider fully authored, authentic track-synthesis milestones with all five phases; never delete real requirements.");
 const genericRationales=p.nodes.flatMap(n=>Object.values(n.prerequisite_rationales||{}))
  .filter(value=>typeof value==="string"&&/^understanding .+ provides the required foundation for .+\.?$/i.test(value.trim())).length;
 if(genericRationales>=5)
  warn("boilerplate_rationales",genericRationales+" prerequisite explanations use generic 'Understanding X provides the required foundation for Y' wording. Have external ChatGPT justify the particular knowledge transfer behind every link.");

 const visited=new Set();
 function ancestor(id){if(visited.has(id))return;visited.add(id);for(const p of nodes.get(id)?.prerequisites||[])if(nodes.has(p))ancestor(p)}
 if(final)ancestor(final.id);
 for(const id of nodes.keys())if(!visited.has(id))err("disconnected","Concept "+id+" does not lead to final mastery.");
 for(const [id,links] of children)if(links.length>1&&nodes.get(id)?.kind==="milestone"&&id!==c?.mastery_node_id)warn("intermediate_milestone","Intermediate milestone "+id+" has multiple downstream branches; confirm design.");
 // Redundant ancestor edges add visual noise but do not permit skipping; identify them for editor review.
 for(const n of p.nodes){
  const reach=(id,seen=new Set())=>{if(seen.has(id))return seen;seen.add(id);for(const par of nodes.get(id)?.prerequisites||[])if(nodes.has(par))reach(par,seen);return seen};
  for(const id of n.prerequisites||[])if((n.prerequisites||[]).some(other=>other!==id&&reach(other).has(id)))warn("redundant_edge",id+" → "+n.id+" duplicates a transitive prerequisite path.");
 }
 for(const t of tracks.values())if(!p.nodes.some(n=>n.track_ids?.includes(t.id)))err("unused_track","Track "+t.id+" contains no concepts.");
 // Deterministic checks prove structural validity only, not the correctness of the source claims or pedagogical judgment.
 warn("human_review","Structural validation cannot prove factual accuracy, source completeness or ideal pedagogy. Review the content before publication.");
 return {ok:errors.length===0,errors,warnings,metrics,package:normalize(p)};
}
function parse(text,filename="input"){
 const raw=String(text||"").replace(/^\uFEFF/,"").trim();
 if(!raw)throw Error("Empty input: "+filename);
 try{
  const value=JSON.parse(raw);
  if(value?.schema===VERSION&&Array.isArray(value.nodes))return {mode:"package",package:value};
  if(Array.isArray(value)&&value.every(x=>x&&x.record_type))return {mode:"records",records:value};
  if(value?.record_type)return {mode:"records",records:[value]};
 }catch(e){/* try JSON Lines */}
 const records=[];let line=0;
 for(const entry of raw.split(/\r?\n/)){
  line++;if(!entry.trim())continue;
  let item;try{item=JSON.parse(entry)}catch(e){throw Error(filename+" line "+line+": "+e.message)}
  if(!item||typeof item.record_type!=="string")throw Error(filename+" line "+line+": record_type required");
  records.push(item);
 }
 if(!records.length)throw Error("No valid records in "+filename);
 return {mode:"records",records};
}
function assembleParts(inputs){
 const manifests=[],ends=[],nodes=[],sourceExtras=[],trackExtras=[],coverageParts=[],qualityParts=[];
 const nodeIds=new Set(),inputNames=[];
 for(const entry of inputs){
  inputNames.push(entry.name||"input");
  const content=entry.parsed||parse(entry.content,entry.name);
  if(content.mode==="package"){
   if(inputs.length!==1)throw Error("Complete JSON packages cannot be mixed with batch record files.");
   return content.package;
  }
  for(const r of content.records){
   if(r.record_type==="course_manifest"){manifests.push(r);continue}
   if(r.record_type==="node"){
    const n=r.node||Object.fromEntries(Object.entries(r).filter(([k])=>!["record_type","batch_id"].includes(k)));
    if(!str(n.id)||nodeIds.has(n.id))throw Error("Missing or duplicate node ID across batches: "+String(n.id));
    nodeIds.add(n.id);nodes.push(n);continue;
   }
   if(r.record_type==="source"){sourceExtras.push(r.source||r);continue}
   if(r.record_type==="track"){trackExtras.push(r.track||r);continue}
   if(r.record_type==="coverage"){coverageParts.push(r.coverage||r);continue}
   if(r.record_type==="quality"){qualityParts.push(r.quality||r);continue}
   if(r.record_type==="course_end"){ends.push(r);continue}
   throw Error("Unknown course-package record type: "+r.record_type);
  }
 }
 if(!manifests.length)throw Error("Missing course_manifest record. Import the first batch of the course.");
 const first=manifests[0],base=first.package||first;
 if((base.schema||first.schema)!==VERSION)throw Error("Unsupported course schema (requires sdggold-course-v2).");
 const course=base.course;
 if(!course||!str(course.course_id))throw Error("First manifest must include complete course identity.");
 for(const m of manifests){
  const candidate=(m.package||m).course;
  if(!candidate||candidate.course_id!==course.course_id||candidate.revision!==course.revision)throw Error("Conflicting course identity or revision between batches.");
 }
 if(!ends.length||!ends.some(e=>e.complete===true))throw Error("Missing final course_end record with complete=true; more batches are expected.");
 const end=ends.find(e=>e.complete===true);
 if(!Number.isInteger(end.expected_nodes)||end.expected_nodes!==nodes.length)throw Error("Batch completion count mismatch: expected "+end.expected_nodes+", received "+nodes.length+".");
 if(end.expected_batches&&manifests.length!==end.expected_batches)throw Error("Some course batches are missing: expected "+end.expected_batches+", received "+manifests.length);
 if(end.expected_node_ids&&(!Array.isArray(end.expected_node_ids)||end.expected_node_ids.some(id=>!nodeIds.has(id))||end.expected_node_ids.length!==nodes.length))throw Error("Final node manifest does not match imported nodes.");
 const uniqueMerge=(a,b,id)=>{const map=new Map();for(const v of [...a,...b]){const key=v[id];if(!key)throw Error("Source/track entry missing "+id);if(map.has(key)&&JSON.stringify(map.get(key))!==JSON.stringify(v))throw Error("Conflicting "+id+" values across batches: "+key);map.set(key,v)}return [...map.values()]};
 const sources=uniqueMerge(base.sources||[],sourceExtras,"id"),tracks=uniqueMerge(base.tracks||[],trackExtras,"id");
 const coverage=coverageParts.length?coverageParts[coverageParts.length-1]:base.coverage;
 const quality=qualityParts.length?qualityParts[qualityParts.length-1]:base.quality;
 return {schema:VERSION,course,sources,tracks,coverage,quality,nodes};
}
return {VERSION,MAX_NODES,checks,parse,assembleParts,audit};
});
