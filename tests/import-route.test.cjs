"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const app=fs.readFileSync(path.join(root,"app.js"),"utf8");
const studio=fs.readFileSync(path.join(root,"course-studio.js"),"utf8");
const packageValidator=require("../course-package.js");
const example=require("../EXAMPLE_COMPLETE_COURSE.json");

test("Tree Options import opens canonical v2 Import Studio, never the legacy raw JSON validator",()=>{
  const start=app.indexOf("function importCourse(){"),end=app.indexOf("function options(){",start);
  assert.ok(start>=0&&end>start,"Import Course function missing");
  const section=app.slice(start,end);
  assert.match(section,/closeModal\(\)/);
  assert.match(section,/nav\("studio"\)/);
  assert.doesNotMatch(section,/validate\(JSON\.parse/);
  assert.match(app,/btn\("Import \/ Update Course",importCourse\)/);
});
test("fully-authored modern v2 course is valid with its title nested under course, not root",()=>{
  assert.equal(example.title,undefined);
  assert.equal(typeof example.course.title,"string");
  assert.equal(packageValidator.audit(example).ok,true);
  assert.match(app,/title:candidate\.title\|\|candidate\.course\?\.title/);
  assert.match(app,/window\.SDGGoldAcceptCourse=async function/);
});
test("Import Studio uses the same package validation and permits private drafts with warning-only incomplete coverage",()=>{
  assert.match(studio,/const p=V\.parse\(raw,name\)/);
  assert.match(studio,/V\.audit\(assembled\)/);
  assert.match(studio,/course=r\.ok\?assembled:null/);
  const draft=JSON.parse(JSON.stringify(example));
  draft.coverage.status="partial";
  draft.quality.self_checked=false;
  draft.quality.checklist[0].passed=false;
  const r=packageValidator.audit(draft);
  assert.equal(r.ok,true,"private draft with warnings is structurally valid");
  assert.ok(r.warnings.some(item=>item.code==="partial_course"));
  assert.ok(r.warnings.some(item=>item.code==="not_self_checked"));
});
test("a complete modern package replaces stale pending imports with explicit confirmation",()=>{
  assert.match(studio,/if\(p\.mode==="package"\)/);
  assert.match(studio,/parts=\[\{name,parsed:p\}\]/);
  assert.match(studio,/Clear Pending Inputs/);
});
