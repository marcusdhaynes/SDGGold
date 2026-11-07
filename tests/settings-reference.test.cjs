"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {DOCUMENTS,buildBundle}=require("../settings-reference.js");
const root=path.resolve(__dirname,"..");
const contents=DOCUMENTS.map(doc=>({file:doc.file,text:fs.readFileSync(path.join(root,doc.file),"utf8")}));
test("settings exposes the external template and every complete canonical example",()=>{
  assert.deepEqual(DOCUMENTS.map(doc=>doc.file),[
    "CHATGPT_COURSE_TEMPLATE.md","EXAMPLE_COMPLETE_COURSE.json",
    "EXAMPLE_BATCH_B001.jsonl","EXAMPLE_BATCH_B002.jsonl","EXAMPLE_BATCH_B003.jsonl",
    "COURSE_PACKAGE_SCHEMA.json"
  ]);
  assert.equal(new Set(DOCUMENTS.map(doc=>doc.file)).size,DOCUMENTS.length);
  for(const doc of DOCUMENTS){
    assert.ok(contents.find(entry=>entry.file===doc.file)?.text.length>100,
      "missing reference content: "+doc.file);
  }
});
test("single-copy bundle contains entire unmodified file contents in the intended order",()=>{
  const bundle=buildBundle(contents);
  let previousEnd=-1;
  for(const entry of contents){
    const start="===== BEGIN FILE: "+entry.file+" =====\n",end="===== END FILE: "+entry.file+" =====";
    const i=bundle.indexOf(start),j=bundle.indexOf(end);
    assert.ok(i>previousEnd,"files must be ordered with no missing items");
    assert.ok(j>i+start.length);
    const reconstructed=bundle.slice(i+start.length,j);
    assert.equal(reconstructed,entry.text.endsWith("\n")?entry.text:entry.text+"\n",
      "copy bundle must preserve every byte of "+entry.file+" except a required final delimiter newline");
    previousEnd=j+end.length;
  }
  assert.equal((bundle.match(/===== BEGIN FILE:/g)||[]).length,DOCUMENTS.length);
  assert.equal((bundle.match(/===== END FILE:/g)||[]).length,DOCUMENTS.length);
});
test("copy-all fails closed when any document is absent, swapped, duplicated or empty",()=>{
  assert.throws(()=>buildBundle(contents.slice(1)),/All reference documents/);
  assert.throws(()=>buildBundle(contents.map((x,i)=>i===3?{file:x.file,text:""}:x)),/empty/);
  assert.throws(()=>buildBundle([contents[1],contents[0],...contents.slice(2)]),/out of order/);
  assert.throws(()=>buildBundle(contents.map((x,i)=>i===2?contents[1]:x)),/out of order/);
});
test("the public settings entry points and reader controls are all connected",()=>{
  const page=fs.readFileSync(path.join(root,"index.html"),"utf8");
  const panel=fs.readFileSync(path.join(root,"settings-panel.html"),"utf8");
  const ui=fs.readFileSync(path.join(root,"settings-ui.js"),"utf8");
  const app=fs.readFileSync(path.join(root,"app.js"),"utf8");
  assert.match(page,/id="settingsButton"/);
  assert.match(page,/settings-reference\.js/);assert.match(page,/settings-ui\.js/);assert.match(page,/settings\.css/);
  assert.match(app,/settingsButton.*SDGReferenceSettings/);
  for(const id of ["ref-copy-all","ref-download-all","ref-reader-content","ref-reader-copy","ref-reader-download","ref-list","ref-close","ref-status"])assert.ok(panel.includes('id="'+id+'"'),"missing "+id);
  for(const action of ["loadAll","copyAll","copyOne","downloadOne","openFile"])assert.ok(ui.includes("function "+action+"("),"missing function "+action);
  assert.match(ui,/\.textContent=value/);
});
test("offline cache includes every referenced document and the settings reader",()=>{
  const sw=fs.readFileSync(path.join(root,"sw.js"),"utf8");
  for(const doc of DOCUMENTS)assert.ok(sw.includes('"./'+doc.file+'"'),"not cached: "+doc.file);
  for(const pathName of ["settings.css","settings-ui.js","settings-reference.js","settings-panel.html"])assert.ok(sw.includes('"./'+pathName+'"'));
});
