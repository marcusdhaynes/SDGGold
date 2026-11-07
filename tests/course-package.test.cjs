"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),V=require("../course-package.js");
const canonical=require("../EXAMPLE_COMPLETE_COURSE.json");
const copy=o=>JSON.parse(JSON.stringify(o));
test("canonical example is COMPLETE and validates with no structural errors",()=>{
 const r=V.audit(canonical);
 assert.equal(r.ok,true,JSON.stringify(r.errors,null,2));
 assert.equal(r.errors.length,0);
 assert.equal(r.metrics.nodes,10);
 assert.equal(r.metrics.tracks,3);
 assert.equal(r.metrics.roots,2);
 assert.ok(r.metrics.merges>=2);
 assert.equal(r.metrics.mastery_nodes,0); // reserved metric; validated via explicit terminal check
 assert.equal(canonical.course.mastery_node_id,"mastery");
});
test("every canonical concept has five authored phases and source links",()=>{
 for(const n of canonical.nodes){
  assert.ok(n.learn.length>40);
  assert.ok(n.example);
  assert.ok(n.reinforce.question&&n.reinforce.answer);
  for(const key of ["practice","test","review"]){
   assert.ok(n[key].choices[n[key].correct],"valid answer for "+n.id+"/"+key);
   assert.ok(n[key].explanation);
  }
  assert.equal(new Set(["practice","test","review"].map(k=>n[k].question.toLowerCase())).size,3);
  assert.ok(n.source_refs.length);
 }
});
test("a missing prerequisite fails before course installation",()=>{
 const x=copy(canonical);x.nodes.find(n=>n.id==="test").prerequisites.push("does-not-exist");
 const r=V.audit(x);assert.equal(r.ok,false);assert.ok(r.errors.some(e=>e.code==="missing_parent"));
});
test("a backwards or same-tier prerequisite is prohibited",()=>{
 const x=copy(canonical);const target=x.nodes.find(n=>n.id==="compare");
 target.prerequisites=["mastery"];target.prerequisite_rationales={mastery:"Invalid"};
 assert.ok(V.audit(x).errors.some(e=>e.code==="prerequisite_order"));
});
test("all routes converge on one final mastery and no disconnected branch can be accepted",()=>{
 const x=copy(canonical);x.nodes.find(n=>n.id==="record").prerequisites=[];
 assert.equal(V.audit(x).ok,false);
});
test("five-phase assessments must be distinct and have valid answer indices",()=>{
 const x=copy(canonical);x.nodes[0].review.question=x.nodes[0].test.question;
 assert.ok(V.audit(x).errors.some(e=>e.code==="repeated_assessment"));
 const y=copy(canonical);y.nodes[0].test.correct=12;
 assert.ok(V.audit(y).errors.some(e=>e.code==="assessment"));
});
test("source, track and outcome references must resolve",()=>{
 const x=copy(canonical);x.nodes[0].source_refs=[{source_id:"ghost",locator:"p.1"}];
 assert.ok(V.audit(x).errors.some(e=>e.code==="source_ref"));
 const y=copy(canonical);y.nodes[0].track_ids=["ghost"];
 assert.ok(V.audit(y).errors.some(e=>e.code==="node_tracks"));
});
test("complete package JSON parses directly",()=>{
 const data=V.parse(JSON.stringify(canonical));
 assert.equal(data.mode,"package");
 assert.equal(V.assembleParts([{parsed:data}]).nodes.length,10);
});
function batchFiles(p,batchSize=3){
 const nodes=p.nodes,items=[];
 for(let i=0;i<nodes.length;i+=batchSize){
  const num=Math.floor(i/batchSize)+1;
  const records=[{record_type:"course_manifest",schema:V.VERSION,batch_id:"B"+num,package:{schema:V.VERSION,course:p.course,tracks:p.tracks,sources:p.sources,coverage:p.coverage,quality:p.quality}}];
  records.push(...nodes.slice(i,i+batchSize).map(n=>({record_type:"node",batch_id:"B"+num,node:n})));
  if(i+batchSize>=nodes.length)records.push({record_type:"course_end",complete:true,expected_nodes:nodes.length,expected_batches:Math.ceil(nodes.length/batchSize),expected_node_ids:nodes.map(n=>n.id)});
  items.push({name:"Batch"+num+".jsonl",content:records.map(r=>JSON.stringify(r)).join("\n")+"\n"});
 }
 return items;
}
test("fully numbered JSONL batches reassemble to canonical package in any upload order",()=>{
 const parts=batchFiles(canonical);
 const inputs=[parts[2],parts[0],parts[3],parts[1]];
 const assembled=V.assembleParts(inputs);
 assert.deepEqual(assembled.nodes.map(n=>n.id).sort(),canonical.nodes.map(n=>n.id).sort());
 assert.equal(V.audit(assembled).ok,true);
});
test("missing final or missing node batch cannot be marked complete",()=>{
 const parts=batchFiles(canonical);
 assert.throws(()=>V.assembleParts(parts.slice(0,-1)),/Missing final course_end/);
 assert.throws(()=>V.assembleParts([parts[0],parts[1],parts[3]]),/mismatch/);
});
test("duplicate authored node IDs across batches fail instead of overwriting",()=>{
 const parts=batchFiles(canonical);
 assert.throws(()=>V.assembleParts([parts[0],parts[0],...parts.slice(1)]),/duplicate node ID/);
});
test("manifest from an unrelated course cannot corrupt package",()=>{
 const parts=batchFiles(canonical),mixed=copy(canonical);
 mixed.course.course_id="another-course";
 parts[1].content=parts[1].content.replaceAll(canonical.course.course_id,mixed.course.course_id);
 assert.throws(()=>V.assembleParts(parts),/Conflicting course identity/);
});
test("source gaps remain visible instead of pretending source coverage is complete",()=>{
 const x=copy(canonical);x.coverage.status="partial";x.coverage.source_ledger[0].missing_locators=["Section 11"];
 const r=V.audit(x);assert.ok(r.ok);assert.ok(r.warnings.some(w=>w.code==="source_gap"));
});
test("stress: 1000-node hierarchical chain remains structurally valid",()=>{
 const x=copy(canonical),first=x.nodes[0],last=x.nodes.at(-1);
 const nodes=[];
 for(let i=0;i<999;i++){
  const n=copy(first);n.id="layer-"+i;n.title="Sequential Skill "+i;n.tier=i;n.prerequisites=i?[nodes[i-1].id]:[];
  n.prerequisite_rationales=i?{[nodes[i-1].id]:"This step depends on the skill mastered directly before it."}:{};
  n.kind="concept";n.track_ids=["observe"];nodes.push(n);
 }
 const mastery=copy(last);mastery.id="mastery";mastery.tier=999;mastery.prerequisites=["layer-998"];mastery.prerequisite_rationales={"layer-998":"Final application requires the last prerequisite."};
 x.nodes=[...nodes,mastery];x.tracks=x.tracks.filter(t=>t.id==="observe");mastery.track_ids=["observe"];const r=V.audit(x);
 assert.ok(r.ok,JSON.stringify(r.errors.slice(0,4)));assert.equal(r.metrics.nodes,1000);
});
