"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const kit=require("../studio-copy-kit.js"),validator=require("../course-package.js");
const template=fs.readFileSync(path.join(root,"CHATGPT_COURSE_TEMPLATE.md"),"utf8");
const exampleText=fs.readFileSync(path.join(root,"EXAMPLE_COMPLETE_COURSE.json"),"utf8");
const example=JSON.parse(exampleText),report=validator.audit(example);
test("Copy All creates one complete plain-text bundle containing the three actual button resources",()=>{
 const result=kit.create(template,exampleText,report);
 assert.equal(result.passed,true);
 assert.equal((result.text.match(/===== BEGIN [123] OF 3/g)||[]).length,3);
 assert.equal((result.text.match(/===== END [123] OF 3/g)||[]).length,3);
 assert.ok(result.text.includes(template),"master prompt is included verbatim");
 assert.ok(result.text.includes(exampleText),"canonical example JSON is included verbatim");
 assert.ok(result.text.includes("Validation: PASS"),"third part includes deterministic validation result");
 assert.ok(result.text.includes("Concepts: "+example.nodes.length));
 assert.ok(result.text.includes("Tracks: "+example.tracks.length));
 assert.ok(result.text.includes("Review warnings: "+report.warnings.length));
 assert.ok(result.text.indexOf("MASTER CHATGPT TEMPLATE")<result.text.indexOf("COMPLETE COURSE EXAMPLE"));
 assert.ok(result.text.indexOf("COMPLETE COURSE EXAMPLE")<result.text.indexOf("VALIDATE EXAMPLE"));
});
test("a malformed example, missing template or missing audit cannot claim successful Copy All",()=>{
 assert.throws(()=>kit.create("",exampleText,report),/template is missing/);
 assert.throws(()=>kit.create(template,"",report),/example is missing/);
 assert.throws(()=>kit.create(template,"{\"broken\":true}",report),/does not follow/);
 assert.throws(()=>kit.create(template,exampleText,null),/report is missing/);
 assert.throws(()=>kit.create(template,"{",report),/JSON/);
});
test("the four Import Studio buttons remain together, in order, with a clipboard status announcement",()=>{
 const html=fs.readFileSync(path.join(root,"architect-panel.html"),"utf8");
 const row=html.match(/<div class="architect-actions studio-instruction-actions">([\s\S]*?)<\/div>/);
 assert.ok(row,"instruction row missing");
 for(const id of ["studio-template","studio-example","studio-example-preview","studio-copy-all"])assert.ok(row[1].includes('id="'+id+'"'),id);
 const indexes=["studio-template","studio-example","studio-example-preview","studio-copy-all"].map(id=>row[1].indexOf('id="'+id+'"'));
 assert.deepEqual(indexes,[...indexes].sort((a,b)=>a-b));
 assert.match(html,/id="studio-copy-feedback"[^>]*role="status"/);
});
test("clipboard uses a single click after preload, not awaiting a fetch when clicked",()=>{
 const studio=fs.readFileSync(path.join(root,"course-studio.js"),"utf8");
 assert.match(studio,/void prepareReferenceKit\(\)\.catch/);
 assert.match(studio,/\$\("studio-copy-all"\)\.onclick=copyAllInstructions/);
 const functionBody=studio.slice(studio.indexOf("function copyAllInstructions(){"),studio.indexOf("async function importedText"));
 assert.match(functionBody,/navigator\.clipboard\.writeText\(referenceKitText\)/);
 assert.doesNotMatch(functionBody,/await |fetch\(/);
 assert.match(studio,/SDGStudioCopyKit\.create\(originals\[0\],originals\[1\],audit\)/);
});
test("four controls fit in one row on wider screens and gracefully wrap on narrow panels",()=>{
 const css=fs.readFileSync(path.join(root,"architect.css"),"utf8");
 assert.match(css,/\.studio-instruction-actions\{\s*display:grid;/);
 assert.match(css,/grid-template-columns:minmax\(0,1\.6fr\).*minmax\(90px,\.65fr\)/);
 assert.match(css,/@container \(max-width:670px\)/);
 assert.match(css,/@container \(max-width:330px\)/);
});
