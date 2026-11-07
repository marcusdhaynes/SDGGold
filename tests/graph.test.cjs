"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("app.js","utf8");
const stop=source.indexOf('\n$("closePanel").addEventListener');
assert.ok(stop>0,"app source has a non-executing core section");
const core=source.slice(0,stop);
const api=vm.runInNewContext(core+"\n({validate,SAMPLE,unlocked,level,state,setProgress(p){progress=p}})",{console,localStorage:{getItem(){return null}}});
const copy=x=>JSON.parse(JSON.stringify(x));
test("reference course is a complete converging prerequisite graph",()=>{
 const course=copy(api.SAMPLE);
 assert.equal(api.validate(course).nodes.length,12);
 const childIds=new Set(course.nodes.flatMap(n=>n.prerequisites));
 const ends=course.nodes.filter(n=>!childIds.has(n.id));
 assert.deepEqual(ends.map(n=>n.id),["mastery"]);
});
test("locked nodes cannot unlock without every immediate prerequisite",()=>{
 api.setProgress({observation:5,questions:5,comparison:5,evidence:5,logic:0});
 assert.equal(api.unlocked(api.SAMPLE.nodes.find(n=>n.id==="argument")),false);
 assert.equal(api.unlocked(api.SAMPLE.nodes.find(n=>n.id==="evidence")),true);
});
test("all branches must converge before the final mastery node unlocks",()=>{
 const complete=Object.fromEntries(api.SAMPLE.nodes.map(n=>[n.id,5]));
 api.setProgress({...complete,application:0});
 assert.equal(api.unlocked(api.SAMPLE.nodes.find(n=>n.id==="mastery")),false);
 api.setProgress(complete);
 assert.equal(api.unlocked(api.SAMPLE.nodes.find(n=>n.id==="mastery")),true);
});
test("missing prerequisite is rejected",()=>{
 const c=copy(api.SAMPLE);c.nodes[1].prerequisites=["does-not-exist"];
 assert.throws(()=>api.validate(c),/Missing prerequisite/);
});
test("same-tier, backward, or cyclic dependencies are rejected",()=>{
 const c=copy(api.SAMPLE);c.nodes[0].prerequisites=["mastery"];
 assert.throws(()=>api.validate(c),/earlier stages/);
});
test("disconnected or orphan learning paths cannot be imported",()=>{
 const c=copy(api.SAMPLE);c.nodes.push({...c.nodes[0],id:"orphan",title:"Orphan"});
 assert.throws(()=>api.validate(c),/converge/);
});
test("duplicate concept IDs are rejected",()=>{
 const c=copy(api.SAMPLE);c.nodes.push(copy(c.nodes[0]));
 assert.throws(()=>api.validate(c),/duplicate/);
});
test("quiz indexes and required five-step learning content are validated",()=>{
 const c=copy(api.SAMPLE);c.nodes[0].test.correct=999;
 assert.throws(()=>api.validate(c),/Invalid or duplicate concept/);
});
