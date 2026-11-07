/* SDGGold Import Studio: exact plain-text reference bundle. No AI, no network. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.SDGStudioCopyKit=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 function create(templateText,exampleText,report){
  if(typeof templateText!=="string"||!templateText.trim())throw Error("Master ChatGPT template is missing.");
  if(typeof exampleText!=="string"||!exampleText.trim())throw Error("Complete course example is missing.");
  if(!report||typeof report.ok!=="boolean"||!Array.isArray(report.errors)||!Array.isArray(report.warnings))
   throw Error("The example validation report is missing or malformed.");
  const example=JSON.parse(exampleText);
  if(example?.schema!=="sdggold-course-v2"||!Array.isArray(example.nodes)||!example.course?.title)
   throw Error("The complete example does not follow the SDGGold course format.");
  const metrics=report.metrics||{};
  const notes=[
   "SDGGold EXTERNAL CHATGPT COURSE PREPARATION — COMPLETE PLAIN TEXT",
   "This is a full, unabridged copy of the three resources represented by the",
   "Import Studio buttons: Master ChatGPT Template; Complete Course Example;",
   "and the deterministic validation results for that example.",
   "The validation is structural, not proof of source accuracy or educational quality.",
   "",
   "===== BEGIN 1 OF 3: MASTER CHATGPT TEMPLATE (CHATGPT_COURSE_TEMPLATE.md) =====",
   templateText,
   "===== END 1 OF 3: MASTER CHATGPT TEMPLATE =====",
   "",
   "===== BEGIN 2 OF 3: COMPLETE COURSE EXAMPLE (EXAMPLE_COMPLETE_COURSE.json) =====",
   exampleText,
   "===== END 2 OF 3: COMPLETE COURSE EXAMPLE =====",
   "",
   "===== BEGIN 3 OF 3: VALIDATE EXAMPLE (DETERMINISTIC REPORT) =====",
   "Course: "+example.course.title,
   "Schema: "+example.schema,
   "Validation: "+(report.ok?"PASS — structurally importable":"FAIL — not structurally importable"),
   "Concepts: "+(metrics.nodes??example.nodes.length),
   "Tracks: "+(metrics.tracks??example.tracks?.length??0),
   "Starting concepts: "+(metrics.roots??"not available"),
   "Prerequisite connections: "+(metrics.edges??"not available"),
   "Branching concepts: "+(metrics.splits??"not available"),
   "Merge concepts: "+(metrics.merges??"not available"),
   "Final mastery: "+example.course.mastery_node_id,
   "Structural errors: "+report.errors.length,
   ...report.errors.map(x=>"ERROR ["+x.code+"] "+x.message),
   "Review warnings: "+report.warnings.length,
   ...report.warnings.map(x=>"REVIEW ["+x.code+"] "+x.message),
   "IMPORTANT: Actual source fidelity and sound prerequisites require external review.",
   "===== END 3 OF 3: VALIDATE EXAMPLE ====="
  ];
  return {text:notes.join("\n")+"\n",passed:report.ok};
 }
 return {create};
});
