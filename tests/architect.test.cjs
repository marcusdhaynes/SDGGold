"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),C=require("../architect-core.js");
function candidate(id,title,prerequisite_hints=[]){return {id,title,definition:title+" means a precisely defined and testable idea.",student_explanation:title+" explained simply.",everyday_example:"A clear everyday example.",source_chunks:["S001-P00001"],prerequisite_hints,kind:"concept",subject:"General",importance:3,origin:"explicit_source",uncertainty:"none"}}
test("large text is split into bounded coherent passages with no missing segments",()=>{
 const s=Array.from({length:600},(_,i)=>"Paragraph "+i+": a detailed concept with several meaningful sentences.").join("\n\n");
 const p=C.passagesFromText(s,"S001");
 assert.ok(p.length>=5);assert.ok(p.every(x=>x.text.length<=6500));
 assert.ok(p[0].text.startsWith("Paragraph 0"));assert.ok(p[p.length-1].text.endsWith("sentences."));
 assert.equal(new Set(p.map(x=>x.chunk_id)).size,p.length);
});
test("preprocessor JSONL parsed correctly and unsupported schema rejected",()=>{
 const text=[
  JSON.stringify({record_type:"manifest",schema:"sdggold-preprocess-v1",batch_id:"B001",course_title:"Physics"}),
  JSON.stringify({record_type:"source",source_id:"S001",title:"Notes"}),
  JSON.stringify({record_type:"passage",source_id:"S001",chunk_id:"S001-P00001",locator:"p.1",text:"A long factual paragraph used to support a study concept."}),
  JSON.stringify({record_type:"concept",concept_id:"C001",title:"A",definition:"A concept",source_chunks:["S001-P00001"]})
 ].join("\n");
 const p=C.ingestPackets(C.packet(),C.packetRecords(text));
 assert.equal(p.sources.length,1);assert.equal(p.passages.length,1);assert.equal(p.concepts.length,1);
 assert.throws(()=>C.ingestPackets(C.packet(),[{record_type:"manifest",schema:"alien",batch_id:"B"}]),/unsupported packet schema/);
});
test("precise concept duplicate merge retains citations",()=>{
 const a={concept_id:"A",title:"Electric charge",definition:"Electric charge is a property of matter.",source_chunks:["S1"]};
 const b={concept_id:"B",title:"ELECTRIC  CHARGE",definition:"Electric charge is a property of matter.",source_chunks:["S2"]};
 const n=C.normalizeCandidates([a,b]);assert.equal(n.list.length,1);
 assert.deepEqual(n.list[0].source_chunks,["S1","S2"]);
});
test("graph distinguishes prerequisite paths, merges, and eventual mastery",()=>{
 const nodes=[
  candidate("observation","Observation"),
  candidate("questions","Questions",[{concept_id:"observation",relation:"required",why:"Need prior observations."}]),
  candidate("comparison","Comparison",[{concept_id:"observation",relation:"required",why:"Compare observed quantities."}]),
  candidate("evidence","Evidence",[{concept_id:"questions",relation:"required",why:"Evidence answers questions."}]),
  candidate("reason","Reasoning"),
  candidate("argument","Argument")
 ];
 const edges=[{from:"evidence",to:"argument",why:"Evidence supports claims."},{from:"reason",to:"argument",why:"Reasoning makes inference explicit."}];
 const g=C.synthesizeGraph(nodes,edges,"Thinking");
 const argument=g.nodes.find(n=>n.id==="argument");assert.deepEqual(argument.parents.sort(),["evidence","reason"]);
 assert.equal(g.nodes[g.nodes.length-1].kind,"milestone");
 assert.ok(g.nodes[g.nodes.length-1].parents.includes("argument"));
 assert.ok(g.nodes.every(n=>n.tier>=0));
 const course=C.buildCourse(g,{title:"Thinking"});
 assert.equal(course.nodes.length,nodes.length+1);
 assert.ok(course.nodes.every(n=>n.reinforce&&n.test&&n.review));
});
test("transitive redundant dependency removed without bypassing true ancestors",()=>{
 const a=candidate("a","Foundation"),b=candidate("b","Middle"),c=candidate("c","Advanced");
 const g=C.synthesizeGraph([a,b,c],[{from:"a",to:"b"},{from:"b",to:"c"},{from:"a",to:"c"}]);
 assert.deepEqual(g.nodes.find(n=>n.id==="c").parents,["b"]);
});
test("cycles are repaired and flagged high severity for human inspection",()=>{
 const a=candidate("a","A"),b=candidate("b","B");
 const g=C.synthesizeGraph([a,b],[{from:"a",to:"b"},{from:"b",to:"a"}]);
 assert.ok(g.issues.some(x=>x.code==="cycle_repaired"&&x.severity==="high"));
});
test("audit does not claim ready when material has missing citations or passages",()=>{
 const p=C.packet();
 p.sources=[{source_id:"S001"}];p.passages=[{chunk_id:"S001-P00001",source_id:"S001"},{chunk_id:"S001-P00002",source_id:"S001"}];
 const g=C.synthesizeGraph([candidate("a","A")]);
 const course=C.buildCourse(g,{title:"A"});
 const report=C.audit(p,g,course);
 assert.equal(report.coverage_percent,50);
 assert.equal(report.ready_for_publication,false);
 assert.ok(report.issues.some(x=>x.code==="uncovered_passage"));
});
test("large conceptual graphs have a stable single mastery endpoint",()=>{
 const list=Array.from({length:250},(_,i)=>candidate("c"+i,"Concept "+i));
 const edges=Array.from({length:249},(_,i)=>({from:"c"+i,to:"c"+(i+1)}));
 const g=C.synthesizeGraph(list,edges,"Long Course");
 assert.equal(g.nodes.length,251);
 assert.equal(g.nodes.at(-1).parents.length,1);
 assert.equal(g.nodes.at(-1).parents[0],"c249");
});
