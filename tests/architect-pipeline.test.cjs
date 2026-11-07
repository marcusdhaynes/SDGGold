"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),C=require("../architect-core.js");
global.crypto=global.crypto||require("node:crypto").webcrypto;
const saved=new Map();
const passages=[{job_id:"J",chunk_id:"S-P0001",source_id:"S",locator:"p.1",text:"Observation means carefully noticing something. Questions ask why things happen. Evidence supports an answer. A student compares observations and tests an explanation."}];
const fakeStore={
 put:async(type,data)=>{saved.set(data.id,JSON.parse(JSON.stringify(data)));return data.id},
 listPassages:async()=>passages,
 listAssets:async()=>[]
};
global.window={SDGArchitectCore:C,SDGArchitectStore:fakeStore};
require("../architect-pipeline.js");
const P=global.window.SDGArchitectPipeline;
const quiz={question:"Which option is accurate?",choices:["Accurate definition","False definition","Unsupported claim"],correct:0,explanation:"The first statement is supported by source material."};
const mock={
 invoke:async(mode,payload)=>{
  if(mode==="extract")return {model:"test-model",result:{concepts:[{
   title:"Observation",definition:"Carefully noticing what is there",student_explanation:"Observe by looking or listening carefully.",
   everyday_example:"Notice rain on a window.",source_chunks:["S-P0001"],prerequisite_hints:[],
   importance:5,kind:"concept",confidence:"high",uncertainty:"none"
  }],gaps:[]}};
  if(mode==="plan")return {model:"test-model",result:{edges:[],aliases:[],missing_foundations:[],issues:[]}};
  if(mode==="author")return {model:"test-model",result:{lessons:payload.concepts.map(c=>({id:c.id,learn:c.definition,example:c.example||"Example",reinforce:{question:"Explain it",answer:c.definition},practice:quiz,test:quiz,review:quiz,uncertainty:"none"})),issues:[]}};
  throw Error("Unexpected mode: "+mode);
 }
};
test("authenticated AI pipeline completes a realistic multi-stage mini-course with mock responses",async()=>{
 const job=P.createJob("Thinking"),ref=job.id;job.packet.sources=[{record_type:"source",source_id:"S",title:"Notes"}];
 const result=await P.aiRun(job,mock);
 assert.equal(result.phase,"ready");assert.equal(result.course.nodes.length,2);
 assert.equal(result.report.coverage_percent,100);
 assert.ok(result.course.nodes.every(n=>n.test&&n.review&&n.learn));
 assert.equal(result.graph.nodes.at(-1).parents.length,1);
 assert.ok(result.api_calls>=3);
 assert.equal(saved.get(ref).phase,"ready");
});
test("failed AI task does not clear previous checkpoint; retry resumes",async()=>{
 const job=P.createJob("Retry Course");job.packet.sources=[{record_type:"source",source_id:"S",title:"Notes"}];
 let once=true;
 const failing={invoke:async(mode,payload)=>{
  if(mode==="plan"&&once){once=false;throw Error("Temporary rate limit")}
  return mock.invoke(mode,payload);
 }};
 await assert.rejects(P.aiRun(job,failing),/Temporary rate limit/);
 assert.equal(job.phase,"plan");assert.equal(job.extractIndex,1);
 const result=await P.aiRun(job,failing);
 assert.equal(result.phase,"ready");assert.equal(result.extractIndex,1);
});
