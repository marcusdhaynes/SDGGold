"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const Layout=require("../graph-layout.js"),root=path.resolve(__dirname,"..");
function fixture(){
 const tracks=[["individual","People and Motivation"],["teams","Groups and Teams"],["culture","Culture and Change"],["leadership","Leadership and Influence"],["evaluation","Performance and Feedback"]].map(([id,title])=>({id,title}));
 const nodes=[{id:"root",title:"Shared Foundation",tier:0,lane:1,track_ids:tracks.map(t=>t.id),prerequisites:[]},{id:"shared",title:"Shared Method",tier:1,lane:1,track_ids:tracks.map(t=>t.id),prerequisites:["root"]}];
 const counts={individual:[8,14,4,0],teams:[1,8,7,1],culture:[1,6,1,0],leadership:[1,6,2,1],evaluation:[1,2,2,0]};
 for(const track of tracks){const at={};for(let t=1;t<=4;t++){at[t]=[];for(let i=0;i<counts[track.id][t-1];i++){
  const id=track.id+"-"+t+"-"+i,previous=at[t-1]||[];
  nodes.push({id,title:id,tier:t,lane:i%8+1,track_ids:[track.id],prerequisites:t===1?["root"]:previous.length?[previous[i%previous.length]]:["root"]});
  at[t].push(id);
 }}}
 const quota={individual:15,teams:11,culture:6,leadership:7,evaluation:3};
 const parents=tracks.flatMap(t=>nodes.filter(n=>n.track_ids.length===1&&n.track_ids[0]===t.id).slice(0,quota[t.id]).map(n=>n.id));
 nodes.push({id:"mastery",title:"Final Mastery",kind:"milestone",tier:5,lane:1,track_ids:tracks.map(t=>t.id),prerequisites:parents});
 return {course:{mastery_node_id:"mastery"},tracks,nodes};
}
test("69 concept cards across 5 distinct tracks never overlap despite duplicate supplied lanes",()=>{
 const c=fixture(),l=Layout.layout(c);
 assert.equal(c.nodes.length,69);assert.equal(l.pos.size,69);assert.deepEqual(Layout.overlaps(l),[]);
 assert.deepEqual(l.bands.filter(b=>!b.shared).map(b=>b.count),[26,17,8,10,5]);
});
test("42 mastery prerequisite edges are shown through five track collectors without rewriting prerequisites",()=>{
 const c=fixture(),before=JSON.stringify(c.nodes),l=Layout.layout(c);
 assert.equal(l.collectors.length,5);
 assert.equal(l.collectors.reduce((sum,g)=>sum+g.required.length,0),42);
 assert.equal(JSON.stringify(c.nodes),before);
 assert.equal(c.nodes.at(-1).prerequisites.length,42);
});
test("a 74-node version with five real track syntheses remains collision-free",()=>{
 const c=fixture(),final=c.nodes.pop(),old=final.prerequisites;
 const synth=c.tracks.map(t=>({id:t.id+"-synthesis",title:t.title+" synthesis",tier:5,kind:"milestone",track_ids:[t.id],prerequisites:old.filter(id=>id.startsWith(t.id+"-"))}));
 final.tier=6;final.prerequisites=synth.map(n=>n.id);c.nodes.push(...synth,final);
 const l=Layout.layout(c);
 assert.equal(c.nodes.length,74);assert.equal(l.pos.size,74);assert.deepEqual(Layout.overlaps(l),[]);
 assert.ok(l.collectors.every(x=>x.required.length===1));
});
test("all prerequisites strictly move right without skipping mandatory mastery enforcement",()=>{
 const c=fixture(),l=Layout.layout(c);
 for(const n of c.nodes)for(const id of n.prerequisites){
  assert.ok(l.pos.get(id).x+Layout.NODE_W<l.pos.get(n.id).x,id+" → "+n.id);
 }
});
test("import drop is a genuine full-width flex block, with an explicit file-picker control",()=>{
 const css=fs.readFileSync(root+"/architect.css","utf8"),html=fs.readFileSync(root+"/architect-panel.html","utf8");
 assert.match(css,/\.architect-card \.architect-drop\{\s*display:flex;/);
 assert.match(html,/id="studio-drop"/);assert.match(html,/architect-upload-cta">Choose Course Files/);
});
test("the external template explicitly warns against a giant flat mastery spiderweb",()=>{
 const s=fs.readFileSync(root+"/CHATGPT_COURSE_TEMPLATE.md","utf8");
 for(const k of ["course.title","root-level","track synthesis milestone","prerequisite_rationales","more than eight direct prerequisites","course_end"])assert.ok(s.includes(k),k);
});
test("runtime renders complete model positions with a jump control and tracked wires",()=>{
 const app=fs.readFileSync(root+"/app.js","utf8"),html=fs.readFileSync(root+"/index.html","utf8"),sw=fs.readFileSync(root+"/sw.js","utf8");
 assert.match(app,/SDGGraphLayout\.layout\(course\)/);assert.match(app,/treeGuide\(layout\)/);
 assert.match(app,/mastery-link/);assert.match(html,/graph-layout\.js/);
 assert.match(html,/graph-tracks\.css/);assert.match(sw,/graph-layout\.js/);
});
