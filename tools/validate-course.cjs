#!/usr/bin/env node
"use strict";
// Deterministic SDGGold course-package validator. No AI, no network, no dependencies.
const fs=require("node:fs"),path=require("node:path");
const V=require("../course-package.js");
const argv=process.argv.slice(2).filter(x=>!x.startsWith("--"));
if(!argv.length){
 console.error("Usage: node tools/validate-course.cjs COURSE.json");
 console.error("   or: node tools/validate-course.cjs COURSE_B001.jsonl COURSE_B002.jsonl ...");
 process.exit(2);
}
try{
 const files=argv.map(filename=>({name:path.basename(filename),content:fs.readFileSync(filename,"utf8")}));
 const pack=V.assembleParts(files);
 const r=V.audit(pack);
 const metrics=r.metrics;
 console.log("SDGGold v2 course: "+(pack.course?.title||"untitled"));
 console.log("Schema: "+pack.schema+" | nodes: "+metrics.nodes+" | tracks: "+metrics.tracks);
 console.log("Roots: "+metrics.roots+" | splits: "+metrics.splits+" | merges: "+metrics.merges+" | edges: "+metrics.edges);
 console.log("Mastery: "+pack.course?.mastery_node_id+" | source refs: "+metrics.source_refs);
 console.log("Coverage declared: "+pack.coverage?.status+" | structural errors: "+r.errors.length+" | review warnings: "+r.warnings.length);
 for(const x of r.errors)console.error("ERROR ["+x.code+"] "+x.message);
 for(const x of r.warnings.slice(0,25))console.warn("REVIEW ["+x.code+"] "+x.message);
 if(r.warnings.length>25)console.warn("... "+(r.warnings.length-25)+" additional warnings.");
 if(process.argv.includes("--json-report"))fs.writeFileSync("SDGGold-validation-report.json",JSON.stringify({ok:r.ok,errors:r.errors,warnings:r.warnings,metrics:r.metrics},null,2));
 console.log(r.ok?"VALID: structurally importable. Factual/source review remains required.":"INVALID: correct all errors before importing.");
 process.exit(r.ok?0:1);
}catch(e){console.error("INVALID PACKAGE: "+e.message);process.exit(1)}
