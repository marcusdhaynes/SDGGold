/* SDGGold AI Curriculum Architect: resumable, bounded, source-grounded map → plan → author → audit. */
(function(root,factory){const api=factory(root.SDGArchitectCore,root.SDGArchitectStore);root.SDGArchitectPipeline=api})(window,function(C,Store){
"use strict";
function createJob(title="Untitled Course"){
 return {id:crypto.randomUUID(),title,created:new Date().toISOString(),updated:new Date().toISOString(),
  phase:"collect",error:"",status:"Import sources, preprocessing packets, or both.",input_chars:0,
  packet:C.packet(),extractQueue:null,extractIndex:0,planIndex:0,bridgeIndex:0,authorIndex:0,imageIndex:0,
  candidates:null,relations:[],graph:null,course:null,report:null,api_calls:0,model:"",direct_course:null};
}
async function save(job){job.updated=new Date().toISOString();await Store.put("jobs",job)}
function draft(job){
 if(job.direct_course){job.course=job.direct_course;job.phase="draft";job.report={sources:0,passages:0,concept_candidates:job.course.nodes.length,graph_nodes:job.course.nodes.length,coverage_percent:0,issues:[{severity:"review",code:"direct_course",detail:"This was a structured course import, not a source-audited AI generation."}],high:0,ready_for_publication:false};return job}
 const source=C.normalizeCandidates(job.packet.concepts);
 if(!source.list.length)throw Error("No extracted concepts. For raw documents, sign in and run AI extraction first, or upload preprocessed JSONL concept records.");
 job.candidates=source.list;
 job.graph=C.synthesizeGraph(job.candidates,job.relations,job.title);
 job.course=C.buildCourse(job.graph,{title:job.title});
 job.packet.issues.push(...source.issues);
 job.report=C.audit(job.packet,job.graph,job.course);
 job.phase="draft";job.status="Local draft created. It contains basic fallback questions and requires expert review. Not an AI-authored course.";
 return job;
}
function indices(n,size){const groups=[];for(let i=0;i<n;i+=size)groups.push([i,Math.min(i+size,n)]);return groups}
function modelCandidate(x,part,index){
 const refs=(x.source_chunks||[]).filter(id=>part.some(p=>p.chunk_id===id));
 return {record_type:"concept",concept_id:"AI-"+C.slug(x.title)+"-"+C.slug(part[0].chunk_id)+"-"+index,title:x.title,definition:x.definition,
 student_explanation:x.student_explanation,everyday_example:x.everyday_example,source_chunks:refs,
 origin:"derived_from_source",importance:x.importance,kind:x.kind,
 prerequisite_hints:(x.prerequisite_hints||[]).map(h=>({title:h.title,relation:"required",why:h.why,confidence:h.confidence})),
 misconceptions:[],exceptions:[],uncertainty:x.uncertainty||"none",confidence:x.confidence||"medium"};
}
function outline(c){return {id:c.id,title:c.title,definition:(c.definition||"").slice(0,250),importance:c.importance,prerequisite_hints:(c.prerequisite_hints||[]).slice(0,6)}}
async function aiRun(job,service,onChange=()=>{},stopped=()=>false){
 if(!service||typeof service.invoke!=="function")throw Error("Authenticated AI service is required.");
 if(job.phase==="ready"||job.phase==="draft")return job;
 if(job.phase==="collect"||job.phase==="error"){job.phase="inspect";job.error=""}
 await save(job);
 async function progress(message){
  job.status=message;await save(job);onChange(job);
 }
 async function call(mode,payload){
  if(stopped())throw Object.assign(Error("Paused safely. Resume from this checkpoint."),{paused:true});
  const data=await service.invoke(mode,payload);
  job.api_calls++;job.model=data.model||job.model;
  return data.result;
 }
 try{
  if(job.phase==="inspect"){
   const images=await Store.listAssets(job.id);
   while(job.imageIndex<images.length){
    const asset=images[job.imageIndex];await progress("Inspecting image "+(job.imageIndex+1)+"/"+images.length+" · "+asset.asset_id);
    const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(asset.blob)});
    const inspected=await call("inspect_image",{image:data});
    const text=[inspected.transcription,inspected.description].filter(Boolean).join("\n\n");
    if(text.trim())C.addSource(job.packet,asset.asset_id,text,"image_ocr","AI visual inspection");
    const added=job.packet.passages.splice(0);
    for(const p of added)await Store.savePassage(job.id,p);
    for(const line of inspected.missing_or_unclear||[])job.packet.gaps.push({record_type:"gap",gap_id:"IMG-"+job.imageIndex+"-"+C.slug(line),source_id:asset.asset_id,locator:"image",severity:"review",kind:"unclear_visual",description:line});
    job.imageIndex++;await save(job);
   }
   job.phase="extract";await save(job);
  }
  const passages=await Store.listPassages(job.id),byPassage=new Map(passages.map(p=>[p.chunk_id,p]));
  if(job.phase==="extract"){
   if(!job.extractQueue){
    const already=new Set((job.packet.concepts||[]).flatMap(c=>c.source_chunks||[]));
    job.extractQueue=passages.filter(p=>!already.has(p.chunk_id)&&p.text?.length>39).map(p=>p.chunk_id);
    for(const p of passages.filter(p=>p.text?.length<=39))job.packet.gaps.push({record_type:"gap",gap_id:"SHORT-"+p.chunk_id,source_id:p.source_id,locator:p.locator,severity:"review",kind:"short_passage",description:"Insufficient text for semantic extraction."});
    await save(job);
   }
   while(job.extractIndex<job.extractQueue.length){
    const batch=job.extractQueue.slice(job.extractIndex,job.extractIndex+1).map(id=>byPassage.get(id)).filter(Boolean);
    await progress("Extracting atomic concepts · passage "+(job.extractIndex+1)+"/"+job.extractQueue.length);
    const out=await call("extract",{chunks:batch.map(p=>({chunk_id:p.chunk_id,source_id:p.source_id,locator:p.locator,text:p.text.slice(0,7000)})),course_goal:job.title});
    for(const [i,c] of (out.concepts||[]).entries())job.packet.concepts.push(modelCandidate(c,batch,i));
    for(const g of out.gaps||[])job.packet.gaps.push({record_type:"gap",gap_id:"AI-GAP-"+job.extractIndex+"-"+C.slug(g.description),source_id:batch[0]?.source_id||"",locator:g.chunk_id,severity:g.severity,kind:"extraction_uncertainty",description:g.description});
    job.extractIndex++;await save(job);
   }
   job.phase="plan";await save(job);
  }
  if(job.phase==="plan"){
   if(!job.candidates){
    const x=C.normalizeCandidates(job.packet.concepts);job.candidates=x.list;job.packet.issues.push(...x.issues);await save(job);
   }
   if(!job.candidates.length)throw Error("No concepts were found; check that uploaded material contains readable learning content.");
   if(job.candidates.length>=C.MAX_NODES)throw Error("Too many concepts for one tree. Split into meaningful course volumes (max 999 concepts each).");
   const groups=indices(job.candidates.length,28);
   while(job.planIndex<groups.length){
    const [start,end]=groups[job.planIndex],batch=job.candidates.slice(start,end).map(outline);
    await progress("Planning necessary prerequisites · group "+(job.planIndex+1)+"/"+groups.length);
    const plan=await call("plan",{course_goal:job.title,concepts:batch,global_foundations:job.candidates.filter(c=>c.importance>=5).slice(0,4).map(outline)});
    job.relations.push(...(plan.edges||[]));
    for(const a of plan.aliases||[])job.packet.issues.push({severity:"review",code:"ai_alias",detail:"Suggested merge "+a.duplicate_ids.join(", ")+" into "+a.canonical_id+": "+a.why});
    for(const s of plan.issues||[])job.packet.issues.push({severity:"review",code:"ai_plan",detail:s});
    for(const f of plan.missing_foundations||[]){
     const id="FOUND-"+C.slug(f.title),exists=job.candidates.some(c=>c.id===id||C.slug(c.title)===C.slug(f.title));
     if(exists)continue;
     job.candidates.push({id,title:f.title,definition:f.definition,student_explanation:f.definition,everyday_example:"",
      source_chunks:[],prerequisite_hints:[],kind:"concept",subject:"Foundations",importance:5,origin:"inferred_foundation",
      confidence:"review",uncertainty:"New foundation inferred by AI; needs a cited source.",misconceptions:[],exceptions:[],aliases:[]});
     for(const target of f.required_for||[])job.relations.push({from:id,to:target,why:f.why,confidence:"medium"});
    }
    job.planIndex++;await save(job);
   }
   job.phase="bridge";await save(job);
  }
  if(job.phase==="bridge"){
   // Overlapping windows connect separate chapter/group maps without exposing the entire huge corpus to one request.
   const bases=job.candidates.slice(0,Math.min(job.candidates.length,999));
   const groups=indices(bases.length,22);
   while(job.bridgeIndex<groups.length){
    const [start,end]=groups[job.bridgeIndex],extra=bases.slice(Math.max(0,start-5),start).map(outline),batch=[...extra,...bases.slice(start,end).map(outline)];
    if(batch.length>1){
     await progress("Reconciling cross-batch branches · window "+(job.bridgeIndex+1)+"/"+groups.length);
     const plan=await call("plan",{course_goal:job.title,concepts:batch,global_foundations:bases.filter(c=>c.importance===5).slice(0,4).map(outline)});
     job.relations.push(...(plan.edges||[]));
     for(const s of plan.issues||[])job.packet.issues.push({severity:"review",code:"cross_batch",detail:s});
    }
    job.bridgeIndex++;await save(job);
   }
   job.graph=C.synthesizeGraph(job.candidates,job.relations,job.title);
   job.phase="author";await save(job);
  }
  if(job.phase==="author"){
   const groups=indices(job.graph.nodes.length,2);
   while(job.authorIndex<groups.length){
    const [start,end]=groups[job.authorIndex],batch=job.graph.nodes.slice(start,end);
    const payload=batch.map(n=>{
     const refs=(n.source_chunks||[]).slice(0,3).map(id=>byPassage.get(id)).filter(Boolean);
     return {id:n.id,title:n.title,definition:n.definition,explanation:n.student_explanation,example:n.everyday_example,
      prerequisites:n.parents.map(id=>{const a=job.graph.nodes.find(c=>c.id===id);return {title:a?.title||id,definition:a?.definition||""}}),
      source_excerpts:refs.map(r=>({chunk_id:r.chunk_id,locator:r.locator,text:(r.text||"").slice(0,1500)})),uncertainty:n.uncertainty};
    });
    await progress("Authoring five mastery checkpoints · "+(job.authorIndex+1)+"/"+groups.length);
    const out=await call("author",{course_goal:job.title,concepts:payload});
    for(const lesson of out.lessons||[]){
     const concept=job.graph.nodes.find(n=>n.id===lesson.id);
     if(concept)concept.authored={learn:lesson.learn,example:lesson.example,reinforce:lesson.reinforce,practice:lesson.practice,test:lesson.test,review:lesson.review};
     if(lesson.uncertainty&&lesson.uncertainty!=="none")job.packet.issues.push({severity:"review",code:"author_uncertainty",detail:lesson.id+": "+lesson.uncertainty});
    }
    for(const issue of out.issues||[])job.packet.issues.push({severity:"review",code:"author_issue",detail:issue});
    job.authorIndex++;await save(job);
   }
   job.phase="audit";await save(job);
  }
  if(job.phase==="audit"){
   job.course=C.buildCourse(job.graph,{title:job.title});
   // Audit against the durable passage store, not an empty in-memory packet.
   job.report=C.audit({...job.packet,passages},job.graph,job.course);
   job.phase="ready";job.status=job.report.ready_for_publication?"AI course built. Audit passed automatic checks.":"AI course built as reviewable draft. Inspect quality report before publication.";
   job.error="";await save(job);onChange(job);
  }
  return job;
 }catch(e){
  if(e.paused){job.status=e.message;await save(job);onChange(job);return job}
  job.error=e.message||String(e);job.status="Stopped at checkpoint: "+job.error;
  await save(job);onChange(job);throw e;
 }
}
return {createJob,save,draft,aiRun};
});
